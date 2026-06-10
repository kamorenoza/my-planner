import { useState } from "react";
import EmojiImg from "./EmojiImg";

export const REMINDER_EMOJIS = [
  { char: ":pushpin:", code: "1f4cc" },
  { char: ":star:", code: "2b50" },
  { char: ":bell:", code: "1f514" },
  { char: ":pill:", code: "1f48a" },
  { char: ":birthday:", code: "1f382" },
  { char: ":gift:", code: "1f381" },
  { char: ":telephone_receiver:", code: "1f4de" },
  { char: ":bulb:", code: "1f4a1" },
  { char: ":memo:", code: "1f4dd" },
  { char: ":moneybag:", code: "1f4b0" },
  { char: ":hospital:", code: "1f3e5" },
  { char: ":car:", code: "1f697" },
  { char: ":airplane:", code: "2708-fe0f" },
  { char: ":shopping_trolley:", code: "1f6d2" },
  { char: ":dog:", code: "1f436" },
  { char: ":heart:", code: "2764-fe0f" },
  { char: ":key:", code: "1f511" },
  { char: ":date:", code: "1f4c5" },
  { char: ":alarm_clock:", code: "23f0" },
  { char: ":mortar_board:", code: "1f393" },
  { char: ":hamburger:", code: "1f354" },
  { char: ":coffee:", code: "2615" },
  { char: ":house:", code: "1f3e0" },
  { char: ":white_check_mark:", code: "2705" },
];

// Shared reminder form fields (emoji picker + title) so it can be reused
// inside a standalone modal or a tabbed modal.
export function ReminderFields({
  reminder,
  onSave,
  onClose,
  canMarkHoliday = false,
}) {
  const [selected, setSelected] = useState(
    reminder
      ? { char: reminder.emoji, code: reminder.emojiCode }
      : REMINDER_EMOJIS[0],
  );
  const [text, setText] = useState(reminder?.text || "");
  const [holiday, setHoliday] = useState(Boolean(reminder?.holiday));

  const canSave = text.trim();

  const save = () => {
    if (!canSave) return;
    const base = {
      id: reminder?.id || `r-${Date.now()}`,
      emoji: holiday ? ":tada:" : selected.char,
      emojiCode: holiday ? "1f389" : selected.code,
      text: text.trim(),
    };
    onSave(holiday ? { ...base, holiday: true } : base);
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

      {canMarkHoliday && (
        <label className="reminder-holiday">
          <input
            type="checkbox"
            checked={holiday}
            onChange={(e) => setHoliday(e.target.checked)}
          />
          <span>Marcar como día festivo</span>
        </label>
      )}

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

export function ReminderModal({
  reminder,
  onSave,
  onClose,
  canMarkHoliday = false,
}) {
  return (
    <div className="modal-overlay">
      <div className="modal modal--form" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">
          {reminder ? "Editar recordatorio" : "Nuevo recordatorio"}
        </h3>
        <ReminderFields
          reminder={reminder}
          canMarkHoliday={canMarkHoliday}
          onSave={onSave}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

export default ReminderModal;
