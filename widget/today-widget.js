// ---------------------------------------------------------------------------
// Widget "Hoy" para Scriptable (iPhone / iPad)
// ---------------------------------------------------------------------------
// Muestra el planner del día leyendo la Cloud Function `todayPlanner`.
//
// Cómo usarlo:
//   1. Instala Scriptable (gratis) en el iPhone/iPad.
//   2. Crea un script nuevo y pega TODO este archivo.
//   3. Cambia las 3 constantes de abajo (URL ya viene puesta; pon UID y KEY).
//   4. Pulsa ▶︎ para probar. Luego añade el widget a la pantalla de inicio
//      y, en "Editar widget", elige este script.
//
// Diseño: fondo blanco, dos columnas.
//   Columna 1: día de la semana, fecha y recordatorios (festivos primero).
//   Columna 2: TODOs (máx. 3) y eventos (hora - nombre, color del tag).
// ---------------------------------------------------------------------------

const ENDPOINT = 'https://todayplanner-3vj4nyqxxa-uc.a.run.app/'
const UID = 'FCblltIACEexbshWH3NihnlBuEV2'
const KEY = 'mykey147'

// Al tocar el widget abre un Atajo (app "Atajos") llamado así. Crea el Atajo
// con la acción "Abrir app" -> tu PWA para que abra la app instalada y no Safari.
const SHORTCUT_NAME = 'Planner'

const MAX_TODOS = 3
const MAX_REMINDERS = 2
const MAX_EVENTS = 2

const WEEKDAYS = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]
const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

// Colors (paleta del tema original: morados, rosados y azul pastel)
// NOTA: en Scriptable, `new Color('#rrggbb')` con '#' se interpreta mal y tiñe
// el texto (se ve verde). Hay que pasar el hex SIN '#'. `hex()` lo asegura.
function hex(value) {
  return new Color(String(value).replace('#', ''))
}

const COLOR_BG = hex('F6F6F7') // gris muy sutil (casi blanco)
const COLOR_DAY = hex('4a4a57') // título del día: gris oscuro
const COLOR_DATE = hex('8d76b0') // fecha: morado
const COLOR_TITLE = hex('6c6c75') // títulos de sección: gris oscuro
const COLOR_HEADER = hex('d1568f') // títulos de sección: rosa
const COLOR_BODY = hex('6f6f7b') // texto: gris suave
const COLOR_HOLIDAY = hex('d1568f') // rosa festivo
const COLOR_TODO_DOT = hex('7e9fd4') // azul pastel
const COLOR_BADGE_BG = new Color('8d76b0', 0.18) // morado claro (badge +N)
const COLOR_BADGE_TX = hex('8d76b0') // morado (texto del badge)

// Color del evento (hex sin '#') y su fondo claro translúcido.
// El color puede llegar en varios formatos ("3F7D62_1", "3F7D62_1", un id de
// tipo, etc.). Extraemos los 6 caracteres hex válidos; si no hay, usamos el
// morado por defecto, para que el texto nunca quede ilegible.
function eventHex(ev) {
  const raw = String(ev && ev.color ? ev.color : '')
  const m = raw.match(/[0-9a-fA-F]{6}/)
  return m ? m[0] : '6a4ba0'
}
function eventColor(ev) {
  return new Color(eventHex(ev))
}
function eventBg(ev) {
  return new Color(eventHex(ev), 0.12)
}

