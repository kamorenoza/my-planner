import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePersistedState, goalsKey } from "../utils/storage";
import { GoalModal, categoryById, goalProgress } from "../components/GoalModal";
import Breadcrumbs from "../components/Breadcrumbs";
import ConfirmDialog from "../components/ConfirmDialog";
import "./GoalView.css";

function getWeeks(targetDate) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(targetDate + "T00:00:00");
  if (isNaN(end.getTime()) || end <= now) return [];
  const diff = end - now;
  const totalDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));
  const weeks = [];
  for (let i = 0; i < totalWeeks; i++) {
    const start = new Date(now.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const endW = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    if (endW > end) endW.setTime(end.getTime());
    weeks.push({
      index: i,
      label: `Semana ${i + 1}`,
      range: `${formatShort(start)} - ${formatShort(endW)}`,
    });
  }
  return weeks;
}

function formatShort(d) {
  const months = [
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
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

// ─── Plan Modal ─────────────────────────────────────────────

function PlanModal({ plan, onClose, onSave }) {
  const [title, setTitle] = useState(plan?.title || "");
  const [description, setDescription] = useState(plan?.description || "");
  const [links, setLinks] = useState(() =>
    plan?.links ? [...plan.links] : [],
  );
  const [newLink, setNewLink] = useState("");
  const [tasks, setTasks] = useState(() =>
    plan?.tasks ? plan.tasks.map((t) => ({ ...t })) : [],
  );
  const [newTask, setNewTask] = useState("");

  const addLink = () => {
    const t = newLink.trim();
    if (!t) return;
    setLinks((prev) => [...prev, t]);
    setNewLink("");
  };

  const removeLink = (i) =>
    setLinks((prev) => prev.filter((_, idx) => idx !== i));

  const addTask = () => {
    const t = newTask.trim();
    if (!t) return;
    setTasks((prev) => [
      ...prev,
      { id: `tk-${Date.now()}-${prev.length}`, text: t, done: false },
    ]);
    setNewTask("");
  };

  const removeTask = (id) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  const canSave = title.trim();
  const submit = () => {
    if (!canSave) return;
    onSave({
      id: plan?.id || `p-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      links,
      tasks,
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal--form" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">{plan ? "Editar plan" : "Nuevo plan"}</h2>

        <label className="field">
          <span className="field__label">Título</span>
          <input
            className="field__input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="¿Qué hacer esta semana?"
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field__label">Descripción</span>
          <textarea
            className="field__input field__input--area"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles del plan"
          />
        </label>

        <div className="field">
          <span className="field__label">Links útiles</span>
          {links.map((link, i) => (
            <div key={i} className="ingredient-row">
              <span className="goal-milestone-text">{link}</span>
              <button
                type="button"
                className="ingredient-row__remove"
                onClick={() => removeLink(i)}
              >
                ×
              </button>
            </div>
          ))}
          <div className="ingredient-row">
            <input
              className="field__input"
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLink();
                }
              }}
              placeholder="https://..."
            />
            <button type="button" className="subtask-add" onClick={addLink}>
              +
            </button>
          </div>
        </div>

        <div className="field">
          <span className="field__label">Tareas</span>
          {tasks.map((task) => (
            <div key={task.id} className="ingredient-row">
              <span className="goal-milestone-text">{task.text}</span>
              <button
                type="button"
                className="ingredient-row__remove"
                onClick={() => removeTask(task.id)}
              >
                ×
              </button>
            </div>
          ))}
          <div className="ingredient-row">
            <input
              className="field__input"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTask();
                }
              }}
              placeholder="Nueva tarea"
            />
            <button type="button" className="subtask-add" onClick={addTask}>
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

// ─── Plan Semanal Tab ────────────────────────────────────────

function getLinkLabel(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url.length > 25 ? url.slice(0, 25) + "…" : url;
  }
}

function WeekAccordion({ week, plans, onAddPlan, onEditPlan, onDeletePlan }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="week-accordion">
      <button className="week-accordion__header" onClick={() => setOpen(!open)}>
        <span className="week-accordion__arrow">{open ? "▾" : "▸"}</span>
        <span className="week-accordion__label">{week.label}</span>
        <span className="week-accordion__range">{week.range}</span>
        {plans.length > 0 && (
          <span className="week-accordion__count">{plans.length}</span>
        )}
      </button>
      {open && (
        <div className="week-accordion__body">
          {plans.map((plan) => (
            <div key={plan.id} className="week-plan-item">
              <div className="week-plan-item__content">
                <span className="week-plan-item__title">{plan.title}</span>
                {plan.description && (
                  <span className="week-plan-item__desc">
                    {plan.description}
                  </span>
                )}
                {plan.links && plan.links.length > 0 && (
                  <div className="week-plan-item__links">
                    {plan.links.map((link, i) => (
                      <a
                        key={i}
                        className="week-plan-item__link"
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {getLinkLabel(link)}
                      </a>
                    ))}
                  </div>
                )}
                {plan.tasks && plan.tasks.length > 0 && (
                  <ul className="week-plan-item__tasks">
                    {plan.tasks.map((task) => (
                      <li key={task.id} className="week-plan-item__task">
                        {task.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="week-plan-item__actions">
                <button
                  className="icon-btn"
                  onClick={() => onEditPlan(plan)}
                  title="Editar"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
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
                  onClick={() => onDeletePlan(plan)}
                  title="Eliminar"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
          <button className="week-accordion__add" onClick={onAddPlan}>
            + Agregar plan
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Seguimiento Tab ─────────────────────────────────────────

function WeekTrackCard({
  week,
  plans,
  checks,
  onTogglePlanTask,
  onDeletePlanTask,
  onToggle,
  onAdd,
  onDelete,
}) {
  const [newCheck, setNewCheck] = useState("");
  const [adding, setAdding] = useState(false);

  const planTasks = plans.flatMap((p) => p.tasks || []);
  const totalItems = planTasks.length + checks.length;
  const doneItems =
    planTasks.filter((t) => t.done).length +
    checks.filter((c) => c.done).length;
  const progress =
    totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  const handleAdd = () => {
    const t = newCheck.trim();
    if (!t) return;
    onAdd(t);
    setNewCheck("");
  };

  return (
    <div className="week-track-card">
      <div className="week-track-card__header">
        <span className="week-track-card__label">{week.label}</span>
        <span className="week-track-card__range">{week.range}</span>
        <button
          className="week-track-card__add-btn"
          onClick={() => setAdding(true)}
          title="Agregar check"
        >
          +
        </button>
      </div>
      <div className="week-track-card__checks">
        {plans.map((plan) =>
          (plan.tasks || []).length > 0 ? (
            <div key={plan.id} className="week-track-plan">
              <span className="week-track-plan__title">{plan.title}</span>
              {plan.tasks.map((task) => (
                <div key={task.id} className="week-track-check">
                  <button
                    className={`subtask__check${task.done ? " subtask__check--done" : ""}`}
                    onClick={() => onTogglePlanTask(plan.id, task.id)}
                  >
                    {task.done ? "✓" : ""}
                  </button>
                  <span
                    className={`subtask__text${task.done ? " subtask__text--done" : ""}`}
                  >
                    {task.text}
                  </span>
                  <button
                    className="week-track-check__del"
                    onClick={() => onDeletePlanTask(plan.id, task.id)}
                    title="Quitar"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="12"
                      height="12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : null,
        )}
        {checks.map((check) => (
          <div key={check.id} className="week-track-check">
            <button
              className={`subtask__check${check.done ? " subtask__check--done" : ""}`}
              onClick={() => onToggle(check.id)}
            >
              {check.done ? "✓" : ""}
            </button>
            <span
              className={`subtask__text${check.done ? " subtask__text--done" : ""}`}
            >
              {check.text}
            </span>
            <button
              className="week-track-check__del"
              onClick={() => onDelete(check.id)}
              title="Quitar"
            >
              <svg
                viewBox="0 0 24 24"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        {adding && (
          <input
            className="field__input week-track-card__input"
            value={newCheck}
            onChange={(e) => setNewCheck(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
              if (e.key === "Escape") {
                setNewCheck("");
                setAdding(false);
              }
            }}
            onBlur={() => {
              handleAdd();
              setAdding(false);
            }}
            placeholder="Texto del check"
            autoFocus
          />
        )}
      </div>
      <div className="week-track-card__bar">
        <div className="goal-progress">
          <div
            className="goal-progress__fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="week-track-card__pct">{progress}%</span>
      </div>
    </div>
  );
}

// ─── Main View ──────────────────────────────────────────────

function GoalView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [goals, setGoals] = usePersistedState(goalsKey(), []);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tab, setTab] = useState("plan");
  const [planModal, setPlanModal] = useState(null);
  const [planWeekIdx, setPlanWeekIdx] = useState(null);
  const [confirmPlan, setConfirmPlan] = useState(null);

  const goal = goals.find((g) => g.id === id);

  if (!goal) {
    return (
      <div className="page goal-view">
        <Breadcrumbs
          items={[{ label: "Metas", to: "/metas" }, { label: "No encontrada" }]}
        />
        <p className="goal-view__missing">Esta meta no existe.</p>
        <button className="metas__add-btn" onClick={() => navigate("/metas")}>
          Volver a Metas
        </button>
      </div>
    );
  }

  const cat = categoryById(goal.category);
  const weeks = getWeeks(goal.targetDate);

  // Overall progress = average of each week's check completion
  const weeklyChecksMap = goal.weeklyChecks || {};
  const weeklyPlansMap = goal.weeklyPlans || {};
  const progress =
    weeks.length > 0
      ? Math.round(
          weeks.reduce((acc, w) => {
            const checks = weeklyChecksMap[w.index] || [];
            const planTasks = (weeklyPlansMap[w.index] || []).flatMap(
              (p) => p.tasks || [],
            );
            const items = [...checks, ...planTasks];
            const pct = items.length
              ? (items.filter((c) => c.done).length / items.length) * 100
              : 0;
            return acc + pct;
          }, 0) / weeks.length,
        )
      : goalProgress(goal);

  const updateGoal = (updater) =>
    setGoals((prev) => prev.map((g) => (g.id === id ? updater(g) : g)));

  const saveGoal = (updated) => {
    setGoals((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
    setShowEdit(false);
  };

  const deleteGoal = () => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    navigate("/metas");
  };

  // Weekly plans
  const weeklyPlans = goal.weeklyPlans || {};
  const getPlans = (weekIdx) => weeklyPlans[weekIdx] || [];

  const savePlan = (plan) => {
    updateGoal((g) => {
      const wp = { ...(g.weeklyPlans || {}) };
      const list = wp[planWeekIdx] || [];
      const exists = list.some((p) => p.id === plan.id);
      wp[planWeekIdx] = exists
        ? list.map((p) => (p.id === plan.id ? plan : p))
        : [...list, plan];
      return { ...g, weeklyPlans: wp };
    });
    setPlanModal(null);
    setPlanWeekIdx(null);
  };

  const deletePlan = () => {
    const { weekIdx, plan } = confirmPlan;
    updateGoal((g) => {
      const wp = { ...(g.weeklyPlans || {}) };
      wp[weekIdx] = (wp[weekIdx] || []).filter((p) => p.id !== plan.id);
      return { ...g, weeklyPlans: wp };
    });
    setConfirmPlan(null);
  };

  const togglePlanTask = (weekIdx, planId, taskId) =>
    updateGoal((g) => {
      const wp = { ...(g.weeklyPlans || {}) };
      wp[weekIdx] = (wp[weekIdx] || []).map((p) =>
        p.id === planId
          ? {
              ...p,
              tasks: (p.tasks || []).map((t) =>
                t.id === taskId ? { ...t, done: !t.done } : t,
              ),
            }
          : p,
      );
      return { ...g, weeklyPlans: wp };
    });

  const deletePlanTask = (weekIdx, planId, taskId) =>
    updateGoal((g) => {
      const wp = { ...(g.weeklyPlans || {}) };
      wp[weekIdx] = (wp[weekIdx] || []).map((p) =>
        p.id === planId
          ? { ...p, tasks: (p.tasks || []).filter((t) => t.id !== taskId) }
          : p,
      );
      return { ...g, weeklyPlans: wp };
    });

  // Weekly checks (tracking)
  const getChecks = (weekIdx) => weeklyChecksMap[weekIdx] || [];

  const toggleCheck = (weekIdx, checkId) =>
    updateGoal((g) => {
      const wc = { ...(g.weeklyChecks || {}) };
      wc[weekIdx] = (wc[weekIdx] || []).map((c) =>
        c.id === checkId ? { ...c, done: !c.done } : c,
      );
      return { ...g, weeklyChecks: wc };
    });

  const addCheck = (weekIdx, text) =>
    updateGoal((g) => {
      const wc = { ...(g.weeklyChecks || {}) };
      wc[weekIdx] = [
        ...(wc[weekIdx] || []),
        { id: `ck-${Date.now()}`, text, done: false },
      ];
      return { ...g, weeklyChecks: wc };
    });

  const deleteCheck = (weekIdx, checkId) =>
    updateGoal((g) => {
      const wc = { ...(g.weeklyChecks || {}) };
      wc[weekIdx] = (wc[weekIdx] || []).filter((c) => c.id !== checkId);
      return { ...g, weeklyChecks: wc };
    });

  return (
    <div className="page page--scroll goal-view">
      <Breadcrumbs
        items={[{ label: "Metas", to: "/metas" }, { label: goal.title }]}
      />

      <header
        className="goal-view__header"
        style={{ borderTopColor: cat.color }}
      >
        <div className="goal-view__head-main">
          <span
            className="goal-card__category"
            style={{ color: cat.color, background: cat.bg }}
          >
            {cat.label}
          </span>
          <h1 className="goal-view__title">{goal.title}</h1>
          {goal.description && (
            <p className="goal-view__desc">{goal.description}</p>
          )}
          <div className="goal-view__facts">
            {goal.targetDate && (
              <span className="goal-view__fact">
                :dart: Meta: {goal.targetDate}
              </span>
            )}
            {weeks.length > 0 && (
              <span className="goal-view__fact">{weeks.length} semanas</span>
            )}
          </div>
        </div>
        <div className="goal-view__head-actions">
          <button
            className="icon-btn"
            onClick={() => setShowEdit(true)}
            aria-label="Editar meta"
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
            onClick={() => setConfirmDelete(true)}
            aria-label="Eliminar meta"
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
      </header>

      <div className="goal-view__progress">
        <div className="goal-progress goal-view__progress-bar">
          <div
            className="goal-progress__fill"
            style={{ width: `${progress}%`, background: cat.color }}
          />
        </div>
        <span className="goal-view__progress-label">{progress}%</span>
      </div>

      {/* Tabs */}
      <div className="goal-view__tabs">
        <button
          className={`goal-view__tab${tab === "plan" ? " goal-view__tab--active" : ""}`}
          onClick={() => setTab("plan")}
        >
          Plan Semanal
        </button>
        <button
          className={`goal-view__tab${tab === "tracking" ? " goal-view__tab--active" : ""}`}
          onClick={() => setTab("tracking")}
        >
          Seguimiento
        </button>
      </div>

      {weeks.length === 0 ? (
        <p className="goal-view__plan-empty">
          Agrega una fecha meta para generar el plan semanal.
        </p>
      ) : tab === "plan" ? (
        <div className="goal-view__accordions">
          {weeks.map((week) => (
            <WeekAccordion
              key={week.index}
              week={week}
              plans={getPlans(week.index)}
              onAddPlan={() => {
                setPlanWeekIdx(week.index);
                setPlanModal({});
              }}
              onEditPlan={(plan) => {
                setPlanWeekIdx(week.index);
                setPlanModal(plan);
              }}
              onDeletePlan={(plan) =>
                setConfirmPlan({ weekIdx: week.index, plan })
              }
            />
          ))}
        </div>
      ) : (
        <div className="goal-view__track-grid">
          {weeks.map((week) => (
            <WeekTrackCard
              key={week.index}
              week={week}
              plans={getPlans(week.index)}
              checks={getChecks(week.index)}
              onTogglePlanTask={(planId, taskId) =>
                togglePlanTask(week.index, planId, taskId)
              }
              onDeletePlanTask={(planId, taskId) =>
                deletePlanTask(week.index, planId, taskId)
              }
              onToggle={(checkId) => toggleCheck(week.index, checkId)}
              onAdd={(text) => addCheck(week.index, text)}
              onDelete={(checkId) => deleteCheck(week.index, checkId)}
            />
          ))}
        </div>
      )}

      {showEdit && (
        <GoalModal
          goal={goal}
          onClose={() => setShowEdit(false)}
          onSave={saveGoal}
        />
      )}

      {planModal && (
        <PlanModal
          plan={planModal.id ? planModal : null}
          onClose={() => {
            setPlanModal(null);
            setPlanWeekIdx(null);
          }}
          onSave={savePlan}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar meta"
          message={`¿Seguro que deseas eliminar "${goal.title}"? Esta acción no se puede deshacer.`}
          onConfirm={deleteGoal}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {confirmPlan && (
        <ConfirmDialog
          title="Eliminar plan"
          message={`¿Eliminar "${confirmPlan.plan.title}"?`}
          onConfirm={deletePlan}
          onCancel={() => setConfirmPlan(null)}
        />
      )}
    </div>
  );
}

export default GoalView;