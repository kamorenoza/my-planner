import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { logger } from 'firebase-functions'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

initializeApp()
const db = getFirestore()

// Shared secret so only you can read your planner from the widget.
const WIDGET_KEY = defineSecret('WIDGET_KEY')

// How often the scheduler runs (minutes). Must match the schedule below.
const RUN_INTERVAL_MIN = 15

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Local date/time parts for a given IANA timezone.
function localParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  )
  const hour = parts.hour === '24' ? 0 : Number(parts.hour)
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    minute: Number(parts.minute),
    minutes: hour * 60 + Number(parts.minute),
  }
}

function formatTime(min) {
  const hour = Math.floor(min / 60)
  const minutes = min % 60
  const period = hour < 12 ? 'am' : 'pm'
  const h = hour % 12 === 0 ? 12 : hour % 12
  return `${h}:${String(minutes).padStart(2, '0')} ${period}`
}

function parseList(planner, key) {
  try {
    return JSON.parse(planner?.[key] || '[]')
  } catch {
    return []
  }
}

// Horas (en minutos del día) de cada frecuencia predefinida. Debe coincidir con
// src/utils/medications.js (FREQUENCIES) para que las notificaciones reflejen
// los mismos horarios que muestra la app.
const FREQ_HOURS = {
  every_4h: 4,
  every_6h: 6,
  every_8h: 8,
  every_12h: 12,
  every_24h: 24,
  twice: 12,
  three: 8,
  weekly: 24,
}

