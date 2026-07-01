import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePersistedState, goalsKey } from "../utils/storage";
import { GoalModal, categoryById, goalProgress } from "../components/GoalModal";
import EmojiImg from "../components/EmojiImg";
import "./Metas.css";

const FILTERS = [
  { id: "activas", label: "Activas" },
  { id: "completadas", label: "Completadas" },
  { id: "todas", label: "Todas" },
];

function GoalCard({ goal, onClick }) {
  const cat = categoryById(goal.category);
  const progress = goalProgress(goal);
  const total = goal.milestones?.length || 0;
  const done = goal.milestones?.filter((m) => m.done).length || 0;

  return (
    <button
      className="goal-card"
      onClick={onClick}
      style={{ borderTopColor: cat.color }}
    >
      <div className="goal-card__top">
        <span
          className="goal-card__category"
          style={{ color: cat.color, background: cat.bg }}
        >
          {cat.label}
        </span>
        {progress === 100 && <span className="goal-card__badge">✓</span>}
      </div>

      <h3 className="goal-card__title">{goal.title}</h3>

      {goal.description && (
        <p className="goal-card__desc">{goal.description}</p>
      )}

      <div className="goal-card__footer">
        <div className="goal-progress">
          <div
            className="goal-progress__fill"
            style={{ width: `${progress}%`, background: cat.color }}
          />
        </div>
        <div className="goal-card__meta">
          <span className="goal-card__progress-num">{progress}%</span>
          {total > 0 && (
            <span className="goal-card__milestones">
              {done}/{total} hitos
            </span>
          )}
          {goal.targetDate && (
            <span className="goal-card__date">
              <EmojiImg emoji=":dart:" code="1f3af" className="goal-card__date-icon" />{" "}
              {goal.targetDate}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function Metas() {
  const navigate = useNavigate();
  const [goals, setGoals] = usePersistedState(goalsKey(), []);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("activas");

  const openNew = () => {
    setShowForm(true);
  };

  const saveGoal = (goal) => {
    setGoals((prev) => {
      const exists = prev.some((g) => g.id === goal.id);
      return exists
        ? prev.map((g) => (g.id === goal.id ? goal : g))
        : [...prev, goal];
    });
    setShowForm(false);
  };

  const isComplete = (g) => goalProgress(g) === 100;
  const filtered = goals.filter((g) => {
    if (filter === "completadas") return isComplete(g);
    if (filter === "activas") return !isComplete(g);
    return true;
  });

  const activeCount = goals.filter((g) => !isComplete(g)).length;
  const doneCount = goals.length - activeCount;

  return (
    <div className="page page--scroll metas-page">
      <div className="page__header">
        <h1 className="page__title metas__title">Metas</h1>
        <button className="metas__add-btn" onClick={openNew}>
          + Agregar meta
        </button>
      </div>

      <div className="metas__toolbar">
        <div className="metas__filters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`metas__filter${
                filter === f.id ? " metas__filter--active" : ""
              }`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="metas__stats">
          {activeCount} activas · {doneCount} completadas
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="metas__empty">
          <EmojiImg emoji=":dart:" code="1f3af" className="metas__empty-icon" />
          <p className="metas__empty-text">
            {goals.length === 0
              ? "Aún no tienes metas. ¡Crea la primera!"
              : "No hay metas en esta vista."}
          </p>
          {goals.length === 0 && (
            <button className="metas__add-btn" onClick={openNew}>
              + Agregar meta
            </button>
          )}
        </div>
      ) : (
        <div className="metas__grid">
          {filtered.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onClick={() => navigate(`/metas/${goal.id}`)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <GoalModal
          goal={null}
          onClose={() => setShowForm(false)}
          onSave={saveGoal}
        />
      )}
    </div>
  );
}

export default Metas;