import { useParams, useNavigate } from "react-router-dom";
import { Fragment, useState } from "react";
import {
  MONTHS,
  MONTHS_SHORT,
  WEEKDAYS,
  getMonthWeeks,
} from "../utils/calendar";
import { getEventType, formatTime } from "../utils/events";
import EmojiImg from "../components/EmojiImg";
import Breadcrumbs from "../components/Breadcrumbs";
import { EventFields } from "../components/EventModal";
import { ReminderFields } from "../components/ReminderModal";
import DateField from "../components/DateField";
import {
  load,
  save,
  dateKeyFromParts,
  eventsKey,
  remindersKey,
} from "../utils/storage";
import "./MonthView.css";

function AddMonthModal({ year, month, onClose, onSaved }) {
  const [tab, setTab] = useState("event");
  const today = new Date();
  const defaultDay =
    today.getFullYear() === year && today.getMonth() === month
      ? today.getDate()
      : 1;
  const [reminderDate, setReminderDate] = useState(
    dateKeyFromParts(year, month, defaultDay),
  );

  const saveEvent = (event) => {
    const key = eventsKey(event.date);
    const events = load(key, []);
    save(
      key,
      [...events, event].sort((a, b) => a.start - b.start),
    );
    onSaved();
    onClose();
  };

  const saveReminder = (reminder) => {
    const reminders = load(remindersKey(reminderDate), []);
    save(remindersKey(reminderDate), [
      ...reminders,
      { ...reminder, date: reminderDate },
    ]);
    onSaved();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--form" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal__title">Agregar a {MONTHS[month]}</h3>
        <div className="modal-tabs">
          <button
            className={`modal-tab${tab === "event" ? " modal-tab--active" : ""}`}
            onClick={() => setTab("event")}
          >
            Evento
          </button>
          <button
            className={`modal-tab${tab === "reminder" ? " modal-tab--active" : ""}`}
            onClick={() => setTab("reminder")}
          >
            Recordatorio
          </button>
        </div>

        {tab === "event" ? (
          <EventFields
            defaultDate={dateKeyFromParts(year, month, defaultDay)}
            onSave={saveEvent}
            onClose={onClose}
          />
        ) : (
          <>
            <label className="field">
              <span className="field__label">Fecha</span>
              <DateField value={reminderDate} onChange={setReminderDate} />
            </label>
            <ReminderFields onSave={saveReminder} onClose={onClose} />
          </>
        )}
      </div>
    </div>
  );
}

function MonthView() {
  const { year, month } = useParams();
  const navigate = useNavigate();
  const yearNumber = Number(year);
  const monthNumber = Number(month);
  const weeks = getMonthWeeks(yearNumber, monthNumber);
  const now = new Date();
  const todayDay =
    now.getFullYear() === yearNumber && now.getMonth() === monthNumber
      ? now.getDate()
      : null;
  const [showAddModal, setShowAddModal] = useState(false);
  const [refresh, setRefresh] = useState(0);

  return (
    <div className="month-view">
      <div className="month-view__header">
        <button
          className="month-view__back"
          onClick={() => navigate(`/year/${yearNumber}`)}
          aria-label="Volver"
        >
          ‹
        </button>
        <div className="month-view__heading">
          <h1 className="month-view__title">
            {MONTHS[monthNumber]} {yearNumber}
          </h1>
          <Breadcrumbs
            items={[{ label: String(yearNumber), to: `/year/${yearNumber}` }]}
          />
        </div>
        <div className="month-view__actions">
          <div className="month-view__months">
            {MONTHS_SHORT.map((m, i) => (
              <button
                key={i}
                className={`month-pill${i === monthNumber ? " month-pill--active" : ""}`}
                onClick={() => navigate(`/year/${yearNumber}/month/${i}`)}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            className="month-view__add-btn"
            onClick={() => setShowAddModal(true)}
          >
            + Agregar
          </button>
        </div>
      </div>

      <div className="month-view__calendar">
        <div className="month-view__weekdays">
          <span className="month-view__weekday month-view__weekday--sem">
            SEM
          </span>
          {WEEKDAYS.map((wd, i) => (
            <span key={i} className="month-view__weekday">
              {wd}
            </span>
          ))}
        </div>
        <div className="month-view__days" data-refresh={refresh}>
          {weeks.map((week) => (
            <Fragment key={week.weekNumber}>
              <div
                className="month-view__week-number"
                onClick={() =>
                  navigate(`/year/${yearNumber}/week/${week.weekNumber}`)
                }
              >
                {week.weekNumber}
              </div>
              {week.days.map((day, i) => {
                const dk = day
                  ? dateKeyFromParts(yearNumber, monthNumber, day)
                  : null;
                const events = dk
                  ? load(eventsKey(dk), [])
                      .filter((e) => !e.date || e.date === dk)
                      .slice()
                      .sort((a, b) => a.start - b.start)
                  : [];
                const reminders = dk
                  ? load(remindersKey(dk), []).filter(
                      (r) => !r.date || r.date === dk,
                    )
                  : [];
                return (
                  <div
                    key={i}
                    className={`month-view__day${day ? "" : " month-view__day--empty"}`}
                    onClick={() =>
                      day &&
                      navigate(
                        `/year/${yearNumber}/month/${monthNumber}/day/${day}`,
                      )
                    }
                  >
                    {day && (
                      <>
                        <span
                          className={`month-view__day-number${
                            day === todayDay
                              ? " month-view__day-number--today"
                              : ""
                          }`}
                        >
                          {day}
                        </span>
                        {reminders.length > 0 && (
                          <div className="month-view__reminders">
                            {reminders.slice(0, 2).map((reminder) => (
                              <div
                                key={reminder.id}
                                className="month-view__reminder"
                              >
                                <EmojiImg
                                  emoji={reminder.emoji}
                                  code={reminder.emojiCode}
                                  className="month-view__reminder-emoji"
                                />
                                <span className="month-view__reminder-text">
                                  {reminder.text}
                                </span>
                              </div>
                            ))}
                            {reminders.length > 2 && (
                              <span className="month-view__reminder-more">
                                +{reminders.length - 2} más
                              </span>
                            )}
                          </div>
                        )}
                        <div className="month-view__events">
                          {events.map((event) => {
                            const type = getEventType(event.type);
                            return (
                              <div
                                key={event.id}
                                className="month-view__event"
                                style={{
                                  background: type.color,
                                  color: type.text,
                                }}
                              >
                                <span className="month-view__event-title">
                                  {event.title}
                                </span>
                                <span className="month-view__event-time">
                                  {formatTime(event.start)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {showAddModal && (
        <AddMonthModal
          year={yearNumber}
          month={monthNumber}
          onClose={() => setShowAddModal(false)}
          onSaved={() => setRefresh((n) => n + 1)}
        />
      )}
    </div>
  );
}

export default MonthView;
