export const MONTHS = [
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

export const MONTHS_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

// Formatea una clave de fecha "YYYY-MM-DD" a "01 Jun 2026".
export function formatFullDate(dk) {
  if (!dk) return "";
  const [y, m, d] = String(dk).split("-").map(Number);
  if (!y || !m || !d) return dk;
  return `${String(d).padStart(2, "0")} ${MONTHS_SHORT[m - 1]} ${y}`;
}

export const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

export const WEEKDAYS_FULL = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export function getMonthDays(year, month) {
  const firstDay = new Date(year, month, 1);
  // getDay: 0=Sunday..6=Saturday -> convert to Monday-first (0=Monday)
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export function getISOWeek(year, month, day) {
  const date = new Date(Date.UTC(year, month, day));
  // Thursday of the current ISO week determines the week number
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = date.getTime();
  date.setUTCMonth(0, 4);
  const jan4DayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - jan4DayNum + 3);
  return 1 + Math.round((firstThursday - date.getTime()) / 604800000);
}

export function getMonthWeeks(year, month) {
  const cells = getMonthDays(year, month);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    const days = cells.slice(i, i + 7);
    const firstDay = days.find((d) => d !== null);
    weeks.push({
      weekNumber: getISOWeek(year, month, firstDay),
      days,
    });
  }
  return weeks;
}

// Returns the Monday Date of a given ISO week in a year
export function getDateOfISOWeek(year, week) {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getUTCDay();
  const monday = new Date(simple);
  // ISO: week 1 contains the first Thursday; adjust to that week's Monday
  if (dayOfWeek <= 4) {
    monday.setUTCDate(
      simple.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1),
    );
  } else {
    monday.setUTCDate(simple.getUTCDate() + (8 - dayOfWeek));
  }
  return monday;
}

// Returns the 7 Date objects (Mon..Sun) for a given ISO week
export function getWeekDates(year, week) {
  const monday = getDateOfISOWeek(year, week);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    dates.push(d);
  }
  return dates;
}

// Año mínimo disponible en la app (la primera agenda creada por defecto en el
// Dashboard).
export const MIN_YEAR = 2026;

// Año máximo disponible para navegar. Replica la regla del Dashboard: la agenda
// del año X se desbloquea el 1 de diciembre del año X-1.
export function getMaxYear() {
  const now = new Date();
  const y = now.getFullYear();
  // El año y+1 se desbloquea el 1 de diciembre del año y.
  const unlock = new Date(y, 11, 1);
  return now >= unlock ? y + 1 : y;
}

// ¿La agenda de este año ya existe y por tanto se puede visitar? Se usa para
// evitar que las flechas de navegación salten a un año que aún no se ha creado.
export function isYearAvailable(year) {
  return year >= MIN_YEAR && year <= getMaxYear();
}

// Última semana ISO del año (basada en el 28 de diciembre, que siempre cae en
// la última semana ISO).
export function getLastISOWeek(year) {
  return getISOWeek(year, 11, 28);
}