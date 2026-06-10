// Schedule runs from 6:00 (360 min) to 22:00 (1320 min)
export const DAY_START_MIN = 6 * 60;
export const DAY_END_MIN = 22 * 60;

export const EVENT_TYPES = [
  {
    id: "personal",
    label: "Personal",
    color: "var(--cat-pink-soft)",
    text: "var(--cat-pink-text)",
  },
  { id: "trabajo", label: "Trabajo", color: "#C9E8D8", text: "#3F7D62" },
  {
    id: "citas",
    label: "Citas",
    color: "var(--cat-purple-soft)",
    text: "var(--cat-purple-text)",
  },
  { id: "otros", label: "Otros", color: "#FCE0C4", text: "#B5773A" },
];

export function getEventType(id) {
  return EVENT_TYPES.find((t) => t.id === id) || EVENT_TYPES[0];
}

// Build 30-minute time options from 6:00am to 10:00pm
export function getTimeOptions() {
  const options = [];
  for (let min = DAY_START_MIN; min <= DAY_END_MIN; min += 30) {
    options.push({ value: min, label: formatTime(min) });
  }
  return options;
}

export function formatTime(min) {
  const hour = Math.floor(min / 60);
  const minutes = min % 60;
  const period = hour < 12 ? "am" : "pm";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${String(minutes).padStart(2, "0")} ${period}`;
}

// ---------------------------------------------------------------------------
// Recurrence (repeat) support – iOS-style options
// ---------------------------------------------------------------------------

export const REPEAT_OPTIONS = [
  { id: "none", label: "Nunca" },
  { id: "daily", label: "Cada día" },
  { id: "weekly", label: "Cada semana" },
  { id: "biweekly", label: "Cada 2 semanas" },
  { id: "monthly", label: "Cada mes" },
  { id: "yearly", label: "Cada año" },
  { id: "custom", label: "Personalizado" },
];

// Weekday letters starting Monday (ISO order: Mon=0 ... Sun=6)
export const WEEKDAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

// ISO weekday (Mon=0 ... Sun=6) for a YYYY-MM-DD key
export function isoWeekday(dk) {
  const [y, m, d] = dk.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function getRepeatLabel(id) {
  return (REPEAT_OPTIONS.find((o) => o.id === id) || REPEAT_OPTIONS[0]).label;
}

// How many occurrences to materialize per frequency (keeps storage bounded
// while covering a generous horizon).
const OCCURRENCE_LIMIT = {
  daily: 180,
  weekly: 78,
  biweekly: 39,
  monthly: 24,
  yearly: 5,
};

// Days to scan ahead when materializing a custom weekday-based repeat.
const CUSTOM_SCAN_DAYS = 540;

const pad = (n) => String(n).padStart(2, "0");

function parseKey(dk) {
  const [y, m, d] = dk.split("-").map(Number);
  return { y, m: m - 1, d };
}

function shiftDays(y, m, d, days) {
  const dt = new Date(Date.UTC(y, m, d + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function shiftMonths(y, m, d, months) {
  const total = m + months;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  const nd = Math.min(d, lastDay);
  return `${ny}-${pad(nm + 1)}-${pad(nd)}`;
}

// Return the date keys (YYYY-MM-DD) for every occurrence of a series anchored
// at `anchorKey`, including the anchor itself. If `until` (YYYY-MM-DD) is set,
// occurrences after that date are excluded. For `custom`, `weekdays` is an
// array of ISO weekday indices (Mon=0 ... Sun=6) that the event repeats on.
export function generateOccurrenceDates(anchorKey, repeat, until, weekdays) {
  const { y, m, d } = parseKey(anchorKey);

  if (repeat === "custom") {
    const set = Array.isArray(weekdays) ? weekdays : [];
    if (set.length === 0) return [anchorKey];
    const dates = [];
    for (let i = 0; i < CUSTOM_SCAN_DAYS; i += 1) {
      const dk = shiftDays(y, m, d, i);
      if (until && dk > until) break;
      if (set.includes(isoWeekday(dk))) dates.push(dk);
    }
    return dates.length ? dates : [anchorKey];
  }

  const limit = OCCURRENCE_LIMIT[repeat];
  if (!limit) return [anchorKey];
  const dates = [];
  for (let i = 0; i < limit; i += 1) {
    let dk;
    if (repeat === "daily") dk = shiftDays(y, m, d, i);
    else if (repeat === "weekly") dk = shiftDays(y, m, d, i * 7);
    else if (repeat === "biweekly") dk = shiftDays(y, m, d, i * 14);
    else if (repeat === "monthly") dk = shiftMonths(y, m, d, i);
    else if (repeat === "yearly") dk = shiftMonths(y, m, d, i * 12);
    if (until && dk > until) break;
    dates.push(dk);
  }
  return dates;
}
