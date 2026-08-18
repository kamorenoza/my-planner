import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePersistedState } from "../utils/storage";
import Breadcrumbs from "../components/Breadcrumbs";
import EmojiImg from "../components/EmojiImg";
import ConfirmDialog from "../components/ConfirmDialog";
import { MedicationCard, ProgressBar } from "../components/MedicationCards";
import {
  MedicationModal,
  DoseEntryModal,
} from "../components/MedicationModals";
import {
  medPlansKey,
  medHistoryKey,
  colorById,
  iconByChar,
  planStatusInfo,
  planDoseProgress,
  remainingDays,
  isPlanReadOnly,
  formatDateLabel,
  computeDoseTimes,
  nextReminderLabel,
  isMedActiveOn,
  frequencyById,
  medStatus,
  todayISO,
  addDaysISO,
  newId,
} from "../utils/medications";
import "./TreatmentPlanDetails.css";

function nowISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Fecha y hora sugeridas para la próxima dosis pendiente de un medicamento.
// Considera dosis vencidas sin marcar (desde el inicio del plan) y nunca
// sugiere una franja (fecha+hora) que ya esté registrada.
function nextDose(med, plan, history = {}) {
  const times = computeDoseTimes(med);
  if (times.length === 0) return { date: todayISO(), time: "08:00" };

  // Rango del medicamento (con respaldo en el plan).
  const start = med?.startDate || plan?.startDate || todayISO();
  const end = med?.endDate || plan?.endDate || null;
  const now = new Date();
  const nowISO = `${todayISO()}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const scheduled = (history[med.id] || [])
    .map((e) => e.scheduledTime)
    .filter(Boolean);
  const marked = new Set(scheduled);
  // Última dosis registrada (tomada o saltada).
  const last = scheduled.slice().sort().pop();

  // Recorre las franjas desde 'start' y devuelve la primera posterior a ahora
  // que no esté marcada. Esto corrige medicamentos semanales sin fin: si hoy es
  // un día programado pero la hora ya pasó, se toma la siguiente semana.
  const freq = frequencyById(med.frequency);
  const startWeekday = (() => {
    try {
      return new Date(start + "T00:00:00").getDay();
    } catch {
      return null;
    }
  })();

  const scan = (cond) => {
    let cursor = start;
    for (let i = 0; i < 3660; i += 1) {
      if (end && cursor > end) break;
      if (freq?.weekly && startWeekday != null) {
        const curWeekday = new Date(cursor + "T00:00:00").getDay();
        if (curWeekday !== startWeekday) {
          cursor = addDaysISO(cursor, 1);
          continue;
        }
      }
      for (const t of times) {
        const slot = `${cursor}T${t}`;
        if (cond(slot)) return { date: cursor, time: t };
      }
      cursor = addDaysISO(cursor, 1);
    }
    return null;
  };

  const next = last
    ? scan((slot) => slot > nowISO && slot > last && !marked.has(slot))
    : scan((slot) => slot > nowISO && !marked.has(slot));
  if (next) return next;

  // Nada pendiente: última franja del último día del medicamento o de hoy.
  const fallbackDate = end || todayISO();
  return { date: fallbackDate, time: times[times.length - 1] };
}

function TreatmentPlanDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [plans, setPlans] = usePersistedState(medPlansKey(), []);
  const [history, setHistory] = usePersistedState(medHistoryKey(), {});

  const plan = useMemo(() => plans.find((p) => p.id === id), [plans, id]);

  const [medModal, setMedModal] = useState(null); // { med? }
  const [doseModal, setDoseModal] = useState(null); // { med, entry?, defaultTime? }
  const [deletingMed, setDeletingMed] = useState(null);
  const [duplicatingMed, setDuplicatingMed] = useState(null);
  const [showCompletedMeds, setShowCompletedMeds] = useState(false);

  if (!plan) {
    return (
      <div className="page">
        <Breadcrumbs items={[{ label: "Medicamentos", to: "/medications" }]} />
        <p className="plan-details__missing">
          Este plan ya no existe.{" "}
          <button
            className="med-action--text"
            onClick={() => navigate("/medications")}
          >
            Volver
          </button>
        </p>
      </div>
    );
  }

  const color = colorById(plan.color);
  const icon = iconByChar(plan.icon);
  const status = planStatusInfo(plan);
  const remaining = remainingDays(plan);
  const readOnly = isPlanReadOnly(plan);
  const medications = plan.medications || [];
  const progress = planDoseProgress(plan, medications, history);
  const activeMeds = medications.filter((m) => medStatus(m, plan, history) !== "completed");
  const completedMeds = medications.filter((m) => medStatus(m, plan, history) === "completed");

  const updatePlan = (updater) =>
    setPlans((prev) => prev.map((p) => (p.id === plan.id ? updater(p) : p)));

  const saveMedication = (med) => {
    updatePlan((p) => {
      const exists = (p.medications || []).some((m) => m.id === med.id);
      const meds = exists
        ? p.medications.map((m) => (m.id === med.id ? med : m))
        : [...(p.medications || []), med];
      return { ...p, medications: meds, updatedAt: nowISO() };
    });
    setMedModal(null);
  };

  const duplicateMedication = (med) => {
    updatePlan((p) => ({
      ...p,
      medications: [
        ...(p.medications || []),
        { ...med, id: newId("med"), name: `${med.name} (copia)` },
      ],
      updatedAt: nowISO(),
    }));
  };

  const deleteMedication = (med) => {
    updatePlan((p) => ({
      ...p,
      medications: (p.medications || []).filter((m) => m.id !== med.id),
      updatedAt: nowISO(),
    }));
    setHistory((prev) => {
      const next = { ...prev };
      delete next[med.id];
      return next;
    });
    setDeletingMed(null);
  };

  const recordDose = (med, entry) => {
    setHistory((prev) => {
      const list = prev[med.id] || [];
      const byId = list.some((e) => e.id === entry.id);
      let next;
      if (byId) {
        next = list.map((e) => (e.id === entry.id ? entry : e));
      } else {
        // Evita duplicar una dosis ya registrada a la misma fecha y hora:
        // si existe, se actualiza esa franja en vez de crear otra.
        const dupIdx = list.findIndex(
          (e) => e.scheduledTime === entry.scheduledTime,
        );
        next =
          dupIdx >= 0
            ? list.map((e, i) => (i === dupIdx ? { ...entry, id: e.id } : e))
            : [...list, entry];
      }
      return { ...prev, [med.id]: next };
    });
    setDoseModal(null);
  };

  const deleteDose = (medId, entryId) => {
    setHistory((prev) => ({
      ...prev,
      [medId]: (prev[medId] || []).filter((e) => e.id !== entryId),
    }));
    setDoseModal(null);
  };

  // Próximas dosis: mostramos la siguiente franja futura del medicamento,
  // incluso cuando la frecuencia es semanal y no coincide con el día actual.
  const upcoming = medications
    .filter((med) => medStatus(med, plan, history) !== "completed")
    .map((med) => {
      const times = computeDoseTimes(med);
      const next = nextDose(med, plan, history);
      const slot = new Date(`${next.date}T${next.time}:00`);
      return {
        med,
        label: nextReminderLabel(med, slot),
        times,
        key: slot.getTime(),
      };
    })
    .filter(({ key, med }) => {
      const now = Date.now();
      if (key < now) return false;
      if (!med.endDate) return true;
      const end = new Date(`${med.endDate}T23:59:59`);
      return end.getTime() >= now;
    })
    .sort((a, b) => a.key - b.key);

  // Histórico: todas las tomas registradas, agrupadas por fecha (desc).
  const historyByDate = (() => {
    const rows = [];
    medications.forEach((med) => {
      (history[med.id] || []).forEach((e) => {
        rows.push({
          ...e,
          medId: med.id,
          medName: med.name,
          date: (e.scheduledTime || "").split("T")[0] || "",
        });
      });
    });
    const groups = {};
    rows.forEach((r) => {
      (groups[r.date] = groups[r.date] || []).push(r);
    });
    return Object.keys(groups)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((date) => ({
        date,
        entries: groups[date].sort((a, b) =>
          a.scheduledTime < b.scheduledTime ? 1 : -1,
        ),
      }));
  })();

  return (
    <div className="page page--scroll plan-details">
      <Breadcrumbs
        items={[
          { label: "Medicamentos", to: "/medications" },
          { label: plan.name },
        ]}
      />

      <header
        className="plan-details__header"
        style={{ borderTopColor: color.color }}
      >
        <div className="plan-details__top">
          <span
            className="plan-details__icon"
            style={{ background: color.bg }}
          >
            <EmojiImg
              emoji={icon.char}
              code={icon.code}
              className="plan-details__icon-img"
            />
          </span>
          <div className="plan-details__head-text">
            <h1 className="plan-details__title">{plan.name}</h1>
            {plan.description && (
              <p className="plan-details__desc">{plan.description}</p>
            )}
          </div>
          <div className="plan-details__head-actions">
            <span className={`badge ${status.badge}`}>{status.label}</span>
            {!readOnly && (
              <button
                className="icon-btn"
                onClick={() => navigate(`/medications/${plan.id}/edit`)}
                aria-label="Editar plan"
                title="Editar plan"
              >
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
              </button>
            )}
          </div>
        </div>

        <div className="plan-details__progress">
          {plan.endDate ? (
            <>
              <span className="plan-details__progress-label">
                {progress}% completado
              </span>
              <ProgressBar value={progress} color={color.color} />
            </>
          ) : null}
          <div className="plan-details__meta">
            <span>
              {formatDateLabel(plan.startDate)} →{" "}
              {plan.endDate ? formatDateLabel(plan.endDate) : "Sin fin"}
            </span>
            {status.id === "active" && plan.endDate && (
              <span>{remaining} días restantes</span>
            )}
          </div>
        </div>
      </header>

      <section className="plan-details__section">
        <div className="plan-details__section-head">
          <h2 className="plan-details__section-title">Medicamentos</h2>
          {!readOnly && (
            <button
              className="med-action--text"
              onClick={() => setMedModal({})}
            >
              + Agregar
            </button>
          )}
        </div>

        {medications.length === 0 ? (
          <p className="plan-details__empty">
            Este plan aún no tiene medicamentos.
          </p>
        ) : (
          <div className="plan-details__med-list">
            {activeMeds.map((med) => (
              <MedicationCard
                key={med.id}
                med={med}
                plan={plan}
                history={history}
                readOnly={readOnly}
                onEdit={() => setMedModal({ med })}
                onDelete={() => setDeletingMed(med)}
                onDuplicate={() => setDuplicatingMed(med)}
                onMarkDose={() => {
                  const nd = nextDose(med, plan, history);
                  setDoseModal({
                    med,
                    defaultDate: nd.date,
                    defaultTime: nd.time,
                  });
                }}
              />
            ))}
            {completedMeds.length > 0 && (
              <div className="plan-details__completed">
                <button
                  className="plan-details__completed-toggle"
                  onClick={() => setShowCompletedMeds((s) => !s)}
                >
                  Medicamentos terminados ({completedMeds.length}) {showCompletedMeds ? "▲" : "▼"}
                </button>
                {showCompletedMeds && (
                  <div className="plan-details__completed-list">
                    {completedMeds.map((med) => (
                      <MedicationCard
                        key={med.id}
                        med={med}
                        plan={plan}
                        history={history}
                        readOnly={readOnly}
                        onEdit={() => setMedModal({ med })}
                        onDelete={() => setDeletingMed(med)}
                        onDuplicate={() => setDuplicatingMed(med)}
                        onMarkDose={() => {
                          const nd = nextDose(med, plan, history);
                          setDoseModal({
                            med,
                            defaultDate: nd.date,
                            defaultTime: nd.time,
                          });
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="plan-details__section">
          <h2 className="plan-details__section-title">Próximas dosis</h2>
          <ul className="plan-details__upcoming">
            {upcoming.map((u) => (
              <li key={u.med.id} className="plan-details__upcoming-item">
                <span className="plan-details__upcoming-name">
                  {u.med.name}
                </span>
                <span className="plan-details__upcoming-time">{u.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {historyByDate.length > 0 && (
        <section className="plan-details__section">
          <h2 className="plan-details__section-title">Histórico</h2>
          <div className="plan-details__history">
            {historyByDate.map((group) => (
              <div key={group.date} className="plan-details__history-group">
                <h3 className="plan-details__history-date">
                  {group.date ? formatDateLabel(group.date) : "Sin fecha"}
                </h3>
                <ul className="plan-details__history-list">
                  {group.entries.map((e) => {
                    const time = (e.scheduledTime || "").split("T")[1] || "";
                    const taken = e.status === "Taken";
                    return (
                      <li key={e.id} className="plan-details__history-row">
                        <button
                          className="plan-details__history-main"
                          onClick={() =>
                            setDoseModal({
                              med: medications.find(
                                (m) => m.id === e.medId,
                              ),
                              entry: e,
                            })
                          }
                        >
                          <span className="plan-details__history-time">
                            {time}
                          </span>
                          <span className="plan-details__history-name">
                            {e.medName}
                          </span>
                        </button>
                        <span
                          className={`dose-pill${
                            taken
                              ? " dose-pill--taken"
                              : " dose-pill--skipped"
                          }`}
                        >
                          {taken ? "Tomado" : "No tomado"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {medModal && (
        <MedicationModal
          med={medModal.med}
          planStart={plan?.startDate}
          planEnd={plan?.endDate}
          onClose={() => setMedModal(null)}
          onSave={saveMedication}
        />
      )}

      {doseModal && (
        <DoseEntryModal
          med={doseModal.med}
          entry={doseModal.entry}
          defaultDate={doseModal.defaultDate}
          defaultTime={doseModal.defaultTime}
          onClose={() => setDoseModal(null)}
          onSave={(entry) => recordDose(doseModal.med, entry)}
          onDelete={(entryId) => deleteDose(doseModal.med.id, entryId)}
        />
      )}

      {deletingMed && (
        <ConfirmDialog
          title="Eliminar medicamento"
          message={`¿Eliminar «${deletingMed.name}» del plan?`}
          onConfirm={() => deleteMedication(deletingMed)}
          onCancel={() => setDeletingMed(null)}
        />
      )}

      {duplicatingMed && (
        <ConfirmDialog
          title="Duplicar medicamento"
          message={`¿Crear una copia de «${duplicatingMed.name}»?`}
          confirmLabel="Duplicar"
          onConfirm={() => {
            duplicateMedication(duplicatingMed);
            setDuplicatingMed(null);
          }}
          onCancel={() => setDuplicatingMed(null)}
        />
      )}
    </div>
  );
}

export default TreatmentPlanDetails;