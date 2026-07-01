import EmojiImg from "./EmojiImg";
import {
  colorById,
  iconByChar,
  planStatusInfo,
  planDoseProgress,
  remainingDays,
  frequencyLabel,
  medStatus,
  medTotalDoses,
  MED_STATUS,
  nextReminderLabel,
  lastTaken,
  formatDateLabel,
  formatDateTimeLabel,
} from "../utils/medications";
import "./MedicationCards.css";

// Barra de progreso reutilizable. El color se pasa por variable para respetar
// el color del plan (themeable).
export function ProgressBar({ value, color }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="med-progress">
      <div
        className="med-progress__fill"
        style={{
          width: `${pct}%`,
          minWidth: pct > 0 ? "6px" : 0,
          background: color,
        }}
      />
    </div>
  );
}

function EditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
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
  );
}

function DuplicateIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

// Tarjeta de plan de tratamiento. Click en cualquier parte abre el detalle;
// los botones de acción detienen la propagación.
export function TreatmentPlanCard({ plan, history, onOpen, onEdit, onDelete, onDuplicate }) {
  const color = colorById(plan.color);
  const icon = iconByChar(plan.icon);
  const status = planStatusInfo(plan);
  const progress = planDoseProgress(plan, plan.medications || [], history || {});
  const remaining = remainingDays(plan);
  const medCount = plan.medications?.length || 0;

  const stop = (fn) => (e) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div
      className="treatment-card"
      style={{ borderTopColor: color.color }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
      }}
    >
      <div className="treatment-card__top">
        <span
          className="treatment-card__icon"
          style={{ background: color.bg }}
        >
          <EmojiImg
            emoji={icon.char}
            code={icon.code}
            className="treatment-card__icon-img"
          />
        </span>
        <span className={`badge ${status.badge}`}>{status.label}</span>
      </div>

      <h3 className="treatment-card__title">{plan.name}</h3>
      {plan.description && (
        <p className="treatment-card__desc">{plan.description}</p>
      )}

      <div className="treatment-card__footer">
        <ProgressBar value={progress} color={color.color} />
        <div className="treatment-card__meta">
          <span className="treatment-card__progress-num">{progress}%</span>
          <span>{medCount} medicamentos</span>
          {status.id === "active" && <span>{remaining} días rest.</span>}
        </div>
        <div className="treatment-card__dates">
          {formatDateLabel(plan.startDate)} →{" "}
          {plan.endDate ? formatDateLabel(plan.endDate) : "Sin fin"}
        </div>
      </div>

      <div className="treatment-card__actions">
        <button
          className="med-action med-action--text"
          onClick={stop(onOpen)}
        >
          Abrir
        </button>
        <button
          className="icon-btn"
          onClick={stop(onEdit)}
          aria-label="Editar plan"
          title="Editar"
        >
          <EditIcon />
        </button>
        <button
          className="icon-btn"
          onClick={stop(onDuplicate)}
          aria-label="Duplicar plan"
          title="Duplicar"
        >
          <DuplicateIcon />
        </button>
        <button
          className="icon-btn icon-btn--danger"
          onClick={stop(onDelete)}
          aria-label="Eliminar plan"
          title="Eliminar"
        >
          <DeleteIcon />
        </button>
      </div>
    </div>
  );
}

// Tarjeta de medicación dentro del detalle del plan.
export function MedicationCard({
  med,
  plan,
  history,
  readOnly,
  onEdit,
  onDelete,
  onDuplicate,
  onMarkDose,
}) {
  const status = medStatus(med, plan, history);
  const last = lastTaken(history, med.id);
  const total = medTotalDoses(med);
  const taken = (history?.[med.id] || []).filter(
    (e) => e.status === "Taken"
  ).length;
  const done = status === "completed";

  return (
    <div className="medication-card">
      <div className="medication-card__main">
        <div className="medication-card__head">
          <h4 className="medication-card__name">{med.name}</h4>
          <span className={`medication-card__status medication-card__status--${status}`}>
            {MED_STATUS[status].label}
          </span>
        </div>
        <div className="medication-card__row">
          <span className="medication-card__dose">
            {med.dose} {med.unit}
          </span>
          <span className="medication-card__sep">·</span>
          <span>{frequencyLabel(med.frequency)}</span>
          {med.takeWithFood && (
            <span className="medication-card__food" title="Tomar con comida">
              <EmojiImg emoji=":knife_fork_plate:" code="1f37d-fe0f" className="medication-card__food-icon" />
            </span>
          )}
        </div>
        <div className="medication-card__reminder">
          {!done && <span>Próximo: {nextReminderLabel(med)}</span>}
          {total > 0 && (
            <span className="medication-card__last">
              {taken} de {total} dosis
            </span>
          )}
          {last && (
            <span className="medication-card__last">
              Última toma: {formatDateTimeLabel(last)}
            </span>
          )}
        </div>
        {med.notes && <p className="medication-card__notes">{med.notes}</p>}
      </div>

      <div className="medication-card__actions">
        {!readOnly && !done && (
          <button
            className="med-action med-action--text"
            onClick={onMarkDose}
          >
            Marcar dosis
          </button>
        )}
        <button
          className="icon-btn"
          onClick={onEdit}
          aria-label="Editar medicación"
          title="Editar"
        >
          <EditIcon />
        </button>
        <button
          className="icon-btn"
          onClick={onDuplicate}
          aria-label="Duplicar medicación"
          title="Duplicar"
        >
          <DuplicateIcon />
        </button>
        <button
          className="icon-btn icon-btn--danger"
          onClick={onDelete}
          aria-label="Eliminar medicación"
          title="Eliminar"
        >
          <DeleteIcon />
        </button>
      </div>
    </div>
  );
}