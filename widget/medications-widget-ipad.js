

// ---------------------------------------------------------------------------
// Widget "Medicamentos para hoy" para iPad (Scriptable)
// ---------------------------------------------------------------------------
// Igual que el widget de medicamentos del iPhone, pero pensado para el widget
// GRANDE del iPad: tipografías y espaciados mayores. En lugar de un círculo de
// color, cada fila muestra un TAG con el NOMBRE del plan en su color.
//
// Lee las dosis PENDIENTES de hoy desde la Cloud Function `todayPlanner`
// (la misma que los widgets "Hoy" y "Medicamentos" del iPhone).
//
// Cómo usarlo:
//   1. Instala Scriptable (gratis) en el iPad.
//   2. Crea un script nuevo y pega TODO este archivo.
//   3. Rellena UID y KEY (la URL ya viene puesta).
//   4. Pulsa ▶︎ para probar. Luego añade el widget GRANDE y elige este script.
//
// Contenido:
//   MEDICAMENTOS HOY
//   [ Plan ]  8:00am Nombre del medicamento   (tag con el color del plan a la izq.)
//   ... (máximo 10; si hay más, un badge "+N" con los restantes)
// ---------------------------------------------------------------------------

const ENDPOINT = 'https://todayplanner-3vj4nyqxxa-uc.a.run.app/'
const UID = 'FCblltIACEexbshWH3NihnlBuEV2'
const KEY = 'mykey147'

// Al tocar el widget abre el Atajo "Planner" (igual que el widget "Hoy").
const SHORTCUT_NAME = 'Planner'

const MAX_MEDS = 10

// NOTA: en Scriptable, `new Color('#rrggbb')` con '#' tiñe mal el texto. Hay que
// pasar el hex SIN '#'. `hex()` lo asegura.
function hex(value) {
  return new Color(String(value).replace('#', ''))
}

const COLOR_BG = hex('F6F6F7') // gris muy sutil (casi blanco)
const COLOR_HEADER = hex('6c6c75') // título de sección: gris oscuro
const COLOR_BODY = hex('6f6f7b') // texto: gris suave
const COLOR_TIME = hex('8d76b0') // hora: morado
const COLOR_BADGE_BG = new Color('8d76b0', 0.18) // morado claro (badge +N)
const COLOR_BADGE_TX = hex('8d76b0') // morado (texto del badge)

// El color del plan llega como 6 caracteres hex (sin '#'). Si no es válido,
// usamos el morado por defecto para que el texto nunca quede ilegible.
function planHex(med) {
  const raw = String(med && med.color ? med.color : '')
  const m = raw.match(/[0-9a-fA-F]{6}/)
  return m ? m[0] : '8d76b0'
}

// "8:00 am" -> "8:00am" (formato compacto pedido para el widget).
function compactTime(time) {
  return String(time || '').replace(/\s+/g, '')
}

async function fetchData() {
  const req = new Request(`${ENDPOINT}?uid=${UID}&key=${encodeURIComponent(KEY)}`)
  req.timeoutInterval = 15
  return req.loadJSON()
}

function buildWidget(data) {
  const w = new ListWidget()
  w.backgroundColor = COLOR_BG
  w.url = `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`
  w.setPadding(22, 24, 22, 24)

  const meds = data.medications || []

  const head = w.addText('MEDICAMENTOS HOY')
  head.font = Font.semiboldSystemFont(13)
  head.textColor = COLOR_HEADER
  head.leftAlignText()
  w.addSpacer(10)

  if (!meds.length) {
    const t = w.addText('Sin medicamentos pendientes')
    t.font = Font.systemFont(14)
    t.textColor = COLOR_BODY
    t.leftAlignText()
    w.addSpacer()
    return w
  }

  const shown = meds.slice(0, MAX_MEDS)
  const extra = meds.length - shown.length

  shown.forEach((med, i) => {
    const line = w.addStack()
    line.centerAlignContent()

    // Tag con el NOMBRE del plan en su color, alineado a la izquierda.
    const planColor = planHex(med)
    const tag = line.addStack()
    tag.backgroundColor = new Color(planColor, 0.15)
    tag.cornerRadius = 4
    tag.setPadding(2, 7, 2, 7)
    const tagText = tag.addText(med.plan || 'Plan')
    tagText.font = Font.semiboldSystemFont(12)
    tagText.textColor = hex(planColor)
    tagText.lineLimit = 1

    line.addSpacer(8)

    const time = line.addText(compactTime(med.time))
    time.font = Font.mediumSystemFont(14)
    time.textColor = COLOR_TIME
    time.leftAlignText()
    time.lineLimit = 1

    line.addSpacer(6)

    const name = line.addText(med.name || '')
    name.font = Font.systemFont(14)
    name.textColor = COLOR_BODY
    name.leftAlignText()
    name.lineLimit = 1

    // En la última fila visible, si hay más dosis, muestra el badge "+N".
    if (i === shown.length - 1 && extra > 0) {
      line.addSpacer(6)
      const badge = line.addStack()
      badge.backgroundColor = COLOR_BADGE_BG
      badge.cornerRadius = 3
      badge.setPadding(1, 5, 1, 5)
      const bt = badge.addText(`+${extra}`)
      bt.font = Font.semiboldSystemFont(12)
      bt.textColor = COLOR_BADGE_TX
    }

    line.addSpacer()
    w.addSpacer(6)
  })

  w.addSpacer() // empuja el contenido hacia arriba
  return w
}

function errorWidget(message) {
  const w = new ListWidget()
  w.backgroundColor = COLOR_BG
  const t = w.addText('Error')
  t.font = Font.boldSystemFont(15)
  t.textColor = hex('c0392b')
  w.addSpacer(4)
  const m = w.addText(String(message))
  m.font = Font.systemFont(11)
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
  widget.presentLarge()
}
Script.complete()