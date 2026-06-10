// Colombian public holidays, computed locally (no network needed).
//
// Three groups:
//  - Fixed dates that never move.
//  - "Ley Emiliani" holidays that move to the following Monday.
//  - Easter-relative holidays (via the Computus algorithm); the movable ones
//    are also shifted to Monday.
//
// Holidays are materialised as special reminders ({ holiday: true }) so they
// reuse all the existing reminder rendering across the Month / Week / Day views.

import { load, save, remindersKey, dateKeyFromParts } from "./storage";

export const HOLIDAY_EMOJI = { char: ":tada:", code: "1f389" };

// Anonymous Gregorian algorithm – returns the Date (UTC) of Easter Sunday.
function easterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const addDays = (date, n) => {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
};

// Move a date to the following Monday (Ley Emiliani). Stays if already Monday.
function nextMonday(date) {
  const d = new Date(date);
  const dow = d.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  d.setUTCDate(d.getUTCDate() + ((1 - dow + 7) % 7));
  return d;
}

const fmt = (date) =>
  dateKeyFromParts(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );

// Fixed holidays: [month (0-based), day, name]
const FIXED = [
  [0, 1, "Año Nuevo"],
  [4, 1, "Día del Trabajo"],
  [6, 20, "Día de la Independencia"],
  [7, 7, "Batalla de Boyacá"],
  [11, 8, "Inmaculada Concepción"],
  [11, 25, "Navidad"],
];

// Ley Emiliani holidays (move to Monday): [month, day, name]
const EMILIANI = [
  [0, 6, "Reyes Magos"],
  [2, 19, "San José"],
  [5, 29, "San Pedro y San Pablo"],
  [7, 15, "Asunción de la Virgen"],
  [9, 12, "Día de la Raza"],
  [10, 1, "Todos los Santos"],
  [10, 11, "Independencia de Cartagena"],
];

// Returns [{ date: 'YYYY-MM-DD', name }] for the given year, sorted by date.
export function getColombianHolidays(year) {
  const list = [];

  FIXED.forEach(([month, day, name]) => {
    list.push({ date: fmt(new Date(Date.UTC(year, month, day))), name });
  });

  EMILIANI.forEach(([month, day, name]) => {
    list.push({
      date: fmt(nextMonday(new Date(Date.UTC(year, month, day)))),
      name,
    });
  });

  const easter = easterSunday(year);
  list.push({ date: fmt(addDays(easter, -3)), name: "Jueves Santo" });
  list.push({ date: fmt(addDays(easter, -2)), name: "Viernes Santo" });
  list.push({
    date: fmt(nextMonday(addDays(easter, 39))),
    name: "Ascensión del Señor",
  });
  list.push({
    date: fmt(nextMonday(addDays(easter, 60))),
    name: "Corpus Christi",
  });
  list.push({
    date: fmt(nextMonday(addDays(easter, 68))),
    name: "Sagrado Corazón",
  });

  return list.sort((a, b) => a.date.localeCompare(b.date));
}

export function isHolidayReminder(reminder) {
  return Boolean(reminder && reminder.holiday);
}

// True when the given day already has a holiday reminder stored.
export function dayHasHoliday(year, month, day) {
  const dk = dateKeyFromParts(year, month, day);
  return load(remindersKey(dk), []).some(isHolidayReminder);
}

// Insert the holiday reminders for a year. Idempotent: holiday reminders use a
// deterministic id (`hol-<date>`) so re-seeding never creates duplicates and
// never touches reminders the user added or removed.
export function seedHolidays(year) {
  getColombianHolidays(year).forEach(({ date, name }) => {
    const key = remindersKey(date);
    const list = load(key, []);
    const id = `hol-${date}`;
    if (!list.some((r) => r.id === id)) {
      save(key, [
        ...list,
        {
          id,
          text: name,
          emoji: HOLIDAY_EMOJI.char,
          emojiCode: HOLIDAY_EMOJI.code,
          date,
          holiday: true,
        },
      ]);
    }
  });
}
