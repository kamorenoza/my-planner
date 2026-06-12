import { onSchedule } from "firebase-functions/v2/scheduler";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

initializeApp();
const db = getFirestore();

// Shared secret so only you can read your planner from the widget.
const WIDGET_KEY = defineSecret("WIDGET_KEY");

// How often the scheduler runs (minutes). Must match the schedule below.
const RUN_INTERVAL_MIN = 15;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Local date/time parts for a given IANA timezone.
function localParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    minute: Number(parts.minute),
    minutes: hour * 60 + Number(parts.minute),
  };
}

function formatTime(min) {
  const hour = Math.floor(min / 60);
  const minutes = min % 60;
  const period = hour < 12 ? "am" : "pm";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${String(minutes).padStart(2, "0")} ${period}`;
}

function parseList(planner, key) {
  try {
    return JSON.parse(planner?.[key] || "[]");
  } catch {
    return [];
  }
}

function isHoliday(reminder) {
  return reminder && reminder.holiday === true;
}

// Build the 8:00 daily messages: events, reminders and tasks, each as its own
// notification and only when there is something to show.
// Returns an array of { title, body }.
function buildDailyMessages(planner, dateKey) {
  const events = parseList(planner, `events-${dateKey}`).sort(
    (a, b) => a.start - b.start,
  );
  const reminders = parseList(planner, `reminders-${dateKey}`).filter(
    (r) => !isHoliday(r),
  );
  const todos = parseList(planner, `todos-${dateKey}`).filter((t) => !t.done);

  const messages = [];

  if (events.length) {
    messages.push({
      title: "Eventos para hoy",
      body: events.map((e) => `- ${e.title} ${formatTime(e.start)}`).join("\n"),
    });
  }

  if (reminders.length) {
    messages.push({
      title: "Recordatorios para hoy",
      body: reminders.map((r) => `- ${r.text}`).join("\n"),
    });
  }

  if (todos.length) {
    messages.push({
      title: "Tareas para hoy",
      body: todos.map((t) => `- ${t.text}`).join("\n"),
    });
  }

  return messages;
}

// Send a data-only message to every token of a user, pruning invalid ones.
// Data-only (no `notification` field) avoids the duplicate where iOS auto-shows
// the notification AND the service worker shows it again in onBackgroundMessage.
async function sendToUser(uid, tokensMap, message) {
  const tokens = Object.keys(tokensMap || {});
  if (tokens.length === 0) return;

  const res = await getMessaging().sendEachForMulticast({
    tokens,
    // iOS Web Push EXIGE una `notification` visible; los mensajes data-only
    // (silenciosos) no se muestran de forma fiable y Apple puede revocar la
    // suscripción. Mandamos la notificación + data como respaldo. El service
    // worker NO vuelve a mostrarla cuando ya hay `notification` (evita duplicar).
    data: {
      title: String(message.title || ""),
      body: String(message.body || ""),
    },
    webpush: {
      notification: {
        title: String(message.title || "My Planner"),
        body: String(message.body || ""),
        icon: "/my-planer/pwa-192x192.png",
        badge: "/my-planer/pwa-64x64.png",
      },
      fcmOptions: { link: "/my-planer/" },
    },
  });

  // Remove tokens that are no longer valid.
  const invalid = {};
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code || "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-argument") ||
        code.includes("invalid-registration-token")
      ) {
        invalid[`notif.tokens.${tokens[i]}`] = FieldValue.delete();
      }
    }
  });
  if (Object.keys(invalid).length) {
    await db
      .doc(`users/${uid}`)
      .set(invalid, { merge: true })
      .catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Scheduled function
// ---------------------------------------------------------------------------

export const sendPlannerNotifications = onSchedule(
  {
    schedule: `every ${RUN_INTERVAL_MIN} minutes`,
    timeZone: "Etc/UTC",
    region: "us-central1",
    retryCount: 0,
    // Mantener el costo bajo: instancia mínima de recursos, escala a cero
    // cuando no corre y nunca más de 1 instancia a la vez.
    memory: "256MiB",
    minInstances: 0,
    maxInstances: 1,
  },
  async () => {
    const now = new Date();
    const snap = await db.collection("users").get();

    const jobs = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const notif = data.notif;
      if (!notif || notif.enabled === false) return;
      const tokens = notif.tokens || {};
      if (Object.keys(tokens).length === 0) return;

      const timezone = data.timezone || "America/Bogota";
      const dailyHour = Number.isInteger(notif.dailyHour) ? notif.dailyHour : 8;
      const leadMin = Number.isInteger(notif.eventLeadMinutes)
        ? notif.eventLeadMinutes
        : 60;

      const { dateKey, hour, minutes } = localParts(now, timezone);
      const planner = data.planner || {};
      const sent = notif.sent || {};
      const newSent = {};
      // Keep only today's markers to avoid unbounded growth.
      Object.keys(sent).forEach((k) => {
        if (k.includes(dateKey)) newSent[k] = sent[k];
      });

      const updates = {};
      const messages = [];

      // 8:00 daily summary — send on the first run at/after the configured
      // hour (within that hour) if not already sent today.
      const dailyKey = `daily-${dateKey}`;
      if (hour === dailyHour && !newSent[dailyKey]) {
        const daily = buildDailyMessages(planner, dateKey);
        if (daily.length) {
          daily.forEach((m) => messages.push(m));
        }
        // Mark as sent even if there was nothing, so we don't keep checking
        // all hour long.
        newSent[dailyKey] = true;
      }

      // Event reminders — send on the first run where the event starts within
      // `leadMin` minutes (and hasn't started yet), once per event.
      const events = parseList(planner, `events-${dateKey}`);
      events.forEach((ev) => {
        const until = ev.start - minutes;
        if (until <= leadMin && until > 0) {
          const evKey = `evt-${dateKey}-${ev.id}`;
          if (!newSent[evKey]) {
            messages.push({
              title: `Evento: ${ev.title}`,
              body: `Empieza a las ${formatTime(ev.start)}`,
            });
            newSent[evKey] = true;
          }
        }
      });

      if (messages.length === 0) return;

      updates["notif.sent"] = newSent;
      jobs.push(
        (async () => {
          for (const msg of messages) {
            await sendToUser(docSnap.id, tokens, msg);
          }
          await db
            .doc(`users/${docSnap.id}`)
            .set(updates, { merge: true })
            .catch(() => {});
        })(),
      );
    });

    await Promise.all(jobs);
    logger.info(`Notification run complete: ${jobs.length} user(s) notified.`);
  },
);

// ---------------------------------------------------------------------------
// HTTP endpoint for the home-screen widget (Scriptable, etc.)
// ---------------------------------------------------------------------------

// Resolved tag colors (text color, readable on a white background) so the
// widget can paint each event without knowing the app's CSS variables.
const EVENT_COLORS = {
  personal: "#A84672",
  trabajo: "#3F7D62",
  citas: "#6A4BA0",
  otros: "#B5773A",
};

// Returns today's events, reminders and pending todos for a user as JSON.
// Auth is a simple uid + shared-secret check, enough for a personal widget.
export const todayPlanner = onRequest(
  {
    region: "us-central1",
    secrets: [WIDGET_KEY],
    cors: true,
    // Costo bajo: recursos mínimos, escala a cero y tope de 1 instancia para
    // que un exceso de llamadas (o bots) no dispare la factura. El CPU se fija
    // al mínimo para abaratar cada arranque en frío. Con CPU < 1 la
    // concurrencia debe ser 1 (Cloud Run no permite concurrencia con CPU
    // fraccional).
    memory: "128MiB",
    cpu: 0.0833,
    minInstances: 0,
    maxInstances: 1,
    concurrency: 1,
  },
  async (req, res) => {
    const uid = String(req.query.uid || "");
    const key = String(req.query.key || "");

    if (!uid || key !== WIDGET_KEY.value()) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    const snap = await db.doc(`users/${uid}`).get();
    const data = snap.data() || {};
    const planner = data.planner || {};
    const timezone = data.timezone || "America/Bogota";
    const { dateKey } = localParts(new Date(), timezone);

    const events = parseList(planner, `events-${dateKey}`)
      .sort((a, b) => a.start - b.start)
      .map((e) => ({
        title: e.title,
        time: formatTime(e.start),
        color: EVENT_COLORS[e.type] || "#444444",
      }));
    const reminders = parseList(planner, `reminders-${dateKey}`).map((r) => ({
      text: r.text,
      holiday: isHoliday(r),
    }));
    const todos = parseList(planner, `todos-${dateKey}`)
      .filter((t) => !t.done)
      .map((t) => ({ text: t.text }));

    res.set("Cache-Control", "no-store");
    res.json({ dateKey, events, reminders, todos });
  },
);
