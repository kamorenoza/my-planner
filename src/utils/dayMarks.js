// Shared helpers to render reminder/event indicator dots in calendar grids.
import {
  load,
  eventsKey,
  remindersKey,
  dateKeyFromParts,
} from "../database/localStore";
import { getEventType } from "./events";
import { isHolidayReminder } from "./holidaysCO";

// Soft blue marker for days that have reminders.
export const REMINDER_DOT = "#5A97D8";

// Size (px) of a single dot and of each stripe segment in a multi-mark line.
export const MARK_SIZE = 5;
export const LINE_HEIGHT = 4;

// Collect the indicator colors for a day: blue for reminders plus each
// distinct event-type color (using the strong text color).
export function getDayMarks(year, month, day) {
  const dk = dateKeyFromParts(year, month, day);
  const reminders = load(remindersKey(dk), []).filter(
    (r) => !r.date || r.date === dk,
  );
  const events = load(eventsKey(dk), []).filter(
    (e) => !e.date || e.date === dk,
  );

  const colors = [];
  if (reminders.some((r) => !isHolidayReminder(r))) colors.push(REMINDER_DOT);
  events.forEach((e) => {
    const c = getEventType(e.type).text;
    if (!colors.includes(c)) colors.push(c);
  });
  return colors;
}

// Build a striped gradient from the collected mark colors.
export function stripeGradient(colors) {
  const n = colors.length;
  const stops = colors.map((c, i) => {
    const from = ((i / n) * 100).toFixed(2);
    const to = (((i + 1) / n) * 100).toFixed(2);
    return `${c} ${from}% ${to}%`;
  });
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}