function medTimeToMin(time) {
  if (!time) return 0
  const [h, m] = String(time).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

// Devuelve los minutos del día de cada dosis de un medicamento. Réplica de
// computeDoseTimes() del cliente, devolviendo minutos en lugar de "HH:MM".
function medDoseMinutes(med) {
  if (!med) return []
  const start = medTimeToMin(med.startTime || '08:00')

  if (med.frequency === 'custom') {
    const rule = med.repeat || {}
    if (rule.mode === 'times' && Array.isArray(rule.times)) {
      return rule.times.filter(Boolean).map(medTimeToMin).sort((a, b) => a - b)
    }
    if (rule.mode === 'interval') {
      const interval = Number(rule.interval) || 1
      const unit = rule.intervalUnit || 'hours'
      if (unit === 'days') return [start]
      const step = unit === 'minutes' ? interval : interval * 60
      if (step <= 0) return [start]
      const out = []
      for (let min = start; min < 1440; min += step) out.push(min)
      return out.length ? out : [start]
    }
    return [start]
  }

  if (med.frequency === 'weekly') return [start]
  const hours = FREQ_HOURS[med.frequency] || 24
  const step = hours * 60
  const out = []
  for (let min = start; min < 1440; min += step) out.push(min)
  return out.length ? out : [start]
}

function isHoliday(reminder) {
  return reminder && reminder.holiday === true
}

// Build the 8:00 daily summary as a SINGLE notification (events, reminders and
// tasks combined). iOS descarta notificaciones web push enviadas en ráfaga, así
// que NUNCA mandamos varias seguidas: todo va en un solo mensaje.
// Returns { title, body } or null when there is nothing to show.
function buildDailySummary(planner, dateKey) {
  const events = parseList(planner, `events-${dateKey}`).sort(
    (a, b) => a.start - b.start,
  )
  const reminders = parseList(planner, `reminders-${dateKey}`).filter(
    (r) => !isHoliday(r),
  )
  const todos = parseList(planner, `todos-${dateKey}`).filter((t) => !t.done)

  const sections = []

  if (reminders.length) {
    sections.push(`Recordatorios:\n${reminders.map((r) => `• ${r.text}`).join('\n')}`)
  }

  if (todos.length) {
    sections.push(`Tareas:\n${todos.map((t) => `• ${t.text}`).join('\n')}`)
  }

  if (events.length) {
    sections.push(
      `Eventos:\n${events
        .map((e) => `• ${e.title} ${formatTime(e.start)}`)
        .join('\n')}`,
    )
  }

  if (sections.length === 0) return null
  return { title: 'Resumen de hoy', body: sections.join('\n\n') }
}

// Send a data-only message to every token of a user, pruning invalid ones.
// Data-only (no `notification` field) avoids the duplicate where iOS auto-shows
// the notification AND the service worker shows it again in onBackgroundMessage.
async function sendToUser(uid, tokensMap, message) {
  const tokens = Object.keys(tokensMap || {})
  if (tokens.length === 0) return

  const res = await getMessaging().sendEachForMulticast({
    tokens,
    // iOS Web Push EXIGE una `notification` visible; los mensajes data-only
    // (silenciosos) no se muestran de forma fiable y Apple puede revocar la
    // suscripción. Mandamos la notificación + data como respaldo. El service
    // worker NO vuelve a mostrarla cuando ya hay `notification` (evita duplicar).
    data: {
      title: String(message.title || ''),
      body: String(message.body || ''),
    },
    webpush: {
      notification: {
        title: String(message.title || 'My Planner'),
        body: String(message.body || ''),
        icon: '/my-planner/pwa-192x192.png',
        badge: '/my-planner/pwa-64x64.png',
      },
      fcmOptions: { link: '/my-planner/' },
    },
  })

  // Remove tokens that are no longer valid.
  const invalid = {}
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code || ''
      if (
        code.includes('registration-token-not-registered') ||
        code.includes('invalid-argument') ||
        code.includes('invalid-registration-token')
      ) {
        invalid[`notif.tokens.${tokens[i]}`] = FieldValue.delete()
      }
    }
  })
  if (Object.keys(invalid).length) {
    // `update()` para que las claves punteadas se traten como rutas anidadas y
    // el FieldValue.delete() borre realmente notif.tokens.<token>.
    await db.doc(`users/${uid}`).update(invalid).catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// Scheduled function
// ---------------------------------------------------------------------------

export const sendPlannerNotifications = onSchedule(
  {
    schedule: `every ${RUN_INTERVAL_MIN} minutes`,
    timeZone: 'Etc/UTC',
    region: 'us-central1',
    retryCount: 0,
    // Mantener el costo bajo: instancia mínima de recursos, escala a cero
    // cuando no corre y nunca más de 1 instancia a la vez.
    memory: '256MiB',
    minInstances: 0,
    maxInstances: 1,
  },
  async () => {
    const now = new Date()
    const snap = await db.collection('users').get()

    const jobs = []
    snap.forEach((docSnap) => {
      const data = docSnap.data() || {}
      const notif = data.notif
      if (!notif || notif.enabled === false) return
      const tokens = notif.tokens || {}
      if (Object.keys(tokens).length === 0) return

      const timezone = data.timezone || 'America/Bogota'
      const dailyHour = Number.isInteger(notif.dailyHour) ? notif.dailyHour : 8
      const leadMin = Number.isInteger(notif.eventLeadMinutes)
        ? notif.eventLeadMinutes
        : 60

      const { dateKey, hour, minutes } = localParts(now, timezone)
      const planner = data.planner || {}
      const sent = notif.sent || {}
      const newSent = {}
      // Keep only today's markers to avoid unbounded growth.
      Object.keys(sent).forEach((k) => {
        if (k.includes(dateKey)) newSent[k] = sent[k]
      })

      const updates = {}
      const messages = []

      // 8:00 daily summary — send on the first run at/after the configured
      // hour (within that hour) if not already sent today.
      const dailyKey = `daily-${dateKey}`
      if (hour === dailyHour && !newSent[dailyKey]) {
        const daily = buildDailySummary(planner, dateKey)
        if (daily) messages.push(daily)
        // Mark as sent even if there was nothing, so we don't keep checking
        // all hour long.
        newSent[dailyKey] = true
      }

      // Event reminders — send on the first run where the event starts within
      // `leadMin` minutes (and hasn't started yet), once per event.
      const events = parseList(planner, `events-${dateKey}`)
      events.forEach((ev) => {
        const until = ev.start - minutes
        if (until <= leadMin && until > 0) {
          const evKey = `evt-${dateKey}-${ev.id}`
          if (!newSent[evKey]) {
            messages.push({
              title: ev.title,
              body: `Empieza a las ${formatTime(ev.start)}`,
            })
            newSent[evKey] = true
          }
        }
      })

      // Medication dose reminders — for each active plan (startDate ≤ hoy ≤
      // endDate) y cada medicamento no pausado, avisa cuando una dosis cae
      // dentro de la ventana de esta corrida. Una notificación por dosis.
      const medPlans = parseList(planner, 'med-plans')
      medPlans.forEach((plan) => {
        if (!plan || !plan.startDate || !plan.endDate) return
        if (dateKey < plan.startDate || dateKey > plan.endDate) return
        ;(plan.medications || []).forEach((med) => {
          if (!med || med.status === 'paused') return
          medDoseMinutes(med).forEach((doseMin) => {
            // Dentro de la ventana [minutes, minutes + intervalo).
            if (doseMin >= minutes && doseMin < minutes + RUN_INTERVAL_MIN) {
              const doseKey = `dose-${dateKey}-${med.id}-${doseMin}`
              if (!newSent[doseKey]) {
                messages.push({
                  title: `Medicación: ${med.name}`,
                  body: `${med.dose} ${med.unit} a las ${formatTime(doseMin)}`,
                })
                newSent[doseKey] = true
              }
            }
          })
        })
      })

      if (messages.length === 0) return

      updates['notif.sent'] = newSent
      jobs.push(
        (async () => {
          // iOS descarta notificaciones enviadas en ráfaga, así que combinamos
          // todo lo de esta corrida en UNA sola notificación.
          const message =
            messages.length === 1
              ? messages[0]
              : {
                  title: 'My Planner',
                  body: messages
                    .map((m) => `${m.title}\n${m.body}`)
                    .join('\n\n'),
                }
          await sendToUser(docSnap.id, tokens, message)
          // `update()` (no `set`) interpreta 'notif.sent' como ruta anidada y
          // REEMPLAZA el mapa. Con `set({'notif.sent':...}, {merge:true})` se
          // creaba un campo literal llamado "notif.sent" que nunca se leía de
          // vuelta (la lectura es data.notif.sent), provocando reenvíos.
          await db
            .doc(`users/${docSnap.id}`)
            .update(updates)
            .catch(() => {})
        })(),
      )
    })

    await Promise.all(jobs)
    logger.info(`Notification run complete: ${jobs.length} user(s) notified.`)
  },
)

// ---------------------------------------------------------------------------
// HTTP endpoint for the home-screen widget (Scriptable, etc.)
// ---------------------------------------------------------------------------

// Resolved tag colors (text color, readable on a white background) so the
// widget can paint each event without knowing the app's CSS variables.
const EVENT_COLORS = {
  personal: 'A84672_1',
  trabajo: '3F7D62_1',
  citas: '6A4BA0_1',
  otros: 'B5773A_1',
}

// Colores de plan de medicación resueltos a hex (sin '#'), espejo de
// PLAN_COLORS en src/utils/medications.js, para que el widget pinte el tag del
// plan sin conocer las variables CSS del tema.
const PLAN_COLOR_HEX = {
  purple: '8d76b0',
  pink: 'c25690',
  green: '4caf93',
  orange: 'f0a05e',
  blue: '7e9fd4',
  red: 'e57373',
}

// ¿El plan está activo (en curso) ese día? Espejo de planStatus() del cliente:
// activo cuando hoy está dentro de [startDate, endDate] (fechas ausentes no
// restringen).
function isPlanActiveOn(plan, dateKey) {
  if (!plan) return false
  if (plan.startDate && dateKey < plan.startDate) return false
  if (plan.endDate && dateKey > plan.endDate) return false
  return true
}

// Returns today's events, reminders and pending todos for a user as JSON.
// Auth is a simple uid + shared-secret check, enough for a personal widget.
export const todayPlanner = onRequest(
  {
    region: 'us-central1',
    secrets: [WIDGET_KEY],
    cors: true,
    // Costo bajo: recursos mínimos, escala a cero y tope de 1 instancia para
    // que un exceso de llamadas (o bots) no dispare la factura. El CPU se fija
    // al mínimo para abaratar cada arranque en frío. Con CPU < 1 la
    // concurrencia debe ser 1 (Cloud Run no permite concurrencia con CPU
    // fraccional).
    memory: '128MiB',
    cpu: 0.0833,
    minInstances: 0,
    maxInstances: 1,
    concurrency: 1,
  },
  async (req, res) => {
    const uid = String(req.query.uid || '')
    const key = String(req.query.key || '')

    if (!uid || key !== WIDGET_KEY.value()) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }

    const snap = await db.doc(`users/${uid}`).get()
    const data = snap.data() || {}
    const planner = data.planner || {}
    const timezone = data.timezone || 'America/Bogota'
    const { dateKey, minutes: nowMin } = localParts(new Date(), timezone)

    const events = parseList(planner, `events-${dateKey}`)
      // Oculta los eventos que ya terminaron (su hora final ya pasó), para que
      // el widget muestre primero el siguiente evento en curso o por venir.
      // Si un evento no tiene `end`, se asume 1 hora de duración.
      .filter((e) => {
        const end = Number.isFinite(e.end) ? e.end : e.start + 60
        return end > nowMin
      })
      .sort((a, b) => a.start - b.start)
      .map((e) => ({
        title: e.title,
        time: formatTime(e.start),
        color: EVENT_COLORS[e.type] || '444444_1',
      }))
    const reminders = parseList(planner, `reminders-${dateKey}`).map((r) => ({
      text: r.text,
      holiday: isHoliday(r),
    }))
    const todos = parseList(planner, `todos-${dateKey}`)
      .filter((t) => !t.done)
      .map((t) => ({ text: t.text }))

    // Medicamentos pendientes de hoy: para cada plan activo y cada medicamento
    // no pausado, se listan las dosis del día que NO estén marcadas como
    // tomadas en el historial. Ordenadas por hora.
    let medHistory = {}
    try {
      medHistory = JSON.parse(planner['med-history'] || '{}')
    } catch {
      medHistory = {}
    }
    const pad2 = (n) => String(n).padStart(2, '0')
    const minToHHMM = (min) => `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`
    const medications = []
    parseList(planner, 'med-plans').forEach((plan) => {
      if (!isPlanActiveOn(plan, dateKey)) return
      const planColor = PLAN_COLOR_HEX[plan.color] || PLAN_COLOR_HEX.purple
      ;(plan.medications || []).forEach((med) => {
        if (!med || med.status === 'paused') return
        medDoseMinutes(med).forEach((doseMin) => {
          const sched = `${dateKey}T${minToHHMM(doseMin)}`
          const taken = ((medHistory && medHistory[med.id]) || []).some(
            (e) => e.scheduledTime === sched && e.status === 'Taken',
          )
          if (taken) return
          medications.push({
            plan: plan.name || '',
            color: planColor,
            time: formatTime(doseMin),
            name: med.name || '',
            min: doseMin,
          })
        })
      })
    })
    medications.sort((a, b) => a.min - b.min)
    medications.forEach((m) => delete m.min)

    res.set('Cache-Control', 'no-store')
    res.json({ dateKey, events, reminders, todos, medications })
  },
)