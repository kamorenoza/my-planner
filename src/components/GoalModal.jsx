import { useState } from "react";

export const GOAL_CATEGORIES = [
  {
    id: "personal",
    label: "Personal",
    color: "var(--cat-purple)",
    bg: "var(--cat-purple-bg)",
  },
  { id: "salud", label: "Salud", color: "#3f8f5c", bg: "#e6f3ea" },
  { id: "trabajo", label: "Trabajo", color: "#5a6db0", bg: "#e8ecf8" },
  { id: "finanzas", label: "Finanzas", color: "#c87f1e", bg: "#fbeede" },
  {
    id: "aprendizaje",
    label: "Aprendizaje",
    color: "var(--cat-pink)",
    bg: "var(--cat-pink-bg)",
  },
];

export const categoryById = (id) =>
  GOAL_CATEGORIES.find((c) => c.id === id) || GOAL_CATEGORIES[0];

export function goalProgress(goal) {
  if (!goal.milestones || goal.milestones.length === 0) {
    return goal.done ? 100 : 0;
  }
  const done = goal.milestones.filter((m) => m.done).length;
  return Math.round((done / goal.milestones.length) * 100);
}

const EMPTY = {
  title: "",
  description: "",
  category: "personal",
  targetDate: "",
  milestones: [],
};

export function GoalModal({ goal, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    ...goal,
    milestones: goal ? goal.milestones.map((m) => ({ ...m })) : [],
  }));
  const [newMilestone, setNewMilestone] = useState("");

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const addMilestone = () => {
    const text = newMilestone.trim();
    if (!text) return;
    setForm((prev) => ({
      ...prev,
      milestones: [
        ...prev.milestones,
        { id: `m-${Date.now()}`, text, done: false },
      ],
    }));
    setNewMilestone("");
  };

  const removeMilestone = (id) =>
    setForm((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((m) => m.id !== id),
    }));

  const canSave = form.title.trim();

  const submit = () => {
    if (!canSave) return;
    onSave({
      id: goal?.id || `g-${Date.now()}`,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      targetDate: form.targetDate,
      milestones: form.milestones,
      done: goal?.done || false,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--form" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">{goal ? "Editar meta" : "Nueva meta"}</h2>

        <label className="field">
          <span className="field__label">Título</span>
          <input
            className="field__input"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="¿Qué quieres lograr?"
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field__label">Descripción</span>
          <textarea
            className="field__input field__input--area"
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Detalles o por qué es importante"
          />
        </label>

        <div className="field">
          <span className="field__label">Categoría</span>
          <div className="cat-pills">
            {GOAL_CATEGORIES.map((c) => {
              const active = form.category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`cat-pill${active ? " cat-pill--active" : ""}`}
                  style={{ "--pill-color": c.color, "--pill-bg": c.bg }}
                  onClick={() => set("category", c.id)}
                >
                  <span className="cat-pill__dot" />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="field">
          <span className="field__label">Fecha meta</span>
          <input
            type="date"
            className="field__input"
            value={form.targetDate}
            onChange={(e) => set("targetDate", e.target.value)}
          />
        </label>

        <div className="field">
          <span className="field__label">Hitos / pasos</span>
          {form.milestones.map((m) => (
            <div key={m.id} className="ingredient-row">
              <span className="goal-milestone-text">{m.text}</span>
              <button
                type="button"
                className="ingredient-row__remove"
                onClick={() => removeMilestone(m.id)}
                aria-label="Quitar"
              >
                ×
              </button>
            </div>
          ))}
          <div className="ingredient-row">
            <input
              className="field__input"
              value={newMilestone}
              onChange={(e) => setNewMilestone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addMilestone();
                }
              }}
              placeholder="Agregar hito"
            />
            <button
              type="button"
              className="ingredient-add"
              onClick={addMilestone}
            >
              +
            </button>
          </div>
        </div>

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

export function GoalDetailModal({
  goal,
  onClose,
  onEdit,
  onDelete,
  onToggleMilestone,
  onToggleDone,
}) {
  const cat = categoryById(goal.category);
  const progress = goalProgress(goal);
  const hasMilestones = goal.milestones && goal.milestones.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal--form recipe-detail"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="recipe-detail__actions">
          <button
            className="icon-btn"
            onClick={onEdit}
            aria-label="Editar"
            title="Editar"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          <button
            className="icon-btn icon-btn--danger"
            onClick={onDelete}
            aria-label="Eliminar"
            title="Eliminar"
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>

        <h2 className="modal__title recipe-detail__title">{goal.title}</h2>

        <div className="recipe-detail__tags">
          <span
            className="tag-pill tag-pill--static"
            style={{ color: cat.color, background: cat.bg }}
          >
            {cat.label}
          </span>
          {goal.targetDate && (
            <span className="goal-detail__date">🎯 {goal.targetDate}</span>
          )}
        </div>

        {goal.description && (
          <p className="recipe-detail__preparation">{goal.description}</p>
        )}

        <div className="goal-detail__progress">
          <div className="goal-progress">
            <div
              className="goal-progress__fill"
              style={{ width: `${progress}%`, background: cat.color }}
            />
          </div>
          <span className="goal-detail__progress-label">{progress}%</span>
        </div>

        {hasMilestones ? (
          <div className="recipe-detail__section">
            <h3 className="recipe-detail__heading">Hitos</h3>
            <div className="goal-milestones">
              {goal.milestones.map((m) => (
                <button
                  key={m.id}
                  className="goal-milestone"
                  onClick={() => onToggleMilestone(m.id)}
                >
                  <span
                    className={`goal-milestone__check${
                      m.done ? " goal-milestone__check--on" : ""
                    }`}
                    style={
                      m.done
                        ? { background: cat.color, borderColor: cat.color }
                        : undefined
                    }
                  >
                    {m.done ? "✓" : ""}
                  </span>
                  <span
                    className={`goal-milestone__label${
                      m.done ? " goal-milestone__label--done" : ""
                    }`}
                  >
                    {m.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <button
            className={`goal-done-toggle${goal.done ? " goal-done-toggle--on" : ""}`}
            onClick={onToggleDone}
          >
            {goal.done ? "✓ Completada" : "Marcar como completada"}
          </button>
        )}
      </div>
    </div>
  );
}
