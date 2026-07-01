import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePersistedState } from "../utils/storage";
import {
  medPlansKey,
  medHistoryKey,
  planStatus,
  planDoseProgress,
  newId,
} from "../utils/medications";
import { TreatmentPlanCard } from "../components/MedicationCards";
import { DeleteTreatmentPlanModal } from "../components/MedicationModals";
import ConfirmDialog from "../components/ConfirmDialog";
import EmojiImg from "../components/EmojiImg";
import "./MedicationHome.css";

const FILTERS = [
  { id: "todas", label: "Todas" },
  { id: "active", label: "Activos" },
  { id: "upcoming", label: "Próximos" },
  { id: "completed", label: "Completados" },
];

const SORTS = [
  { id: "name", label: "Nombre" },
  { id: "start", label: "Inicio" },
  { id: "end", label: "Fin" },
  { id: "progress", label: "Progreso" },
];

function MedicationHome() {
  const navigate = useNavigate();
  const [plans, setPlans] = usePersistedState(medPlansKey(), []);
  const [history, setHistory] = usePersistedState(medHistoryKey(), {});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todas");
  const [sort, setSort] = useState("start");
  const [deleting, setDeleting] = useState(null);
  const [duplicating, setDuplicating] = useState(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = plans.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (filter === "todas") return true;
      return planStatus(p) === filter;
    });
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "start") return (a.startDate || "").localeCompare(b.startDate || "");
      if (sort === "end") return (a.endDate || "").localeCompare(b.endDate || "");
      if (sort === "progress")
        return (
          planDoseProgress(b, b.medications, history) -
          planDoseProgress(a, a.medications, history)
        );
      return 0;
    });
    return list;
  }, [plans, search, filter, sort, history]);

  const duplicatePlan = (plan) => {
    const copy = {
      ...plan,
      id: newId("plan"),
      name: `${plan.name} (copia)`,
      medications: (plan.medications || []).map((m) => ({
        ...m,
        id: newId("med"),
      })),
      createdAt: new Date().toISOString().slice(0, 16),
      updatedAt: new Date().toISOString().slice(0, 16),
    };
    setPlans((prev) => [...prev, copy]);
  };

  const deletePlanOnly = (plan) => {
    setPlans((prev) => prev.filter((p) => p.id !== plan.id));
    setDeleting(null);
  };

  const deletePlanAndMeds = (plan) => {
    setPlans((prev) => prev.filter((p) => p.id !== plan.id));
    // Limpiar el historial de dosis de las medicaciones del plan.
    setHistory((prev) => {
      const next = { ...prev };
      (plan.medications || []).forEach((m) => delete next[m.id]);
      return next;
    });
    setDeleting(null);
  };

  return (
    <div className="page page--scroll medication-home">
      <div className="page__header">
        <h1 className="page__title medication-home__title">
          Medicamentos
        </h1>
        <button
          className="medication-home__add-btn"
          onClick={() => navigate("/medications/new")}
        >
          + Nuevo plan
        </button>
      </div>

      <div className="search-bar medication-home__search">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="var(--color-text-muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          className="search-bar__input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar"
        />
      </div>

      <div className="medication-home__toolbar">
        <div className="medication-home__filters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`medication-home__filter${
                filter === f.id ? " medication-home__filter--active" : ""
              }`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="medication-home__sort">
          <span>Ordenar</span>
          <select
            className="field__input"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="medication-home__empty">
          <EmojiImg emoji=":pill:" code="1f48a" className="medication-home__empty-icon" />
          <p className="medication-home__empty-text">
            {plans.length === 0
              ? "Aún no tienes planes de tratamiento."
              : "No hay planes en esta vista."}
          </p>
          {plans.length === 0 && (
            <button
              className="med-action--text"
              onClick={() => navigate("/medications/new")}
            >
              Crea tu primer plan de tratamiento
            </button>
          )}
        </div>
      ) : (
        <div className="medication-home__grid">
          {visible.map((plan) => (
            <TreatmentPlanCard
              key={plan.id}
              plan={plan}
              history={history}
              onOpen={() => navigate(`/medications/${plan.id}`)}
              onEdit={() => navigate(`/medications/${plan.id}/edit`)}
              onDuplicate={() => setDuplicating(plan)}
              onDelete={() => setDeleting(plan)}
            />
          ))}
        </div>
      )}

      {deleting && (
        <DeleteTreatmentPlanModal
          plan={deleting}
          onClose={() => setDeleting(null)}
          onDeletePlanOnly={() => deletePlanOnly(deleting)}
          onDeleteAll={() => deletePlanAndMeds(deleting)}
        />
      )}

      {duplicating && (
        <ConfirmDialog
          title="Duplicar plan"
          message={`¿Crear una copia de "${duplicating.name}"?`}
          confirmLabel="Duplicar"
          onConfirm={() => {
            duplicatePlan(duplicating);
            setDuplicating(null);
          }}
          onCancel={() => setDuplicating(null)}
        />
      )}
    </div>
  );
}

export default MedicationHome;