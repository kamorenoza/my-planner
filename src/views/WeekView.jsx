import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MONTHS,
  WEEKDAYS,
  WEEKDAYS_FULL,
  getMonthDays,
  getMonthWeeks,
  getISOWeek,
  getWeekDates,
} from "../utils/calendar";
import { getEventType, formatTime } from "../utils/events";
import { DAY_START_MIN, DAY_END_MIN } from "../utils/events";
import { EventFields } from "../components/EventModal";
import EmojiImg from "../components/EmojiImg";
import Breadcrumbs from "../components/Breadcrumbs";
import {
  usePersistedState,
  load,
  save,
  dateKey,
  eventsKey,
  todosKey,
  remindersKey,
  habitsKey,
  checksKey,
} from "../utils/storage";
import { useIsMobile } from "../utils/useIsMobile";
import "./WeekView.css";

const INITIAL_HABITS = [{ id: "h1", name: "Ejercicio" }];

function MiniCalendar({ year, month, weekNumber }) {
  const cells = getMonthDays(year, month);
  const now = new Date();
  const todayDay =
    now.getFullYear() === year && now.getMonth() === month
      ? now.getDate()
      : null;

  return (
    <div className="mini-calendar">
      <h3 className="mini-calendar__title">{MONTHS[month]}</h3>
      <div className="mini-calendar__weekdays">
        {WEEKDAYS.map((wd, i) => (
          <span key={i} className="mini-calendar__weekday">
            {wd}
          </span>
        ))}
      </div>
      <div className="mini-calendar__days">
        {cells.map((day, i) => {
          const inWeek = day && getISOWeek(year, month, day) === weekNumber;
          const isToday = day && day === todayDay;
          return (
            <span
              key={i}
              className={`mini-calendar__day${day ? "" : " mini-calendar__day--empty"}${
                inWeek ? " mini-calendar__day--active" : ""
              }${isToday ? " mini-calendar__day--today" : ""}`}
            >
              {day || ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function HabitsTable({
  habits,
  checks,
  todayIndex,
  onToggle,
  onRename,
  onAdd,
  onRemove,
  mobile,
}) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmHabit, setConfirmHabit] = useState(null);

  const startEdit = (habit) => {
    setEditingId(habit.id);
    setDraft(habit.name);
  };

  const commitEdit = (id) => {
    const name = draft.trim();
    if (name) onRename(id, name);
    setEditingId(null);
    setDraft("");
  };

  const commitAdd = () => {
    const name = newName.trim();
    if (name) onAdd(name);
    setNewName("");
    setAdding(false);
  };

  const confirmRemove = () => {
    onRemove(confirmHabit.id);
    setConfirmHabit(null);
  };

  if (mobile) {
    return (
      <div className="habits habits--mobile">
        <div className="habits__head-bar">
          <h3 className="habits__title">Hábitos</h3>
          <button className="habits__add-btn" onClick={() => setAdding(true)}>
            + Agregar
          </button>
        </div>
        <div className="habits-m__list">
          {habits.map((habit) => (
            <div key={habit.id} className="habits-m__item">
              <div className="habits-m__name">
                {editingId === habit.id ? (
                  <input
                    className="habits__input"
                    value={draft}
                    autoFocus
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commitEdit(habit.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit(habit.id);
                      if (e.key === "Escape") {
                        setEditingId(null);
                        setDraft("");
                      }
                    }}
                  />
                ) : (
                  <>
                    <span
                      className="habits__name-text"
                      onClick={() => startEdit(habit)}
                      title="Editar"
                    >
                      {habit.name}
                    </span>
                    <button
                      className="habits-m__remove"
                      onClick={() => setConfirmHabit(habit)}
                      aria-label={`Eliminar ${habit.name}`}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
              <div className="habits-m__days">
                {WEEKDAYS.map((wd, i) => (
                  <span
                    key={i}
                    className={`habits-m__weekday${
                      i === todayIndex ? " habits-m__weekday--today" : ""
                    }`}
                  >
                    {wd}
                  </span>
                ))}
              </div>
              <div className="habits-m__checks">
                {WEEKDAYS.map((_, i) => (
                  <button
                    key={i}
                    className={`habits__check${
                      checks[`${habit.id}-${i}`] ? " habits__check--on" : ""
                    }`}
                    onClick={() => onToggle(habit.id, i)}
                    aria-label={`Marcar ${habit.name}`}
                  >
                    {checks[`${habit.id}-${i}`] ? "✓" : ""}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {adding && (
            <div className="habits-m__item">
              <input
                className="habits__input"
                value={newName}
                autoFocus
                placeholder="Nuevo hábito"
                onChange={(e) => setNewName(e.target.value)}
                onBlur={commitAdd}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitAdd();
                  if (e.key === "Escape") {
                    setNewName("");
                    setAdding(false);
                  }
                }}
              />
            </div>
          )}
        </div>

        {confirmHabit && (
          <div className="modal-overlay" onClick={() => setConfirmHabit(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal__title">Eliminar hábito</h3>
              <p className="modal__text">
                ¿Seguro que quieres eliminar “{confirmHabit.name}”?
              </p>
              <div className="modal__actions">
                <button
                  className="modal__btn modal__btn--cancel"
                  onClick={() => setConfirmHabit(null)}
                >
                  Cancelar
                </button>
                <button
                  className="modal__btn modal__btn--danger"
                  onClick={confirmRemove}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="habits">
      <div className="habits__head-bar">
        <h3 className="habits__title">Hábitos</h3>
        <button className="habits__add-btn" onClick={() => setAdding(true)}>
          + Agregar
        </button>
      </div>
      <div className="habits__table">
        <div className="habits__row habits__row--head">
          <span className="habits__cell habits__cell--name"></span>
          {WEEKDAYS.map((wd, i) => (
            <span
              key={i}
              className={`habits__cell habits__cell--day${
                i === todayIndex ? " habits__cell--today" : ""
              }`}
            >
              {wd}
            </span>
          ))}
        </div>
        {habits.map((habit) => (
          <div key={habit.id} className="habits__row">
            <span className="habits__cell habits__cell--name">
              {editingId === habit.id ? (
                <input
                  className="habits__input"
                  value={draft}
                  autoFocus
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commitEdit(habit.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEdit(habit.id);
                    if (e.key === "Escape") {
                      setEditingId(null);
                      setDraft("");
                    }
                  }}
                />
              ) : (
                <>
                  <span
                    className="habits__name-text"
                    onClick={() => startEdit(habit)}
                    title="Editar"
                  >
                    {habit.name}
                  </span>
                  <button
                    className="habits__remove"
                    onClick={() => setConfirmHabit(habit)}
                    aria-label={`Eliminar ${habit.name}`}
                  >
                    ×
                  </button>
                </>
              )}
            </span>
            {WEEKDAYS.map((_, i) => (
              <span key={i} className="habits__cell habits__cell--day">
                <button
                  className={`habits__check${
                    checks[`${habit.id}-${i}`] ? " habits__check--on" : ""
                  }`}
                  onClick={() => onToggle(habit.id, i)}
                  aria-label={`Marcar ${habit.name}`}
                >
                  {checks[`${habit.id}-${i}`] ? "✓" : ""}
                </button>
              </span>
            ))}
          </div>
        ))}
        {adding && (
          <div className="habits__row">
            <span className="habits__cell habits__cell--name">
              <input
                className="habits__input"
                value={newName}
                autoFocus
                placeholder="Nuevo hábito"
                onChange={(e) => setNewName(e.target.value)}
                onBlur={commitAdd}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitAdd();
                  if (e.key === "Escape") {
                    setNewName("");
                    setAdding(false);
                  }
                }}
              />
            </span>
          </div>
        )}
      </div>

      {confirmHabit && (
        <div className="modal-overlay" onClick={() => setConfirmHabit(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">Eliminar hábito</h3>
            <p className="modal__text">
              ¿Seguro que quieres eliminar “{confirmHabit.name}”?
            </p>
            <div className="modal__actions">
              <button
                className="modal__btn modal__btn--cancel"
                onClick={() => setConfirmHabit(null)}
              >
                Cancelar
              </button>
              <button
                className="modal__btn modal__btn--danger"
                onClick={confirmRemove}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddDayModal({ dateKey: dk, onClose, onSaved }) {
  const [tab, setTab] = useState("event");
  const [todoText, setTodoText] = useState("");

  const saveEvent = (event) => {
    const events = load(eventsKey(dk), []);
    save(
      eventsKey(dk),
      [...events, event].sort((a, b) => a.start - b.start),
    );
    onSaved();
    onClose();
  };

  const saveTodo = () => {
    const text = todoText.trim();
    if (!text) return;
    const todos = load(todosKey(dk), []);
    save(todosKey(dk), [
      ...todos,
      { id: `t-${Date.now()}`, text, done: false, date: dk },
    ]);
    onSaved();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-tabs">
          <button
            className={`modal-tab${tab === "event" ? " modal-tab--active" : ""}`}
            onClick={() => setTab("event")}
          >
            Evento
          </button>
          <button
            className={`modal-tab${tab === "todo" ? " modal-tab--active" : ""}`}
            onClick={() => setTab("todo")}
          >
            TODO
          </button>
        </div>

        {tab === "event" ? (
          <EventFields defaultDate={dk} onSave={saveEvent} onClose={onClose} />
        ) : (
          <>
            <label className="field">
              <span className="field__label">Tarea</span>
              <input
                className="field__input"
                value={todoText}
                autoFocus
                onChange={(e) => setTodoText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTodo();
                }}
                placeholder="Nueva tarea"
              />
            </label>
            <div className="modal__actions">
              <button
                className="modal__btn modal__btn--cancel"
                onClick={onClose}
              >
                Cancelar
              </button>
              <button
                className="modal__btn modal__btn--primary"
                onClick={saveTodo}
                disabled={!todoText.trim()}
              >
                Guardar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WeekMobile({
  weekDates,
  navigate,
  refresh,
  habits,
  checks,
  todayIndex,
  onToggle,
  onRename,
  onAdd,
  onRemove,
}) {
  const hourLabel = (h) => {
    const period = h < 12 ? "am" : "pm";
    const hr = h % 12 === 0 ? 12 : h % 12;
    return `${hr}${period}`;
  };
  const hours = Array.from({ length: 16 }, (_, i) => i + 6); // 6 -> 21
  const total = DAY_END_MIN - DAY_START_MIN;

  return (
    <div className="week-mobile">
      <HabitsTable
        habits={habits}
        checks={checks}
        todayIndex={todayIndex}
        onToggle={onToggle}
        onRename={onRename}
        onAdd={onAdd}
        onRemove={onRemove}
        mobile
      />

      <div className="week-mobile__board" data-refresh={refresh}>
        <div className="week-mobile__gutter">
          <div className="week-mobile__gutter-spacer" />
          <div className="week-mobile__hours">
            {hours.map((h) => (
              <div key={h} className="week-mobile__hour">
                <span className="week-mobile__hour-label">{hourLabel(h)}</span>
              </div>
            ))}
            <div className="week-mobile__hour week-mobile__hour--last">
              <span className="week-mobile__hour-label">{hourLabel(22)}</span>
            </div>
          </div>
        </div>

        {weekDates.map((date, i) => {
          const dk = dateKey(date);
          const todos = load(todosKey(dk), []).filter(
            (t) => !t.date || t.date === dk,
          );
          const events = load(eventsKey(dk), [])
            .filter((e) => !e.date || e.date === dk)
            .slice()
            .sort((a, b) => a.start - b.start);
          const reminders = load(remindersKey(dk), []).filter(
            (r) => !r.date || r.date === dk,
          );
          const isToday = i === todayIndex;
          const dayUrl = `/year/${date.getUTCFullYear()}/month/${date.getUTCMonth()}/day/${date.getUTCDate()}`;

          return (
            <div key={i} className="week-mobile__daycol">
              <button
                className={`week-mobile__dayhead${
                  isToday ? " week-mobile__dayhead--today" : ""
                }`}
                onClick={() => navigate(dayUrl)}
              >
                <span className="week-mobile__dayname">{WEEKDAYS_FULL[i]}</span>
                <span className="week-mobile__daynum">{date.getUTCDate()}</span>
              </button>

              <div className="week-mobile__dayside">
                {reminders.length > 0 && (
                  <div className="week-mobile__reminders">
                    {reminders.map((reminder) => (
                      <div key={reminder.id} className="week-mobile__reminder">
                        <EmojiImg
                          emoji={reminder.emoji}
                          code={reminder.emojiCode}
                          className="week-mobile__reminder-emoji"
                        />
                        <span className="week-mobile__reminder-text">
                          {reminder.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {todos.length > 0 && (
                  <div className="week-mobile__todos">
                    {todos.map((todo) => (
                      <div
                        key={todo.id}
                        className={`week-mobile__todo${
                          todo.done ? " week-mobile__todo--done" : ""
                        }`}
                      >
                        <span className="week-mobile__todo-dot" />
                        <span className="week-mobile__todo-text">
                          {todo.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="week-mobile__schedule">
                {hours.map((h) => (
                  <div key={h} className="week-mobile__line" />
                ))}
                <div className="week-mobile__events">
                  {events.map((event) => {
                    const type = getEventType(event.type);
                    const top = ((event.start - DAY_START_MIN) / total) * 100;
                    const height = ((event.end - event.start) / total) * 100;
                    return (
                      <div
                        key={event.id}
                        className="week-mobile__event"
                        style={{
                          top: `${top}%`,
                          height: `${height}%`,
                          background: type.color,
                          color: type.text,
                        }}
                      >
                        <span className="week-mobile__event-title">
                          {event.title}
                        </span>
                        <span className="week-mobile__event-time">
                          {formatTime(event.start)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView() {
  const { year, week } = useParams();
  const navigate = useNavigate();
  const yearNumber = Number(year);
  const weekNumber = Number(week);

  const [habits, setHabits] = usePersistedState(habitsKey(), INITIAL_HABITS);
  const [checks, setChecks] = usePersistedState(
    checksKey(yearNumber, weekNumber),
    {},
  );
  const [addModalKey, setAddModalKey] = useState(null);
  const [refresh, setRefresh] = useState(0);

  const weekDates = getWeekDates(yearNumber, weekNumber);
  const refMonth = weekDates[0].getUTCMonth();

  const isMobile = useIsMobile();

  const goWeek = (delta) => {
    const next = weekNumber + delta;
    if (next < 1) return;
    navigate(`/year/${yearNumber}/week/${next}`);
  };

  const now = new Date();
  const todayIndex = weekDates.findIndex(
    (date) =>
      date.getUTCFullYear() === now.getFullYear() &&
      date.getUTCMonth() === now.getMonth() &&
      date.getUTCDate() === now.getDate(),
  );

  const toggle = (habitId, dayIndex) => {
    const key = `${habitId}-${dayIndex}`;
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renameHabit = (id, name) => {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, name } : h)));
  };

  const addHabit = (name) => {
    setHabits((prev) => [...prev, { id: `h-${Date.now()}`, name }]);
  };

  const removeHabit = (id) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  if (isMobile) {
    return (
      <div className="week-view week-view--mobile">
        <div className="week-view__header">
          <button
            className="week-view__back"
            onClick={() => navigate(`/year/${yearNumber}/month/${refMonth}`)}
            aria-label="Volver"
          >
            ‹
          </button>
          <div className="week-view__heading">
            <h1 className="week-view__title">
              Semana {weekNumber} · {yearNumber}
            </h1>
            <Breadcrumbs
              items={[
                { label: String(yearNumber), to: `/year/${yearNumber}` },
                {
                  label: MONTHS[refMonth],
                  to: `/year/${yearNumber}/month/${refMonth}`,
                },
              ]}
            />
          </div>
          <div className="week-view__nav">
            <button
              className="week-view__nav-btn"
              onClick={() => goWeek(-1)}
              aria-label="Semana anterior"
            >
              ‹
            </button>
            <button
              className="week-view__nav-btn"
              onClick={() => goWeek(1)}
              aria-label="Semana siguiente"
            >
              ›
            </button>
          </div>
        </div>

        <WeekMobile
          weekDates={weekDates}
          navigate={navigate}
          refresh={refresh}
          habits={habits}
          checks={checks}
          todayIndex={todayIndex}
          onToggle={toggle}
          onRename={renameHabit}
          onAdd={addHabit}
          onRemove={removeHabit}
        />

        {addModalKey && (
          <AddDayModal
            dateKey={addModalKey}
            onClose={() => setAddModalKey(null)}
            onSaved={() => setRefresh((n) => n + 1)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="week-view">
      <div className="week-view__header">
        <button
          className="week-view__back"
          onClick={() => navigate(-1)}
          aria-label="Volver"
        >
          ‹
        </button>
        <div className="week-view__heading">
          <h1 className="week-view__title">
            Semana {weekNumber} · {yearNumber}
          </h1>
          <Breadcrumbs
            items={[
              { label: String(yearNumber), to: `/year/${yearNumber}` },
              {
                label: MONTHS[refMonth],
                to: `/year/${yearNumber}/month/${refMonth}`,
              },
            ]}
          />
        </div>
        <div className="week-view__weeks">
          {getMonthWeeks(yearNumber, refMonth).map((w, i) => (
            <button
              key={w.weekNumber}
              className={`month-pill${w.weekNumber === weekNumber ? " month-pill--active" : ""}`}
              onClick={() =>
                navigate(`/year/${yearNumber}/week/${w.weekNumber}`)
              }
            >
              S{i + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="week-view__top">
        <MiniCalendar
          year={yearNumber}
          month={refMonth}
          weekNumber={weekNumber}
        />
        <HabitsTable
          habits={habits}
          checks={checks}
          todayIndex={todayIndex}
          onToggle={toggle}
          onRename={renameHabit}
          onAdd={addHabit}
          onRemove={removeHabit}
        />
      </div>

      <div className="week-view__days" data-refresh={refresh}>
        {weekDates.map((date, i) => {
          const dk = dateKey(date);
          const todos = load(todosKey(dk), []).filter(
            (t) => !t.date || t.date === dk,
          );
          const events = load(eventsKey(dk), [])
            .filter((e) => !e.date || e.date === dk)
            .slice()
            .sort((a, b) => a.start - b.start);
          const reminders = load(remindersKey(dk), []).filter(
            (r) => !r.date || r.date === dk,
          );
          const visibleTodos = todos.slice(0, 3);
          const now = new Date();
          const isToday =
            now.getFullYear() === date.getUTCFullYear() &&
            now.getMonth() === date.getUTCMonth() &&
            now.getDate() === date.getUTCDate();

          return (
            <div
              key={i}
              className="day-column"
              onClick={() =>
                navigate(
                  `/year/${date.getUTCFullYear()}/month/${date.getUTCMonth()}/day/${date.getUTCDate()}`,
                )
              }
            >
              <div className="day-column__header">
                <span className="day-column__name">{WEEKDAYS_FULL[i]}</span>
                <span
                  className={`day-column__number${
                    isToday ? " day-column__number--today" : ""
                  }`}
                >
                  {date.getUTCDate()}
                </span>
              </div>
              <div className="day-column__body">
                {reminders.length > 0 && (
                  <div className="day-column__reminders">
                    {reminders.map((reminder) => (
                      <div key={reminder.id} className="day-column__reminder">
                        <EmojiImg
                          emoji={reminder.emoji}
                          code={reminder.emojiCode}
                          className="day-column__reminder-emoji"
                        />
                        <span className="day-column__reminder-text">
                          {reminder.text}
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
                        <span className="day-column__todo-text">
                          {todo.text}
                        </span>
                      </div>
                    ))}
                    {todos.length > 3 && (
                      <div className="day-column__todo day-column__todo--more">
                        …
                      </div>
                    )}
                  </div>
                )}
                <div className="day-column__events">
                  {events.map((event) => {
                    const type = getEventType(event.type);
                    const duration = event.end - event.start;
                    const height = Math.round(duration * 0.45);
                    return (
                      <div
                        key={event.id}
                        className="day-column__event"
                        style={{
                          minHeight: `${height}px`,
                          background: type.color,
                          color: type.text,
                        }}
                      >
                        <span className="day-column__event-title">
                          {event.title}
                        </span>
                        <span className="day-column__event-time">
                          {formatTime(event.start)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <button
                  className="day-column__add"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddModalKey(dk);
                  }}
                >
                  + Agregar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {addModalKey && (
        <AddDayModal
          dateKey={addModalKey}
          onClose={() => setAddModalKey(null)}
          onSaved={() => setRefresh((n) => n + 1)}
        />
      )}
    </div>
  );
}

export default WeekView;
