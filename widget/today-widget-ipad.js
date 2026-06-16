// ---------------------------------------------------------------------------
// Widget "Hoy" para iPad (Scriptable) — diseño en UNA columna
// ---------------------------------------------------------------------------
// Igual que el widget del iPhone pero pensado para el widget grande del iPad:
// una sola columna apilada verticalmente.
//
//   Lunes, Junio 15, 2026
//
//   TAREAS
//   • ...
//   • ...   +1
//
//   RECORDATORIOS
//   ...
//   ...     +1
//
//   EVENTOS
//   evento 1
//   evento 2   +2 eventos
//
// Cómo usarlo:
//   1. Crea un script nuevo en Scriptable y pega TODO este archivo.
//   2. La URL ya viene puesta; pon tu UID y KEY abajo.
//   3. Añade el widget GRANDE del iPad y elige este script.
// ---------------------------------------------------------------------------

const ENDPOINT = "https://todayplanner-3vj4nyqxxa-uc.a.run.app/";
const UID = "FCblltIACEexbshWH3NihnlBuEV2";
const KEY = "mykey147";

// Al tocar el widget abre un Atajo (app "Atajos") llamado así. Crea el Atajo
// con la acción "Abrir app" -> tu PWA para que abra la app instalada y no Safari.
const SHORTCUT_NAME = "Planner";

const MAX_TODOS = 3;
const MAX_REMINDERS = 2;
const MAX_EVENTS = 2;

const WEEKDAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// Colors (misma paleta que el widget del iPhone)
// NOTA: en Scriptable, `new Color('#rrggbb')` con '#' se interpreta mal y tiñe
// el texto (se ve verde). Hay que pasar el hex SIN '#'. `hex()` lo asegura.
function hex(value) {
  return new Color(String(value).replace("#", ""));
}

const COLOR_BG = hex("F6F6F7"); // gris muy sutil (casi blanco)
const COLOR_DAY = hex("4a4a57"); // título del día: gris oscuro
const COLOR_DATE = hex("8d76b0"); // fecha: morado
const COLOR_TITLE = hex("6c6c75"); // títulos de sección: gris oscuro
const COLOR_BODY = hex("6f6f7b"); // texto: gris suave
const COLOR_TODO_DOT = hex("7e9fd4"); // azul pastel
const COLOR_BADGE_BG = new Color("8d76b0", 0.18); // morado claro (badge +N)
const COLOR_BADGE_TX = hex("8d76b0"); // morado (texto del badge)

// Color del evento (hex sin '#') y su fondo claro translúcido.
function eventColor(ev) {
  return hex(ev && ev.color ? ev.color : "6a4ba0");
}
function eventBg(ev) {
  const h = String(ev && ev.color ? ev.color : "6a4ba0").replace("#", "");
  return new Color(h, 0.12);
}