// Parse a YYYY-MM-DD key as a local date (no timezone shifting).
function parseDateKey(key) {
  const [y, m, d] = (key || '').split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

function applyWhiteBackground(w) {
  w.backgroundColor = COLOR_BG
}

async function fetchData() {
  const req = new Request(`${ENDPOINT}?uid=${UID}&key=${encodeURIComponent(KEY)}`)
  req.timeoutInterval = 15
  return req.loadJSON()
}

function buildWidget(data) {
  const w = new ListWidget()
  applyWhiteBackground(w)
  w.url = `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`
  w.setPadding(18, 20, 18, 20)

  const date = parseDateKey(data.dateKey)
  const events = data.events || []
  const reminders = (data.reminders || [])
    .slice()
    .sort((a, b) => (b.holiday ? 1 : 0) - (a.holiday ? 1 : 0))
  const todos = data.todos || []

  // Two columns side by side, hugging the left edge.
  const row = w.addStack()
  row.topAlignContent()
  const left = row.addStack()
  left.layoutVertically()
  row.addSpacer(28)
  const right = row.addStack()
  right.layoutVertically()
  row.addSpacer() // empuja ambas columnas a la izquierda

  // --- Column 1: date + todos -------------------------------------------
  const weekday = left.addText(WEEKDAYS[date.getDay()])
  weekday.font = Font.boldSystemFont(20)
  weekday.textColor = COLOR_DAY
  weekday.leftAlignText()

  const dateLine = left.addText(
    `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`,
  )
  dateLine.font = Font.mediumSystemFont(14)
  dateLine.textColor = COLOR_DATE
  dateLine.leftAlignText()

  if (todos.length) {
    left.addSpacer(16)
    const head = left.addText('TAREAS')
    head.font = Font.semiboldSystemFont(12)
    head.textColor = COLOR_TITLE
    head.leftAlignText()
    left.addSpacer(3)
    const shownTodos = todos.slice(0, MAX_TODOS)
    const extraTodos = todos.length - shownTodos.length
    shownTodos.forEach((td, i) => {
      const line = left.addStack()
      line.centerAlignContent()
      const dot = line.addText('•')
      dot.font = Font.systemFont(13)
      dot.textColor = COLOR_TODO_DOT
      line.addSpacer(4)
      const t = line.addText(td.text)
      t.font = Font.systemFont(13)
      t.textColor = COLOR_BODY
      t.leftAlignText()
      t.lineLimit = 1
      if (i === shownTodos.length - 1 && extraTodos > 0) {
        line.addSpacer(6)
        const badge = line.addStack()
        badge.backgroundColor = COLOR_BADGE_BG
        badge.cornerRadius = 3
        badge.setPadding(1, 5, 1, 5)
        const bt = badge.addText(`+${extraTodos}`)
        bt.font = Font.semiboldSystemFont(11)
        bt.textColor = COLOR_BADGE_TX
      }
      left.addSpacer(3)
    })
  }

  // --- Column 2: reminders + events -------------------------------------
  {
    right.addSpacer(2)
    const head = right.addText('RECORDATORIOS')
    head.font = Font.semiboldSystemFont(12)
    head.textColor = COLOR_TITLE
    head.leftAlignText()
    right.addSpacer(3)
    if (reminders.length) {
      const shown = reminders.slice(0, MAX_REMINDERS)
      const extra = reminders.length - shown.length
      shown.forEach((r, i) => {
        const line = right.addStack()
        line.centerAlignContent()
        const t = line.addText(r.holiday ? `Festivo: ${r.text}` : r.text)
        t.font = Font.systemFont(13)
        t.textColor = COLOR_BODY
        t.leftAlignText()
        t.lineLimit = 1
        if (i === shown.length - 1 && extra > 0) {
          line.addSpacer(6)
          const badge = line.addStack()
          badge.backgroundColor = COLOR_BADGE_BG
          badge.cornerRadius = 3
          badge.setPadding(1, 5, 1, 5)
          const bt = badge.addText(`+${extra}`)
          bt.font = Font.semiboldSystemFont(11)
          bt.textColor = COLOR_BADGE_TX
        }
        right.addSpacer(3)
      })
    } else {
      const t = right.addText('Sin recordatorios')
      t.font = Font.systemFont(13)
      t.textColor = COLOR_BODY
      t.leftAlignText()
    }
    right.addSpacer(10)
  }

  {
    const head = right.addText('EVENTOS')
    head.font = Font.semiboldSystemFont(12)
    head.textColor = COLOR_TITLE
    head.leftAlignText()
    right.addSpacer(3)
    if (events.length) {
      const shown = events.slice(0, MAX_EVENTS)
      const extra = events.length - shown.length
      shown.forEach((ev, i) => {
        const line = right.addStack()
        line.centerAlignContent()
        const card = line.addStack()
        card.backgroundColor = eventBg(ev)
        card.cornerRadius = 4
        card.setPadding(3, 5, 3, 6)
        card.centerAlignContent()
        const bar = card.addStack()
        bar.backgroundColor = eventColor(ev)
        bar.size = new Size(2, 15)
        bar.cornerRadius = 1
        card.addSpacer(6)
        const t = card.addText(`${ev.time} - ${ev.title}`)
        t.font = Font.systemFont(13)
        t.textColor = COLOR_BODY
        t.leftAlignText()
        t.lineLimit = 1
        if (i === shown.length - 1 && extra > 0) {
          line.addSpacer(6)
          const e = line.addText(`+${extra} eventos`)
          e.font = Font.systemFont(11)
          e.textColor = COLOR_BODY
          e.leftAlignText()
          e.lineLimit = 1
        }
        line.addSpacer()
        right.addSpacer(4)
      })
    } else {
      const t = right.addText('Sin eventos')
      t.font = Font.systemFont(13)
      t.textColor = COLOR_BODY
      t.leftAlignText()
    }
  }

  w.addSpacer() // empuja el contenido hacia arriba

  return w
}

function errorWidget(message) {
  const w = new ListWidget()
  applyWhiteBackground(w)
  const t = w.addText('Error')
  t.font = Font.boldSystemFont(14)
  t.textColor = hex('c0392b')
  w.addSpacer(4)
  const m = w.addText(String(message))
  m.font = Font.systemFont(10)
  m.textColor = COLOR_BODY
  return w
}

let widget
try {
  const data = await fetchData()
  if (data && data.error) {
    widget = errorWidget(data.error)
  } else {
    widget = buildWidget(data)
  }
} catch (e) {
  widget = errorWidget(e.message || e)
}

if (config.runsInWidget) {
  Script.setWidget(widget)
} else {
  widget.presentMedium()
}
Script.complete()