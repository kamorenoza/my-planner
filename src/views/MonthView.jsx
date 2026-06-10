import { useParams, useNavigate } from "react-router-dom";
import { Fragment, useState, useRef, useEffect } from "react";
import {
  MONTHS,
  MONTHS_SHORT,
  WEEKDAYS,
  WEEKDAYS_FULL,
  getMonthWeeks,
  getMonthDays,
  getISOWeek,
} from "../utils/calendar";
import { getEventType, formatTime } from "../utils/events";
import {
  isHolidayReminder,
  dayHasHoliday,
  sortRemindersHolidayFirst,
} from "../utils/holidaysCO";
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
  todosKey,
} from "../utils/storage";
import { saveNewEvent } from "../utils/recurrence";
import {
  getDayMarks,
  stripeGradient,
  MARK_SIZE,
  LINE_HEIGHT,
} from "../utils/dayMarks";
import { useIsMobile } from "../utils/useIsMobile";
import "./MonthView.css";

function AddMonthModal({ year, month, onClose, onSaved, day }) {
  const [tab, setTab] = useState("event");
  const today = new Date();
  const defaultDay =
    day ||
    (today.getFullYear() === year && today.getMonth() === month
      ? today.getDate()
      : 1);
  const [reminderDate, setReminderDate] = useState(
    dateKeyFromParts(year, month, defaultDay),
  );

  const saveEvent = (event) => {
    saveNewEvent(event);
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
    <div className="modal-overlay">
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
            <ReminderFields
              onSave={saveReminder}
              onClose={onClose}
              canMarkHoliday={
                !load(remindersKey(reminderDate), []).some(isHolidayReminder)
              }
            />
          </>
        )}
      </div>
    </div>
  );
}

function MonthDayCard({ year, month, day, todayDay, onOpen, onAdd, cardRef }) {
  const dk = dateKeyFromParts(year, month, day);
  const events = load(eventsKey(dk), [])
    .filter((e) => !e.date || e.date === dk)
    .slice()
    .sort((a, b) => a.start - b.start);
  const reminders = sortRemindersHolidayFirst(
    load(remindersKey(dk), []).filter((r) => !r.date || r.date === dk),
  );
  const todos = load(todosKey(dk), []).filter((t) => !t.date || t.date === dk);
  const visibleTodos = todos.slice(0, 3);

  const date = new Date(Date.UTC(year, month, day));
  const weekdayIndex = (date.getUTCDay() + 6) % 7;
  const isToday = day === todayDay;
  const isHoliday = reminders.some(isHolidayReminder);
  const isEmpty =
    reminders.length === 0 && todos.length === 0 && events.length === 0;

  return (
    <div
      className={`day-column${isToday ? " day-column--today" : ""}`}
      ref={cardRef}
      onClick={() => onOpen(day)}
    >
      <div className="month-mobile__day-header">
        <span
          className={`month-mobile__day-title${
            isHoliday ? " month-mobile__day-title--holiday" : ""
          }`}
        >
          {WEEKDAYS_FULL[weekdayIndex]} {day} de {MONTHS[month]}
        </span>
      </div>
      <div className="day-column__body">
        {reminders.length > 0 && (
          <div className="day-column__reminders">
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`day-column__reminder${
                  isHolidayReminder(reminder)
                    ? " day-column__reminder--holiday"
                    : ""
                }`}
              >
                <EmojiImg
                  emoji={reminder.emoji}
                  code={reminder.emojiCode}
                  className="day-column__reminder-emoji"
                />
                <span className="day-column__reminder-text">
                  {isHolidayReminder(reminder)
                    ? `Festivo: ${reminder.text}`
                    : reminder.text}
                </span>
              </div>
            ))}
          </div>
        )}
        {todos.length > 0 && (
          <div className="day-column__todos">
            {visibleTodos.map((todo) => (
              <div
                key={todo.id}
                className={`day-column__todo${
                  todo.done ? " day-column__todo--done" : ""
                }`}
              >
                <span className="day-column__todo-dot"></span>
                <span className="day-column__todo-text">{todo.text}</span>
              </div>
            ))}
            {todos.length > 3 && (
              <div className="day-column__todo day-column__todo--more">…</div>
            )}
          </div>
        )}
        <div className="day-column__events">
          {events.map((event) => {
            const type = getEventType(event.type);
            return (
              <div
                key={event.id}
                className="day-column__event"
                style={{ background: type.color, color: type.text }}
              >
                <span className="day-column__event-title">{event.title}</span>
                <span className="day-column__event-time">
                  {formatTime(event.start)}
                </span>
              </div>
            );
          })}
        </div>
        {isEmpty && (
          <p className="month-mobile__empty">Sin eventos ni recordatorios</p>
        )}
        <button
          className="day-column__add"
          onClick={(e) => {
            e.stopPropagation();
            onAdd(day);
          }}
        >
          + Agregar
        </button>
      </div>
    </div>
  );
}

