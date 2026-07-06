// Dominio del módulo de medicación. Funciones puras: estados, progreso,
// días restantes y cálculo de horarios de dosis. Sin acceso a localStorage
// (eso lo manejan las vistas con usePersistedState) ni a la nube.

import { medPlansKey, medHistoryKey } from "../database/localStore";

// Reexportadas para que las vistas importen todo desde un único módulo.
export { medPlansKey, medHistoryKey };

// ─── Constantes de UI ────────────────────────────────────────

// Colores de plan (themeables): reutilizan variables del sistema de temas para
// que el tema "Azul" no se rompa.
export const PLAN_COLORS = [
  { id: "purple", color: "var(--cat-purple)", bg: "var(--cat-purple-bg)" },
  { id: "pink", color: "var(--cat-pink)", bg: "var(--cat-pink-bg)" },
  { id: "green", color: "var(--color-accent-green)", bg: "var(--color-accent-green-light)" },
  { id: "orange", color: "var(--color-accent-orange)", bg: "var(--color-accent-orange-light)" },
  { id: "blue", color: "var(--accent-blue)", bg: "var(--accent-blue-bg)" },
  { id: "red", color: "var(--color-accent-red)", bg: "var(--color-accent-red-light)" },
];

export const colorById = (id) =>
  PLAN_COLORS.find((c) => c.id === id) || PLAN_COLORS[0];

// Iconos de plan (emojis Apple vía EmojiImg).
export const PLAN_ICONS = [
  { char: ":pill:", code: "1f48a" },
  { char: ":syringe:", code: "1f489" },
  { char: ":hospital:", code: "1f3e5" },
  { char: ":heart:", code: "2764-fe0f" },
  { char: ":stethoscope:", code: "1fa7a" },
  { char: ":thermometer:", code: "1f321-fe0f" },
  { char: ":herb:", code: "1f33f" },
  { char: ":drop:", code: "1f4a7" },
];

export const iconByChar = (char) =>
  PLAN_ICONS.find((i) => i.char === char) || PLAN_ICONS[0];

// Unidades de dosis.
export const MED_UNITS = [
  "tableta",
  "cápsula",
  "ml",
  "gotas",
  "mg",
  "sobre",
  "inyección",
  "aplicación",
];

// Frecuencias predefinidas. `hours` define el intervalo en horas para derivar
// los horarios de dosis a partir de la hora de inicio. `weekly` marca una toma
// semanal. `custom` deja que el usuario configure el patrón a mano.
export const FREQUENCIES = [
  { id: "every_4h", label: "Cada 4 horas", hours: 4 },
  { id: "every_6h", label: "Cada 6 horas", hours: 6 },
  { id: "every_8h", label: "Cada 8 horas", hours: 8 },
  { id: "every_12h", label: "Cada 12 horas", hours: 12 },
  { id: "every_24h", label: "Cada 24 horas", hours: 24 },
  { id: "twice", label: "Dos veces al día", hours: 12 },
  { id: "three", label: "Tres veces al día", hours: 8 },
  { id: "weekly", label: "Semanal", hours: 24, weekly: true },
  { id: "custom", label: "Personalizada", custom: true },
];

export const frequencyById = (id) =>
  FREQUENCIES.find((f) => f.id === id) || FREQUENCIES[0];

export const frequencyLabel = (id) => frequencyById(id).label;

// Opciones rápidas de duración (días).
export const DURATION_OPTIONS = [7, 10, 14, 21, 30];

// Estados.
export const PLAN_STATUS = {
  upcoming: { id: "upcoming", label: "Próximo", badge: "badge--orange" },
  active: { id: "active", label: "Activo", badge: "badge--green" },
  completed: { id: "completed", label: "Completado", badge: "badge--primary" },
};

export const MED_STATUS = {
  active: { id: "active", label: "Activo" },
  paused: { id: "paused", label: "En pausa" },
  completed: { id: "completed", label: "Terminado" },
};

// ─── Helpers de fecha (en hora local, sin UTC) ───────────────

