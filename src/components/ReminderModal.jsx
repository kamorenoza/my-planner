import { useState } from "react";
import EmojiImg from "./EmojiImg";

export const REMINDER_EMOJIS = [
  { char: "📌", code: "1f4cc" },
  { char: "⭐", code: "2b50" },
  { char: "🔔", code: "1f514" },
  { char: "💊", code: "1f48a" },
  { char: "🎂", code: "1f382" },
  { char: "🎁", code: "1f381" },
  { char: "📞", code: "1f4de" },
  { char: "💡", code: "1f4a1" },
  { char: "📝", code: "1f4dd" },
  { char: "💰", code: "1f4b0" },
  { char: "🏥", code: "1f3e5" },
  { char: "🚗", code: "1f697" },
  { char: "✈️", code: "2708-fe0f" },
  { char: "🛒", code: "1f6d2" },
  { char: "🐶", code: "1f436" },
  { char: "❤️", code: "2764-fe0f" },
  { char: "🔑", code: "1f511" },
  { char: "📅", code: "1f4c5" },
  { char: "⏰", code: "23f0" },
  { char: "🎓", code: "1f393" },
  { char: "🍔", code: "1f354" },
  { char: "☕", code: "2615" },
  { char: "🏠", code: "1f3e0" },
  { char: "✅", code: "2705" },
];

// Shared reminder form fields (emoji picker + title) so it can be reused
// inside a standalone modal or a tabbed modal.
export function ReminderFields({ reminder, onSave, onClose }) {
  const [selected, setSelected] = useState(
    reminder
      ? { char: reminder.emoji, code: reminder.emojiCode }
      : REMINDER_EMOJIS[0],
  );
  const [text, setText] = useState(reminder?.text || "");

  const canSave = text.trim();

  const save = () => {
    if (!canSave) return;
    onSave({
      id: reminder?.id || `r-${Date.now()}`,
      emoji: selected.char,
      emojiCode: selected.code,
      text: text.trim(),
    });
  };

  return (
    <>
      <div className="field">
        <span className="field__label">Emoji</span>
        <div className="emoji-picker">
          {REMINDER_EMOJIS.map((e) => (
            <button
              key={e.code}
              type="button"
              className={`emoji-picker__item${selected.code === e.code ? " emoji-picker__item--active" : ""}`}
              onClick={() => setSelected(e)}
            >
              <EmojiImg
                emoji={e.char}
                code={e.code}
                className="emoji-picker__img"
              />
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span className="field__label">Título</span>
        <input
          className="field__input"
          value={text}
          autoFocus
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
          }}
          placeholder="Título del recordatorio"
        />
      </label>

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
    </>
  );
}

export function ReminderModal({ reminder, onSave, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--form" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">
          {reminder ? "Editar recordatorio" : "Nuevo recordatorio"}
        </h3>
        <ReminderFields reminder={reminder} onSave={onSave} onClose={onClose} />
      </div>
    </div>
  );
}

export default ReminderModal;
