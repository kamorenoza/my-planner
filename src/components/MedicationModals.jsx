

import { useState } from "react";
import DateField from "./DateField";
import {
  MED_UNITS,
  FREQUENCIES,
  DURATION_OPTIONS,
  frequencyById,
  computeDoseTimes,
  addDaysISO,
  daysBetween,
  todayISO,
  newId,
} from "../utils/medications";

const EMPTY = {
  name: "",
  dose: "",
  unit: MED_UNITS[0],
  frequency: "every_8h",
  startTime: "08:00",
  repeat: { mode: "interval", interval: 8, intervalUnit: "hours", times: [] },
  takeWithFood: false,
  notes: "",
  status: "active",
};

// Modal Agregar / Editar Medicación (misma UI; los campos se prellenan al
// editar). Reutiliza las clases compartidas .modal--form / .field / .modal__btn.
export function MedicationModal({ med, planStart, planEnd, onClose, onSave }) {
  const [form, setForm] = useState(() => {
    const base =
      planStart && planStart > todayISO() ? planStart : todayISO();
    const startDate = med?.startDate || base;
    // Un medicamento existente puede ser "sin fin" (endDate vacía).
    const endDate = med ? med.endDate || "" : addDaysISO(startDate, 7);
    const dur = endDate ? daysBetween(startDate, endDate) : null;
    return {
      ...EMPTY,
      ...med,
      repeat: { ...EMPTY.repeat, ...(med?.repeat || {}) },
      startDate,
      endDate,
      duration: !endDate
        ? "none"
        : DURATION_OPTIONS.includes(dur)
        ? dur
        : "custom",
    };
  });
  const [newTime, setNewTime] = useState("");

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setRepeat = (key, value) =>
    setForm((prev) => ({ ...prev, repeat: { ...prev.repeat, [key]: value } }));

  // La fecha de fin del medicamento no puede superar la del plan.
  const clampEnd = (end) =>
    planEnd && end && end > planEnd ? planEnd : end;

  const setDuration = (days) =>
    setForm((prev) => {
      if (days === "none") return { ...prev, duration: "none", endDate: "" };
      if (days === "custom") return { ...prev, duration: "custom" };
      return {
        ...prev,
        duration: days,
        endDate: clampEnd(addDaysISO(prev.startDate, days)),
      };
    });

  const setStartDate = (value) =>
    setForm((prev) => ({
      ...prev,
      startDate: value,
      endDate:
        prev.duration === "custom" || prev.duration === "none"
          ? prev.endDate
          : clampEnd(addDaysISO(value, prev.duration)),
    }));

  const isCustom = form.frequency === "custom";
  const startOk = !planStart || form.startDate >= planStart;
  // La fecha de fin es opcional (vacía = sin fin). Si existe, debe ser
  // posterior al inicio y no superar el fin del plan.
  const endOk =
    !form.endDate ||
    (form.endDate > form.startDate && (!planEnd || form.endDate <= planEnd));
  const datesOk = form.startDate && startOk && endOk;
  const canSave = form.name.trim() && String(form.dose).trim() && datesOk;

  const addTime = () => {
    const t = newTime.trim();
    if (!t) return;
    setForm((prev) => ({
      ...prev,
      repeat: {
        ...prev.repeat,
        times: [...(prev.repeat.times || []), t].sort(),
      },
    }));
    setNewTime("");
  };

  const removeTime = (i) =>
    setForm((prev) => ({
      ...prev,
      repeat: {
        ...prev.repeat,
        times: prev.repeat.times.filter((_, idx) => idx !== i),
      },
    }));

  const submit = () => {
    if (!canSave) return;
    const now = new Date().toISOString().slice(0, 16);
    onSave({
      id: med?.id || newId("med"),
      name: form.name.trim(),
      dose: String(form.dose).trim(),
      unit: form.unit,
      frequency: form.frequency,
      startTime: form.startTime,
      startDate: form.startDate,
      endDate: form.endDate,
      repeat: form.repeat,
      takeWithFood: form.takeWithFood,
      notes: form.notes.trim(),
      status: form.status || "active",
      createdAt: med?.createdAt || now,
      updatedAt: now,
    });
  };

  const previewTimes = computeDoseTimes(form);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--form" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">
          {med ? "Editar medicación" : "Agregar medicación"}
        </h2>

        <label className="field">
          <span className="field__label">Nombre del medicamento *</span>
          <input
            className="field__input"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ej. Ibuprofeno"
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span className="field__label">Dosis *</span>
            <input
              className="field__input"
              value={form.dose}
              onChange={(e) => set("dose", e.target.value)}
              placeholder="Ej. 400"
            />
          </label>
          <label className="field">
            <span className="field__label">Unidad</span>
            <select
              className="field__input"
              value={form.unit}
              onChange={(e) => set("unit", e.target.value)}
            >
              {MED_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="field">
          <span className="field__label">Frecuencia</span>
          <select
            className="field__input"
            value={form.frequency}
            onChange={(e) => {
              const freq = frequencyById(e.target.value);
              set("frequency", freq.id);
              if (!freq.custom && freq.hours) {
                setRepeat("mode", "interval");
                setRepeat("interval", freq.hours);
                setRepeat("intervalUnit", "hours");
              }
            }}
          >
            {FREQUENCIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        {isCustom && (
          <div className="field">
            <span className="field__label">Patrón personalizado</span>
            <div className="med-tabs">
              <button
                type="button"
                className={`med-tab${form.repeat.mode === "interval" ? " med-tab--active" : ""}`}
                onClick={() => setRepeat("mode", "interval")}
              >
                Intervalo
              </button>
              <button
                type="button"
                className={`med-tab${form.repeat.mode === "times" ? " med-tab--active" : ""}`}
                onClick={() => setRepeat("mode", "times")}
              >
                Horas específicas
              </button>
            </div>

            {form.repeat.mode === "interval" ? (
              <div className="field-row">
                <label className="field">
                  <span className="field__label">Repetir cada</span>
                  <input
                    type="number"
                    min="1"
                    className="field__input"
                    value={form.repeat.interval}
                    onChange={(e) => setRepeat("interval", e.target.value)}
                  />
                </label>
                <label className="field">
                  <span className="field__label">Unidad</span>
                  <select
                    className="field__input"
                    value={form.repeat.intervalUnit}
                    onChange={(e) => setRepeat("intervalUnit", e.target.value)}
                  >
                    <option value="minutes">Minutos</option>
                    <option value="hours">Horas</option>
                    <option value="days">Días</option>
                  </select>
                </label>
              </div>
            ) : (
              <div className="field">
                {(form.repeat.times || []).map((t, i) => (
                  <div key={i} className="med-time-row">
                    <span className="med-time-row__label">{t}</span>
                    <button
                      type="button"
                      className="med-time-row__remove"
                      onClick={() => removeTime(i)}
                      aria-label="Quitar hora"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <div className="med-time-row">
                  <input
                    type="time"
                    className="field__input"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                  />
                  <button
                    type="button"
                    className="med-time-row__add"
                    onClick={addTime}
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!(isCustom && form.repeat.mode === "times") && (
          <label className="field">
            <span className="field__label">Hora de inicio</span>
            <input
              type="time"
              className="field__input"
              value={form.startTime}
              onChange={(e) => set("startTime", e.target.value)}
            />
          </label>
        )}

        {previewTimes.length > 0 && (
          <p className="med-preview">
            Dosis del día: {previewTimes.join(" · ")}
          </p>
        )}

        <label className="field">
          <span className="field__label">Fecha de inicio *</span>
          <DateField
            value={form.startDate}
            onChange={setStartDate}
            min={planStart}
            placeholder="Selecciona fecha"
          />
        </label>

        {!startOk && (
          <p className="med-preview med-preview--error">
            La fecha de inicio no puede ser anterior al inicio del plan.
          </p>
        )}

        <div className="field">
          <span className="field__label">Duración rápida</span>
          <div className="med-durations">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={`med-duration${
                  form.duration === d ? " med-duration--active" : ""
                }`}
                onClick={() => setDuration(d)}
              >
                {d} días
              </button>
            ))}
            <button
              type="button"
              className={`med-duration${
                form.duration === "custom" ? " med-duration--active" : ""
              }`}
              onClick={() => setDuration("custom")}
            >
              Personalizada
            </button>
            <button
              type="button"
              className={`med-duration${
                form.duration === "none" ? " med-duration--active" : ""
              }`}
              onClick={() => setDuration("none")}
            >
              Sin fin
            </button>
          </div>
        </div>

        <label className="field">
          <span className="field__label">Fecha de fin</span>
          <DateField
            value={form.endDate}
            onChange={(v) => {
              set("endDate", v);
              set("duration", v ? "custom" : "none");
            }}
            min={form.startDate}
            max={planEnd}
            placeholder="Sin fin"
          />
        </label>

        {!endOk && (
          <p className="med-preview med-preview--error">
            {planEnd && form.endDate > planEnd
              ? "La fecha de fin no puede ser posterior al fin del plan."
              : "La fecha de fin debe ser posterior a la de inicio."}
          </p>
        )}

        <label className="reminder-holiday">
          <input
            type="checkbox"
            checked={form.takeWithFood}
            onChange={(e) => set("takeWithFood", e.target.checked)}
          />
          Tomar con comida
        </label>

        <label className="field">
          <span className="field__label">Notas</span>
          <textarea
            className="field__input field__input--area"
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Indicaciones adicionales"
          />
        </label>

        <div className="modal__actions">
          <button className="modal__btn modal__btn--cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="modal__btn modal__btn--primary"
            onClick={submit}
            disabled={!canSave}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal Marcar Dosis: tomada / saltar / posponer.
export function MarkDoseModal({ med, scheduledTime, onClose, onTaken, onSkip, onSnooze }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">{med.name}</h2>
        <p className="modal__text">
          {med.dose} {med.unit}
          {scheduledTime ? ` · ${scheduledTime}` : ""}
        </p>
        <div className="modal__actions modal__actions--stack">
          <button
            className="modal__btn modal__btn--primary"
            onClick={onTaken}
          >
            Tomada
          </button>
          <button className="modal__btn modal__btn--cancel" onClick={onSnooze}>
            Posponer
          </button>
          <button className="modal__btn modal__btn--cancel" onClick={onSkip}>
            Saltar
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal Registrar/Editar Dosis: estado (tomada/no tomada), fecha y hora.
// Permite crear nuevas tomas o editar/eliminar una existente del histórico.

// "08:00" -> "8:00am", "16:00" -> "4:00pm".
function formatHour12(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m || 0).padStart(2, "0")}${period}`;
}

export function DoseEntryModal({
  med,
  entry,
  defaultDate,
  defaultTime,
  onClose,
  onSave,
  onDelete,
}) {
  const [form, setForm] = useState(() => {
    if (entry) {
      const [date, time] = (entry.scheduledTime || "").split("T");
      return {
        date: date || defaultDate || todayISO(),
        time: time || defaultTime || "08:00",
        status: entry.status === "Taken" ? "Taken" : "Skipped",
      };
    }
    return {
      date: defaultDate || todayISO(),
      time: defaultTime || "08:00",
      status: "Taken",
    };
  });

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // No se puede marcar una dosis cuya fecha y hora sean futuras.
  const now = new Date();
  const nowStr = `${todayISO()}T${String(now.getHours()).padStart(
    2,
    "0"
  )}:${String(now.getMinutes()).padStart(2, "0")}`;
  const isFutureDT = (date, time) => `${date}T${time}` > nowStr;
  const isFuture = isFutureDT(form.date, form.time);
  const setDate = (value) =>
    setForm((prev) => ({
      ...prev,
      date: value,
      status: isFutureDT(value, prev.time) ? "Skipped" : prev.status,
    }));
  const setTime = (value) =>
    setForm((prev) => ({
      ...prev,
      time: value,
      status: isFutureDT(prev.date, value) ? "Skipped" : prev.status,
    }));

  const save = () => {
    const scheduledTime = `${form.date}T${form.time}`;
    const status = isFuture ? "Skipped" : form.status;
    onSave({
      id: entry?.id || newId("dose"),
      scheduledTime,
      completedTime: status === "Taken" ? scheduledTime : null,
      status,
    });
  };

  // Solo las horas de dosis del medicamento (ej.: cada 4 h desde 8:00).
  const doseTimes = computeDoseTimes(med);
  const timeOptions = doseTimes.includes(form.time)
    ? doseTimes
    : [form.time, ...doseTimes].filter(Boolean);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--form" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">
          {entry ? "Editar dosis" : "Registrar dosis"}
        </h2>
        <p className="modal__text">
          {med.name} · {med.dose} {med.unit}
        </p>

        <div className="field">
          <span className="field__label">Estado</span>
          <div className="dose-status">
            <button
              type="button"
              className={`dose-status__btn${
                form.status === "Taken" ? " dose-status__btn--taken" : ""
              }`}
              onClick={() => set("status", "Taken")}
              disabled={isFuture}
            >
              Tomada
            </button>
            <button
              type="button"
              className={`dose-status__btn${
                form.status === "Skipped" ? " dose-status__btn--skipped" : ""
              }`}
              onClick={() => set("status", "Skipped")}
            >
              No tomada
            </button>
          </div>
          {isFuture && (
            <p className="dose-status__hint">
              Aún no puedes registrar una dosis futura.
            </p>
          )}
        </div>

        <div className="field-row">
          <label className="field">
            <span className="field__label">Fecha</span>
            <DateField
              value={form.date}
              onChange={setDate}
              min={med.startDate}
              max={med.endDate}
            />
          </label>
          <label className="field">
            <span className="field__label">Hora</span>
            <select
              className="field__input"
              value={form.time}
              onChange={(e) => setTime(e.target.value)}
            >
              {timeOptions.map((t) => (
                <option key={t} value={t}>
                  {formatHour12(t)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {entry && onDelete && (
          <button
            type="button"
            className="dose-delete-link"
            onClick={() => onDelete(entry.id)}
          >
            Eliminar dosis
          </button>
        )}

        <div className="modal__actions">
          <button className="modal__btn modal__btn--cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="modal__btn modal__btn--primary"
            onClick={save}
            disabled={isFuture}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal Eliminar Plan de Tratamiento: solo el plan o plan + medicaciones.
export function DeleteTreatmentPlanModal({ plan, onClose, onDeletePlanOnly, onDeleteAll }) {
  const medCount = plan.medications?.length || 0;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Eliminar plan de tratamiento</h2>
        <p className="modal__text">
          «{plan.name}» tiene {medCount} medicamento(s). ¿Qué quieres eliminar?
        </p>
        <div className="modal__actions modal__actions--stack">
          <button
            className="modal__btn modal__btn--danger"
            onClick={onDeleteAll}
          >
            Eliminar plan y medicamentos
          </button>
          <button
            className="modal__btn modal__btn--cancel"
            onClick={onDeletePlanOnly}
          >
            Eliminar solo el plan
          </button>
          <button className="modal__btn modal__btn--cancel" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}