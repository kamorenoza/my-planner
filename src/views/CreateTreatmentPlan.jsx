

import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePersistedState } from "../utils/storage";
import Breadcrumbs from "../components/Breadcrumbs";
import EmojiImg from "../components/EmojiImg";
import DateField from "../components/DateField";
import {
  medPlansKey,
  PLAN_COLORS,
  PLAN_ICONS,
  DURATION_OPTIONS,
  todayISO,
  addDaysISO,
  daysBetween,
  newId,
} from "../utils/medications";
import "./CreateTreatmentPlan.css";

function CreateTreatmentPlan() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [plans, setPlans] = usePersistedState(medPlansKey(), []);
  const editing = useMemo(
    () => (id ? plans.find((p) => p.id === id) : null),
    [id, plans],
  );

  const [form, setForm] = useState(() => {
    if (editing) {
      const dur = editing.endDate
        ? daysBetween(editing.startDate, editing.endDate)
        : null;
      return {
        name: editing.name || "",
        description: editing.description || "",
        color: editing.color || PLAN_COLORS[0].id,
        icon: editing.icon || PLAN_ICONS[0].char,
        startDate: editing.startDate || todayISO(),
        duration: !editing.endDate
          ? "none"
          : DURATION_OPTIONS.includes(dur)
          ? dur
          : "custom",
        endDate: editing.endDate || "",
      };
    }
    const start = todayISO();
    return {
      name: "",
      description: "",
      color: PLAN_COLORS[0].id,
      icon: PLAN_ICONS[0].char,
      startDate: start,
      duration: 7,
      endDate: addDaysISO(start, 7),
    };
  });

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const setDuration = (days) => {
    setForm((prev) => {
      if (days === "none") return { ...prev, duration: "none", endDate: "" };
      if (days === "custom") return { ...prev, duration: "custom" };
      return {
        ...prev,
        duration: days,
        endDate: addDaysISO(prev.startDate, days),
      };
    });
  };

  const setStartDate = (value) => {
    setForm((prev) => ({
      ...prev,
      startDate: value,
      endDate:
        prev.duration === "custom" || prev.duration === "none"
          ? prev.endDate
          : addDaysISO(value, prev.duration),
    }));
  };

  const nameOk = form.name.trim().length > 0;
  // La fecha de fin es opcional (vacía = sin fin). Si existe, debe ser
  // posterior a la de inicio.
  const datesOk =
    form.startDate && (!form.endDate || form.endDate > form.startDate);
  const canSave = nameOk && datesOk;

  const submit = () => {
    if (!canSave) return;
    const now = new Date().toISOString().slice(0, 16);
    if (editing) {
      const planId = editing.id;
      setPlans((prev) =>
        prev.map((p) =>
          p.id === planId
            ? {
                ...p,
                name: form.name.trim(),
                description: form.description.trim(),
                color: form.color,
                icon: form.icon,
                startDate: form.startDate,
                endDate: form.endDate,
                updatedAt: now,
              }
            : p,
        ),
      );
      navigate(`/medications/${planId}`);
      return;
    }
    const planId = newId("plan");
    setPlans((prev) => [
      ...prev,
      {
        id: planId,
        name: form.name.trim(),
        description: form.description.trim(),
        color: form.color,
        icon: form.icon,
        startDate: form.startDate,
        endDate: form.endDate,
        medications: [],
        createdAt: now,
        updatedAt: now,
      },
    ]);
    navigate(`/medications/${planId}`);
  };

  return (
    <div className="page page--scroll create-plan">
      <div className="create-plan__topbar">
        <button
          className="create-plan__back"
          onClick={() => navigate("/medications")}
          aria-label="Volver"
        >
          {"\u2039"}
        </button>
        <div className="create-plan__heading">
          <h1 className="page__title create-plan__title">
            {editing
              ? "Editar plan de tratamiento"
              : "Nuevo plan de tratamiento"}
          </h1>
          <Breadcrumbs
            items={[
              { label: "Medicamentos", to: "/medications" },
              { label: editing ? "Editar plan" : "Nuevo plan" },
            ]}
          />
        </div>
      </div>

      <section className="create-plan__section">
        <h2 className="create-plan__section-title">Información general</h2>

        <label className="field">
          <span className="field__label">Nombre del tratamiento *</span>
          <input
            className="field__input"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Ej. Antibiótico — infección"
          />
        </label>

        <label className="field">
          <span className="field__label">Descripción</span>
          <textarea
            className="field__input field__input--area"
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Indicaciones del médico, motivo, etc."
          />
        </label>

        <div className="field">
          <span className="field__label">Color</span>
          <div className="create-plan__colors">
            {PLAN_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`create-plan__color${
                  form.color === c.id ? " create-plan__color--active" : ""
                }`}
                style={{ background: c.color }}
                onClick={() => set("color", c.id)}
                aria-label={`Color ${c.id}`}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field__label">Icono</span>
          <div className="create-plan__icons">
            {PLAN_ICONS.map((ic) => (
              <button
                key={ic.char}
                type="button"
                className={`create-plan__icon${
                  form.icon === ic.char ? " create-plan__icon--active" : ""
                }`}
                onClick={() => set("icon", ic.char)}
                aria-label="Icono"
              >
                <EmojiImg
                  emoji={ic.char}
                  code={ic.code}
                  className="create-plan__icon-img"
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="create-plan__section">
        <h2 className="create-plan__section-title">Duración</h2>

        <label className="field">
          <span className="field__label">Fecha de inicio *</span>
          <DateField
            value={form.startDate}
            onChange={setStartDate}
            placeholder="Selecciona fecha"
          />
        </label>

        <div className="field">
          <span className="field__label">Duración rápida</span>
          <div className="create-plan__durations">
            {DURATION_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={`create-plan__duration${
                  form.duration === d ? " create-plan__duration--active" : ""
                }`}
                onClick={() => setDuration(d)}
              >
                {d} días
              </button>
            ))}
            <button
              type="button"
              className={`create-plan__duration${
                form.duration === "custom"
                  ? " create-plan__duration--active"
                  : ""
              }`}
              onClick={() => setDuration("custom")}
            >
              Personalizada
            </button>
            <button
              type="button"
              className={`create-plan__duration${
                form.duration === "none"
                  ? " create-plan__duration--active"
                  : ""
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
            placeholder="Sin fin"
          />
        </label>

        {!datesOk && (
          <p className="create-plan__error">
            La fecha de fin debe ser posterior a la de inicio.
          </p>
        )}
      </section>

      <div className="create-plan__actions">
        <button
          className="modal__btn modal__btn--cancel"
          onClick={() => navigate("/medications")}
        >
          Cancelar
        </button>
        <button
          className="modal__btn modal__btn--primary"
          onClick={submit}
          disabled={!canSave}
        >
          {editing ? "Guardar cambios" : "Crear plan"}
        </button>
      </div>
    </div>
  );
}

export default CreateTreatmentPlan;