// Parse a YYYY-MM-DD key as a local date (no timezone shifting).
function parseDateKey(key) {
  const [y, m, d] = (key || "").split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function applyWhiteBackground(w) {
  w.backgroundColor = COLOR_BG;
}

async function fetchData() {
  const req = new Request(
    `${ENDPOINT}?uid=${UID}&key=${encodeURIComponent(KEY)}`,
  );
  req.timeoutInterval = 15;
  return req.loadJSON();
}

// Título de sección reutilizable.
function addSectionTitle(container, label) {
  const head = container.addText(label);
  head.font = Font.semiboldSystemFont(13);
  head.textColor = COLOR_TITLE;
  head.leftAlignText();
}

// Badge morado "+N" reutilizable.
function addBadge(line, count) {
  line.addSpacer(6);
  const badge = line.addStack();
  badge.backgroundColor = COLOR_BADGE_BG;
  badge.cornerRadius = 3;
  badge.setPadding(1, 5, 1, 5);
  const bt = badge.addText(`+${count}`);
  bt.font = Font.semiboldSystemFont(12);
  bt.textColor = COLOR_BADGE_TX;
}

function buildWidget(data) {
  const w = new ListWidget();
  applyWhiteBackground(w);
  w.url = `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`;
  w.setPadding(22, 24, 22, 24);

  const date = parseDateKey(data.dateKey);
  const events = data.events || [];
  const reminders = (data.reminders || [])
    .slice()
    .sort((a, b) => (b.holiday ? 1 : 0) - (a.holiday ? 1 : 0));
  const todos = data.todos || [];

  // --- Encabezado: "Lunes, 15 Junio 2026" ------------------------------
  // Mismo tipo de letra y color que el widget del iPhone: el día en gris
  // oscuro y la fecha en morado, todo en una línea alineado al bottom.
  const header = w.addStack();
  header.bottomAlignContent();
  const weekday = header.addText(`${WEEKDAYS[date.getDay()]}, `);
  weekday.font = Font.boldSystemFont(22);
  weekday.textColor = COLOR_DAY;
  // Envuelve la fecha en un stack vertical con un spacer abajo para subirla
  // un par de px respecto a la línea base del día.
  const dateWrap = header.addStack();
  dateWrap.layoutVertically();
  const dateLine = dateWrap.addText(
    `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
  );
  dateLine.font = Font.mediumSystemFont(16);
  dateLine.textColor = COLOR_DATE;
  dateWrap.addSpacer(1);

  // --- TAREAS -----------------------------------------------------------
  w.addSpacer(18);
  addSectionTitle(w, "TAREAS");
  w.addSpacer(5);
  if (todos.length) {
    const shown = todos.slice(0, MAX_TODOS);
    const extra = todos.length - shown.length;
    shown.forEach((td, i) => {
      const line = w.addStack();
      line.centerAlignContent();
      const dot = line.addText("•");
      dot.font = Font.systemFont(14);
      dot.textColor = COLOR_TODO_DOT;
      line.addSpacer(5);
      const t = line.addText(td.text);
      t.font = Font.systemFont(14);
      t.textColor = COLOR_BODY;
      t.leftAlignText();
      t.lineLimit = 1;
      if (i === shown.length - 1 && extra > 0) addBadge(line, extra);
      line.addSpacer();
      w.addSpacer(4);
    });
  } else {
    const t = w.addText("Sin tareas");
    t.font = Font.systemFont(14);
    t.textColor = COLOR_BODY;
    t.leftAlignText();
  }

  // --- RECORDATORIOS ----------------------------------------------------
  w.addSpacer(14);
  addSectionTitle(w, "RECORDATORIOS");
  w.addSpacer(5);
  if (reminders.length) {
    const shown = reminders.slice(0, MAX_REMINDERS);
    const extra = reminders.length - shown.length;
    shown.forEach((r, i) => {
      const line = w.addStack();
      line.centerAlignContent();
      const t = line.addText(r.holiday ? `Festivo: ${r.text}` : r.text);
      t.font = Font.systemFont(14);
      t.textColor = COLOR_BODY;
      t.leftAlignText();
      t.lineLimit = 1;
      if (i === shown.length - 1 && extra > 0) addBadge(line, extra);
      line.addSpacer();
      w.addSpacer(4);
    });
  } else {
    const t = w.addText("Sin recordatorios");
    t.font = Font.systemFont(14);
    t.textColor = COLOR_BODY;
    t.leftAlignText();
  }

  // --- EVENTOS ----------------------------------------------------------
  w.addSpacer(14);
  addSectionTitle(w, "EVENTOS");
  w.addSpacer(5);
  if (events.length) {
    const shown = events.slice(0, MAX_EVENTS);
    const extra = events.length - shown.length;
    shown.forEach((ev, i) => {
      const line = w.addStack();
      line.centerAlignContent();
      const card = line.addStack();
      card.backgroundColor = eventBg(ev);
      card.cornerRadius = 4;
      card.setPadding(3, 6, 3, 7);
      card.centerAlignContent();
      const bar = card.addStack();
      bar.backgroundColor = eventColor(ev);
      bar.size = new Size(2, 16);
      bar.cornerRadius = 1;
      card.addSpacer(6);
      const t = card.addText(`${ev.time} - ${ev.title}`);
      t.font = Font.systemFont(14);
      t.textColor = COLOR_BODY;
      t.leftAlignText();
      t.lineLimit = 1;
      if (i === shown.length - 1 && extra > 0) {
        line.addSpacer(6);
        const e = line.addText(`+${extra} eventos`);
        e.font = Font.systemFont(12);
        e.textColor = COLOR_BODY;
        e.leftAlignText();
        e.lineLimit = 1;
      }
      line.addSpacer();
      w.addSpacer(5);
    });
  } else {
    const t = w.addText("Sin eventos");
    t.font = Font.systemFont(14);
    t.textColor = COLOR_BODY;
    t.leftAlignText();
  }

  w.addSpacer(); // empuja el contenido hacia arriba

  return w;
}

function errorWidget(message) {
  const w = new ListWidget();
  applyWhiteBackground(w);
  const t = w.addText("Error");
  t.font = Font.boldSystemFont(14);
  t.textColor = hex("c0392b");
  w.addSpacer(4);
  const m = w.addText(String(message));
  m.font = Font.systemFont(10);
  m.textColor = COLOR_BODY;
  return w;
}

let widget;
try {
  const data = await fetchData();
  if (data && data.error) {
    widget = errorWidget(data.error);
  } else {
    widget = buildWidget(data);
  }
} catch (e) {
  widget = errorWidget(e.message || e);
}

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentLarge();
}
Script.complete();
