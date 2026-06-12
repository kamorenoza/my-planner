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

const URL = 'https://todayplanner-3vj4nyqxxa-uc.a.run.app/'
const UID = 'FCblltIACEexbshWH3NihnlBuEV2'
const KEY = 'mykey147'

const MAX_TODOS = 3
const MAX_EVENTS = 6

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
const COLOR_BG = new Color('#FFFFFF')
const COLOR_PRIMARY = new Color('#8D76B0') // morado primario
const COLOR_TEXT = new Color('#3D3550') // morado muy oscuro para texto
const COLOR_MUTED = new Color('#9A93AC') // morado grisáceo suave
const COLOR_HEADER = new Color('#8D76B0') // títulos de sección (morado)
const COLOR_HOLIDAY = new Color('#D1568F') // rosa festivo
const COLOR_TODO_DOT = new Color('#7E9FD4') // azul pastel

// Parse a YYYY-MM-DD key as a local date (no timezone shifting).
function parseDateKey(key) {
  const [y, m, d] = (key || '').split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

async function fetchData() {
  const req = new Request(`${URL}?uid=${UID}&key=${encodeURIComponent(KEY)}`)
  req.timeoutInterval = 15
  return req.loadJSON()
}

function buildWidget(data) {
  const w = new ListWidget()
  w.backgroundColor = COLOR_BG
  w.setPadding(12, 14, 12, 14)

  const date = parseDateKey(data.dateKey)
  const events = data.events || []
  const reminders = (data.reminders || [])
    .slice()
    .sort((a, b) => (b.holiday ? 1 : 0) - (a.holiday ? 1 : 0))
  const todos = data.todos || []

  // Two columns side by side.
  const row = w.addStack()
  row.topAlignContent()
  const left = row.addStack()
  left.layoutVertically()
  row.addSpacer(12)
  const right = row.addStack()
  right.layoutVertically()

  // --- Column 1: date + reminders ---------------------------------------
  const weekday = left.addText(WEEKDAYS[date.getDay()])
  weekday.font = Font.boldSystemFont(17)
  weekday.textColor = COLOR_PRIMARY

  const dateLine = left.addText(
    `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`,
  )
  dateLine.font = Font.systemFont(12)
  dateLine.textColor = COLOR_MUTED

  if (reminders.length) {
    left.addSpacer(8)
    reminders.slice(0, 6).forEach((r) => {
      const t = left.addText(
        r.holiday ? `:tada: ${r.text}` : `• ${r.text}`,
      )
      t.font = r.holiday
        ? Font.mediumSystemFont(11)
        : Font.systemFont(11)
      t.textColor = r.holiday ? COLOR_HOLIDAY : COLOR_TEXT
      t.lineLimit = 1
      left.addSpacer(2)
    })
  }

  // --- Column 2: todos + events -----------------------------------------
  if (todos.length) {
    const head = right.addText('Tareas')
    head.font = Font.semiboldSystemFont(11)
    head.textColor = COLOR_HEADER
    right.addSpacer(3)
    todos.slice(0, MAX_TODOS).forEach((td) => {
      const line = right.addStack()
      line.centerAlignContent()
      const dot = line.addText('•')
      dot.font = Font.systemFont(11)
      dot.textColor = COLOR_TODO_DOT
      line.addSpacer(4)
      const t = line.addText(td.text)
      t.font = Font.systemFont(11)
      t.textColor = COLOR_TEXT
      t.lineLimit = 1
      right.addSpacer(2)
    })
    if (events.length) right.addSpacer(8)
  }

  if (events.length) {
    const head = right.addText('Eventos')
    head.font = Font.semiboldSystemFont(11)
    head.textColor = COLOR_HEADER
    right.addSpacer(3)
    events.slice(0, MAX_EVENTS).forEach((ev) => {
      const t = right.addText(`${ev.time} - ${ev.title}`)
      t.font = Font.systemFont(11)
      t.textColor = new Color(ev.color || '#6A4BA0')
      t.lineLimit = 1
      right.addSpacer(2)
    })
  }

  if (!todos.length && !events.length) {
    const t = right.addText('Sin tareas ni eventos')
    t.font = Font.systemFont(11)
    t.textColor = COLOR_MUTED
  }

  return w
}

function errorWidget(message) {
  const w = new ListWidget()
  w.backgroundColor = COLOR_BG
  const t = w.addText('Error')
  t.font = Font.boldSystemFont(14)
  t.textColor = new Color('#C0392B')
  w.addSpacer(4)
  const m = w.addText(String(message))
  m.font = Font.systemFont(10)
  m.textColor = COLOR_MUTED
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