const pad = (n) => String(n).padStart(2, "0");

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseISO(dateStr) {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// Suma `days` a una fecha YYYY-MM-DD y devuelve YYYY-MM-DD.
export function addDaysISO(dateStr, days) {
  const d = parseISO(dateStr);
  if (!d) return dateStr;
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Días entre dos fechas YYYY-MM-DD (b - a), redondeando a días completos.
export function daysBetween(a, b) {
  const da = parseISO(a);
  const db = parseISO(b);
  if (!da || !db) return 0;
  return Math.round((db - da) / 86400000);
}

export function formatDateLabel(dateStr) {
  const d = parseISO(dateStr);
  if (!d) return "";
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Estado y progreso del plan ──────────────────────────────

export function planStatus(plan, today = todayISO()) {
  if (!plan?.startDate) return "active";
  if (today < plan.startDate) return "upcoming";
  if (plan.endDate && today > plan.endDate) return "completed";
  return "active";
}

export function planStatusInfo(plan, today) {
  return PLAN_STATUS[planStatus(plan, today)] || PLAN_STATUS.active;
}

// Progreso 0-100 según los días transcurridos del plan.
export function planProgress(plan, today = todayISO()) {
  if (!plan?.startDate || !plan?.endDate) return 0;
  const total = daysBetween(plan.startDate, plan.endDate);
  if (total <= 0) return today >= plan.startDate ? 100 : 0;
  const elapsed = daysBetween(plan.startDate, today);
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
}

// Días restantes hasta endDate (0 si ya terminó).
export function remainingDays(plan, today = todayISO()) {
  if (!plan?.endDate) return 0;
  return Math.max(0, daysBetween(today, plan.endDate));
}

// Progreso por dosis: dosis tomadas / dosis esperadas en todo el plan.
// Avanza a medida que se marcan dosis como tomadas.
export function planDoseProgress(plan, meds = [], history = {}) {
  if (!plan?.startDate || !plan?.endDate) return 0;
  const days = Math.max(1, daysBetween(plan.startDate, plan.endDate));
  let expected = 0;
  meds.forEach((med) => {
    const perDay = computeDoseTimes(med).length;
    if (!perDay) return;
    const freq = frequencyById(med.frequency);
    const activeDays = freq.weekly ? days / 7 : days;
    expected += perDay * activeDays;
  });
  if (expected <= 0) return 0;
  let taken = 0;
  meds.forEach((med) => {
    (history[med.id] || []).forEach((e) => {
      if (e.status === "Taken") taken += 1;
    });
  });
  return Math.max(0, Math.min(100, Math.round((taken / expected) * 100)));
}

export function medStatus(med, plan, history = {}, today = todayISO()) {
  if (med?.status === "paused") return "paused";
  // Si ya se tomaron todas las dosis previstas, el medicamento terminó.
  const total = medTotalDoses(med);
  if (total > 0) {
    const taken = (history?.[med?.id] || []).filter(
      (e) => e.status === "Taken"
    ).length;
    if (taken >= total) return "completed";
  }
  // Si el medicamento tiene su propia fecha de fin y ya pasó, está terminado.
  if (med?.endDate && today > med.endDate) return "completed";
  const st = planStatus(plan, today);
  if (st === "completed") return "completed";
  return "active";
}

// Número total de dosis previstas de un medicamento en todo su rango de fechas.
// El rango es inclusivo: del 29 al 30 son 2 días, así que cada 24 h = 2 dosis.
export function medTotalDoses(med) {
  if (!med?.startDate || !med?.endDate) return 0;
  const perDay = computeDoseTimes(med).length;
  if (!perDay) return 0;
  const days = Math.max(1, daysBetween(med.startDate, med.endDate) + 1);
  const freq = frequencyById(med.frequency);
  const activeDays = freq.weekly ? days / 7 : days;
  return Math.round(perDay * activeDays);
}

export function isPlanReadOnly(plan, today = todayISO()) {
  return planStatus(plan, today) === "completed";
}

// ¿El medicamento está vigente (debe producir dosis) en un día dado?
// Considera la pausa y su propio rango de fechas, con respaldo en las fechas
// del plan. Un medicamento con endDate ya pasada no genera dosis (no aparece en
// el planner diario, ni en "Próximas dosis", ni en las notificaciones/widget).
export function isMedActiveOn(med, plan, day = todayISO()) {
  if (!med || med.status === "paused") return false;
  const start = med.startDate || plan?.startDate;
  const end = med.endDate || plan?.endDate;
  if (start && day < start) return false;
  if (end && day > end) return false;
  return true;
}

// ─── Cálculo de horarios de dosis ────────────────────────────

function timeToMin(time) {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minToTime(min) {
  const m = ((min % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

// Devuelve los horarios de dosis de un día como array ["HH:MM", ...] ordenado.
export function computeDoseTimes(med) {
  if (!med) return [];
  const start = med.startTime || "08:00";

  if (med.frequency === "custom") {
    const rule = med.repeat || {};
    if (rule.mode === "times" && Array.isArray(rule.times)) {
      return [...rule.times].filter(Boolean).sort();
    }
    if (rule.mode === "interval") {
      const interval = Number(rule.interval) || 1;
      const unit = rule.intervalUnit || "hours";
      if (unit === "days") return [start];
      const step = unit === "minutes" ? interval : interval * 60;
      if (step <= 0) return [start];
      const out = [];
      for (let min = timeToMin(start); min < 1440; min += step) {
        out.push(minToTime(min));
      }
      return out.length ? out : [start];
    }
    return [start];
  }

  const freq = frequencyById(med.frequency);
  if (freq.weekly) return [start];
  const step = (freq.hours || 24) * 60;
  const out = [];
  for (let min = timeToMin(start); min < 1440; min += step) {
    out.push(minToTime(min));
  }
  return out.length ? out : [start];
}

// Etiqueta del próximo recordatorio (hoy si queda alguna dosis, si no mañana).
export function nextReminderLabel(med, now = new Date()) {
  const times = computeDoseTimes(med);
  if (times.length === 0) return "—";
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const next = times.find((t) => timeToMin(t) >= nowMin);
  return next ? `Hoy ${next}` : `Mañana ${times[0]}`;
}

// ─── Historial de dosis ──────────────────────────────────────
// Modelo: { [medId]: [ { id, scheduledTime, completedTime, status } ] }
// scheduledTime / completedTime son ISO "YYYY-MM-DDTHH:MM".

export function lastTaken(history, medId) {
  const entries = (history && history[medId]) || [];
  const taken = entries
    .filter((e) => e.status === "Taken" && e.completedTime)
    .sort((a, b) => (a.completedTime < b.completedTime ? 1 : -1));
  return taken[0]?.completedTime || null;
}

export function formatDateTimeLabel(iso) {
  if (!iso) return "—";
  const [date, time] = iso.split("T");
  const hhmm = time ? time.slice(0, 5) : "";
  return `${formatDateLabel(date)} ${hhmm}`.trim();
}

export const newId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;