function MonthMobile({ year, month, navigate, refresh, onAdd }) {
  const cells = getMonthDays(year, month);
  const days = cells.filter((d) => d !== null);
  const weeks = getMonthWeeks(year, month);
  const now = new Date();
  const todayDay =
    now.getFullYear() === year && now.getMonth() === month
      ? now.getDate()
      : null;

  const storeKey = `month-mobile-day-${year}-${month}`;
  const dayRefs = useRef({});
  const [selectedDay, setSelectedDay] = useState(() => {
    const saved = sessionStorage.getItem(storeKey);
    return saved ? Number(saved) : todayDay || 1;
  });

  const scrollToDay = (day, behavior = "smooth") => {
    const node = dayRefs.current[day];
    if (node) node.scrollIntoView({ behavior, block: "start" });
  };

  const selectDay = (day) => {
    setSelectedDay(day);
    sessionStorage.setItem(storeKey, String(day));
    scrollToDay(day);
  };

  const openDay = (day) => {
    sessionStorage.setItem(storeKey, String(day));
    navigate(`/year/${year}/month/${month}/day/${day}`);
  };

  // On open, restore scroll to the last selected/viewed day for this month.
  useEffect(() => {
    if (dayRefs.current[selectedDay]) {
      scrollToDay(selectedDay, "auto");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const todayWeek =
    todayDay !== null ? getISOWeek(year, month, todayDay) : null;
  const selectedWeek = getISOWeek(year, month, selectedDay);

  return (
    <div className="month-view__mobile" data-refresh={refresh}>
      <div className="month-mobile__weeks">
        {weeks.map((w, i) => (
          <button
            key={w.weekNumber}
            className={`month-mobile__week-pill${
              w.weekNumber === todayWeek
                ? " month-mobile__week-pill--today"
                : ""
            }${
              w.weekNumber === selectedWeek
                ? " month-mobile__week-pill--active"
                : ""
            }`}
            onClick={() => navigate(`/year/${year}/week/${w.weekNumber}`)}
          >
            SEM {i + 1}
          </button>
        ))}
      </div>
      <div className="month-mobile__calendar">
        <div className="month-mobile__weekdays">
          {WEEKDAYS.map((wd, i) => (
            <span key={i} className="month-mobile__weekday">
              {wd}
            </span>
          ))}
        </div>
        <div className="month-mobile__days">
          {cells.map((day, i) => {
            const marks = day ? getDayMarks(year, month, day) : [];
            return (
              <button
                key={i}
                className={`month-mobile__day${
                  day ? "" : " month-mobile__day--empty"
                }${day && day === todayDay ? " month-mobile__day--today" : ""}${
                  day && day === selectedDay
                    ? " month-mobile__day--selected"
                    : ""
                }${
                  day && dayHasHoliday(year, month, day)
                    ? " month-mobile__day--holiday"
                    : ""
                }`}
                onClick={() => day && selectDay(day)}
                disabled={!day}
              >
                <span className="month-mobile__day-num">{day || ""}</span>
                {marks.length === 1 && (
                  <span
                    className="month-mobile__mark"
                    style={{
                      background: marks[0],
                      width: `${MARK_SIZE}px`,
                      height: `${MARK_SIZE}px`,
                    }}
                  />
                )}
                {marks.length > 1 && (
                  <span
                    className="month-mobile__mark month-mobile__mark--line"
                    style={{
                      background: stripeGradient(marks),
                      width: `${marks.length * MARK_SIZE}px`,
                      height: `${LINE_HEIGHT}px`,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="month-mobile__list">
        {days.map((day) => (
          <MonthDayCard
            key={day}
            year={year}
            month={month}
            day={day}
            todayDay={todayDay}
            onOpen={openDay}
            onAdd={onAdd}
            cardRef={(node) => {
              dayRefs.current[day] = node;
            }}
          />
        ))}
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
  const [addDay, setAddDay] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const isMobile = useIsMobile();

  const goMonth = (delta) => {
    let m = monthNumber + delta;
    let y = yearNumber;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    navigate(`/year/${y}/month/${m}`);
  };

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
        {isMobile ? (
          <div className="month-view__nav">
            <button
              className="month-view__nav-btn"
              onClick={() => goMonth(-1)}
              aria-label="Mes anterior"
            >
              ‹
            </button>
            <button
              className="month-view__nav-btn"
              onClick={() => goMonth(1)}
              aria-label="Mes siguiente"
            >
              ›
            </button>
          </div>
        ) : (
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
        )}
      </div>

      {isMobile ? (
        <MonthMobile
          year={yearNumber}
          month={monthNumber}
          navigate={navigate}
          refresh={refresh}
          onAdd={(d) => {
            setAddDay(d);
            setShowAddModal(true);
          }}
        />
      ) : (
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
                    ? sortRemindersHolidayFirst(
                        load(remindersKey(dk), []).filter(
                          (r) => !r.date || r.date === dk,
                        ),
                      )
                    : [];
                  const isHoliday = reminders.some(isHolidayReminder);
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
                            }${
                              isHoliday
                                ? " month-view__day-number--holiday"
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
                                  className={`month-view__reminder${
                                    isHolidayReminder(reminder)
                                      ? " month-view__reminder--holiday"
                                      : ""
                                  }`}
                                >
                                  <EmojiImg
                                    emoji={reminder.emoji}
                                    code={reminder.emojiCode}
                                    className="month-view__reminder-emoji"
                                  />
                                  <span className="month-view__reminder-text">
                                    {isHolidayReminder(reminder)
                                      ? `Festivo: ${reminder.text}`
                                      : reminder.text}
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
      )}

      {showAddModal && (
        <AddMonthModal
          year={yearNumber}
          month={monthNumber}
          day={addDay}
          onClose={() => {
            setShowAddModal(false);
            setAddDay(null);
          }}
          onSaved={() => setRefresh((n) => n + 1)}
        />
      )}
    </div>
  );
}

export default MonthView;
