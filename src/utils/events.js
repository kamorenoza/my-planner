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
  { id: "trabajo", label: "Trabajo", color: "#c9e8d8", text: "#3f7d62" },
  {
    id: "citas",
    label: "Citas",
    color: "var(--cat-purple-soft)",
    text: "var(--cat-purple-text)",
  },
  { id: "otros", label: "Otros", color: "#fce0c4", text: "#b5773a" },
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
