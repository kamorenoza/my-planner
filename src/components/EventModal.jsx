import { useState } from "react";
import {
  DAY_START_MIN,
  DAY_END_MIN,
  EVENT_TYPES,
  getTimeOptions,
} from "../utils/events";
import DateField from "./DateField";

const TIME_OPTIONS = getTimeOptions();

// Shared event form fields (no overlay/title) so it can be reused inside
// a standalone modal or a tabbed modal.
export function EventFields({
  defaultDate,
  event,
  onSave,
  onClose,
  onDelete,
  showActions = true,
}) {
  const [title, setTitle] = useState(event?.title || "");
  const [date, setDate] = useState(event?.date || defaultDate);
  const [start, setStart] = useState(event?.start ?? DAY_START_MIN);
  const [end, setEnd] = useState(event?.end ?? DAY_START_MIN + 60);
  const [type, setType] = useState(event?.type || "personal");
  const [place, setPlace] = useState(event?.place || "");
  const [comments, setComments] = useState(event?.comments || "");

  const canSave = title.trim() && end > start;

  const save = () => {
    if (!canSave) return;
    onSave({
      id: event?.id || `e-${Date.now()}`,
      title: title.trim(),
      date,
      start,
      end,
      type,
      place: place.trim(),
      comments: comments.trim(),
    });
  };

  return (
    <>
      <label className="field">
        <span className="field__label">Título</span>
        <input
          className="field__input"
          value={title}
          autoFocus
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título del evento"
        />
      </label>

      <label className="field">
        <span className="field__label">Fecha</span>
        <DateField value={date} onChange={setDate} />
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field__label">Desde</span>
          <select
            className="field__input"
            value={start}
            onChange={(e) => {
              const v = Number(e.target.value);
              setStart(v);
              if (end <= v) setEnd(Math.min(v + 30, DAY_END_MIN));
            }}
          >
            {TIME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field__label">Hasta</span>
          <select
            className="field__input"
            value={end}
            onChange={(e) => setEnd(Number(e.target.value))}
          >
            {TIME_OPTIONS.filter((o) => o.value > start).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field">
        <span className="field__label">Tipo</span>
        <div className="type-pills">
          {EVENT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`type-pill${type === t.id ? " type-pill--active" : ""}`}
              style={{
                background: t.color,
                color: t.text,
                borderColor: type === t.id ? t.text : "transparent",
              }}
              onClick={() => setType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span className="field__label">Lugar</span>
        <input
          className="field__input"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="Lugar"
        />
      </label>

      <label className="field">
        <span className="field__label">Comentarios</span>
        <textarea
          className="field__input field__input--area"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Comentarios"
          rows={2}
        />
      </label>

      {event && onDelete && (
        <button className="field__delete" onClick={onDelete}>
          Eliminar evento
        </button>
      )}

      {showActions && (
        <div className="modal__actions">
          <button className="modal__btn modal__btn--cancel" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="modal__btn modal__btn--primary"
            onClick={save}
            disabled={!canSave}
          >
            Guardar
          </button>
        </div>
      )}
    </>
  );
}

export function EventModal({ defaultDate, event, onSave, onClose, onDelete }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--form" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">
          {event ? "Editar evento" : "Nuevo evento"}
        </h3>
        <EventFields
          defaultDate={defaultDate}
          event={event}
          onSave={onSave}
          onClose={onClose}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

export default EventModal;
