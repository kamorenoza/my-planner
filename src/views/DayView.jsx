import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MONTHS, WEEKDAYS_FULL, getISOWeek, getMonthDays } from '../utils/calendar'
import {
  DAY_START_MIN,
  DAY_END_MIN,
  getEventType,
  getRepeatLabel,
  formatTime,
} from '../utils/events'
import {
  isHolidayReminder,
  sortRemindersHolidayFirst,
} from '../utils/holidaysCO'
import EventModal from '../components/EventModal'
import EmojiImg from '../components/EmojiImg'
import PlateIcon from '../components/PlateIcon'
import ReminderModal from '../components/ReminderModal'
import Breadcrumbs from '../components/Breadcrumbs'
import ConfirmDialog from '../components/ConfirmDialog'
import { TAG_COLORS, RecipeDetailModal } from '../components/RecipeModal'
import { compressImageToDataURL } from '../utils/image'
import {
  usePersistedState,
  eventsKey,
  todosKey,
  mealsKey,
  remindersKey,
  recipesKey,
  habitsKey,
  checksKey,
  load,
} from '../utils/storage'
import {
  saveNewEvent,
  editEvent,
  removeEvent,
} from '../utils/recurrence'
import { useIsMobile } from '../utils/useIsMobile'
import './DayView.css'

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6) // 6 -> 21 (blocks), 22 label added separately

const MEALS = [
  { id: 'desayuno', label: 'Desayuno' },
  { id: 'almuerzo', label: 'Almuerzo' },
  { id: 'cena', label: 'Cena' },
]

// Must match the default habits seeded by WeekView so both views share the
// same global 'habits' store.
const INITIAL_HABITS = [{ id: 'h1', name: 'Ejercicio' }]

function formatHour(hour) {
  const period = hour < 12 ? 'am' : 'pm'
  const h = hour % 12 === 0 ? 12 : hour % 12
  return `${h}:00 ${period}`
}

function EventBlock({ event, expanded, onToggle, onEdit }) {
  const type = getEventType(event.type)
  const total = DAY_END_MIN - DAY_START_MIN
  const duration = event.end - event.start
  const top = ((event.start - DAY_START_MIN) / total) * 100
  const height = (duration / total) * 100

  // Compact: short events (<= 30 min) shown on a single centered line
  const compact = !expanded && duration <= 30
  // Info detail shown automatically based on duration
  const showTime = !compact && (duration > 30 || expanded)
  const showDetails = duration >= 90 || expanded

  return (
    <div
      className={`event-block${expanded ? ' event-block--expanded' : ''}${compact ? ' event-block--compact' : ''}`}
      style={{
        top: `${top}%`,
        height: expanded ? 'auto' : `${height}%`,
        minHeight: expanded ? `${height}%` : undefined,
        background: type.color,
        color: type.text,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onToggle(event.id)
      }}
    >
      <div className="event-block__head">
        <span className="event-block__title">{event.title}</span>
        {compact && (
          <span className="event-block__time event-block__time--inline">
            {formatTime(event.start)} - {formatTime(event.end)}
          </span>
        )}
        <button
          className="event-block__edit"
          style={{ color: type.text }}
          onClick={(e) => {
            e.stopPropagation()
            onEdit(event)
          }}
          aria-label="Editar evento"
        >
          {'\u270E'}
        </button>
      </div>
      {showTime && (
        <span className="event-block__time">
          {formatTime(event.start)} - {formatTime(event.end)}
        </span>
      )}
      {showDetails && (
        <>
          <span className="event-block__type">{type.label}</span>
          {event.seriesId && (
            <span className="event-block__repeat">
              {'\u27F3'} {getRepeatLabel(event.repeat)}
            </span>
          )}
          {event.place && (
            <span className="event-block__place">{'\uD83D\uDCCD'} {event.place}</span>
          )}
          {event.comments && (
            <span className="event-block__comments">{event.comments}</span>
          )}
        </>
      )}
    </div>
  )
}

function Schedule({ events, defaultDate, onAdd, onUpdate, onDelete }) {
  const [showModal, setShowModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [scopePrompt, setScopePrompt] = useState(null)

  const toggleExpand = (id) =>
    setExpandedId((prev) => (prev === id ? null : id))

  useEffect(() => {
    if (!expandedId) return
    const close = () => setExpandedId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [expandedId])

  const openNew = () => {
    setEditingEvent(null)
    setShowModal(true)
  }

  const openEdit = (event) => {
    setEditingEvent(event)
    setShowModal(true)
  }

  const handleSave = (event) => {
    if (editingEvent) {
      if (editingEvent.seriesId) {
        // Recurring event: ask whether to apply to one or all occurrences.
        setScopePrompt({ mode: 'edit', event })
        return
      }
      onUpdate(event)
    } else {
      onAdd(event)
    }
    setShowModal(false)
    setEditingEvent(null)
  }

  const requestDelete = () => {
    setConfirmDelete(editingEvent)
  }

  const confirmRemove = (scope) => {
    onDelete(confirmDelete.id, scope)
    setConfirmDelete(null)
    setShowModal(false)
    setEditingEvent(null)
  }

  return (
    <div className="schedule">
      <div className="schedule__head-bar">
        <h3 className="schedule__title">Horario</h3>
        <button className="schedule__add-btn" onClick={openNew}>
          + Agregar
        </button>
      </div>
      <div className="schedule__body">
        <div className="schedule__grid" onClick={() => setExpandedId(null)}>
          {HOURS.map((hour) => (
            <div key={hour} className="schedule__hour-row">
              <span className="schedule__hour">{formatHour(hour)}</span>
              <div className="schedule__line"></div>
            </div>
          ))}
          <div className="schedule__last-label">
            <span className="schedule__hour">{formatHour(22)}</span>
            <div className="schedule__line"></div>
          </div>
          <div className="schedule__events">
            {events.map((event) => (
              <EventBlock
                key={event.id}
                event={event}
                expanded={expandedId === event.id}
                onToggle={toggleExpand}
                onEdit={openEdit}
              />
            ))}
          </div>
        </div>
      </div>

      {showModal && (
        <EventModal
          defaultDate={defaultDate}
          event={editingEvent}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false)
            setEditingEvent(null)
          }}
          onDelete={requestDelete}
        />
      )}

      {scopePrompt && (
        <div className="modal-overlay">
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">Evento que se repite</h3>
            <p className="modal__text">
              &iquest;Quieres aplicar los cambios solo a este evento o a todos los de
              la serie?
            </p>
            <div className="modal__actions modal__actions--stack">
              <button
                className="modal__btn modal__btn--primary"
                onClick={() => {
                  onUpdate(scopePrompt.event, 'one')
                  setScopePrompt(null)
                  setShowModal(false)
                  setEditingEvent(null)
                }}
              >
                Solo este evento
              </button>
              <button
                className="modal__btn modal__btn--primary"
                onClick={() => {
                  onUpdate(scopePrompt.event, 'all')
                  setScopePrompt(null)
                  setShowModal(false)
                  setEditingEvent(null)
                }}
              >
                Todos los eventos
              </button>
              <button
                className="modal__btn modal__btn--cancel"
                onClick={() => setScopePrompt(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal__title">Eliminar evento</h3>
            <p className="modal__text">
              {confirmDelete.seriesId
                ? `\u201C${confirmDelete.title}\u201D se repite. \u00BFQu\u00E9 quieres eliminar?`
                : `\u00BFSeguro que quieres eliminar \u201C${confirmDelete.title}\u201D?`}
            </p>
            {confirmDelete.seriesId ? (
              <div className="modal__actions modal__actions--stack">
                <button
                  className="modal__btn modal__btn--danger"
                  onClick={() => confirmRemove('one')}
                >
                  Eliminar este evento
                </button>
                <button
                  className="modal__btn modal__btn--danger"
                  onClick={() => confirmRemove('future')}
                >
                  Eliminar de este en adelante
                </button>
                <button
                  className="modal__btn modal__btn--danger"
                  onClick={() => confirmRemove('all')}
                >
                  Eliminar todos
                </button>
                <button
                  className="modal__btn modal__btn--cancel"
                  onClick={() => setConfirmDelete(null)}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="modal__actions">
                <button
                  className="modal__btn modal__btn--cancel"
                  onClick={() => setConfirmDelete(null)}
                >
                  Cancelar
                </button>
                <button
                  className="modal__btn modal__btn--danger"
                  onClick={() => confirmRemove()}
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
function Todo({ storageKey, date, year, week, weekdayIndex }) {
  const [items, setItems] = usePersistedState(storageKey, [])
  const [habits] = usePersistedState(habitsKey(), INITIAL_HABITS)
  const [checks, setChecks] = usePersistedState(checksKey(year, week), {})
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState('')
  const [confirmItem, setConfirmItem] = useState(null)

  const toggleHabit = (habitId) => {
    const key = `${habitId}-${weekdayIndex}`
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const commitAdd = () => {
    const text = newText.trim()
    if (text) {
      setItems((prev) => [...prev, { id: `t-${Date.now()}`, text, done: false, date }])
    }
    setNewText('')
    setAdding(false)
  }

  const toggle = (id) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
    )
  }

  const remove = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setDraft(item.text)
  }

  const commitEdit = (id) => {
    const text = draft.trim()
    if (text) {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, text } : it)),
      )
    }
    setEditingId(null)
    setDraft('')
  }

  return (
    <div className="todo">
      <div className="todo__head-bar">
        <h3 className="todo__title">TODO</h3>
        <button className="todo__add-btn" onClick={() => setAdding(true)}>
          + Agregar
        </button>
      </div>
      <div className="todo__list">
        {habits.map((habit) => {
          const checked = !!checks[`${habit.id}-${weekdayIndex}`]
          return (
            <div key={habit.id} className="todo__item todo__item--habit">
              <button
                className={`todo__check${checked ? ' todo__check--on' : ''}`}
                onClick={() => toggleHabit(habit.id)}
                aria-label={`Marcar ${habit.name}`}
              >
                {checked ? '\u2713' : ''}
              </button>
              <span
                className={`todo__text${checked ? ' todo__text--done' : ''}`}
              >
                {habit.name}
              </span>
              <span className="todo__habit-tag">H&aacute;bito</span>
            </div>
          )
        })}
        {items.map((item) => (
          <div key={item.id} className="todo__item">
            <button
              className={`todo__check${item.done ? ' todo__check--on' : ''}`}
              onClick={() => toggle(item.id)}
              aria-label="Marcar"
            >
              {item.done ? '\u2713' : ''}
            </button>
            {editingId === item.id ? (
              <input
                className="todo__input"
                value={draft}
                autoFocus
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => commitEdit(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit(item.id)
                  if (e.key === 'Escape') {
                    setEditingId(null)
                    setDraft('')
                  }
                }}
              />
            ) : (
              <span
                className={`todo__text${item.done ? ' todo__text--done' : ''}`}
                onClick={() => startEdit(item)}
                title="Editar"
              >
                {item.text}
              </span>
            )}
            <button
              className="todo__remove"
              onClick={() => setConfirmItem(item)}
              aria-label="Eliminar"
            >
              {'\u00D7'}
            </button>
          </div>
        ))}
        {adding && (
          <div className="todo__item">
            <span className="todo__check todo__check--placeholder"></span>
            <input
              className="todo__input"
              value={newText}
              autoFocus
              placeholder="Nueva tarea"
              onChange={(e) => setNewText(e.target.value)}
              onBlur={commitAdd}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitAdd()
                if (e.key === 'Escape') {
                  setNewText('')
                  setAdding(false)
                }
              }}
            />
          </div>
        )}
        {items.length === 0 && habits.length === 0 && !adding && (
          <p className="todo__empty">Sin tareas todav&iacute;a</p>
        )}
      </div>

      {confirmItem && (
        <ConfirmDialog
          title="Eliminar tarea"
          message={`\u00BFSeguro que deseas eliminar "${confirmItem.text}"?`}
          onConfirm={() => {
            remove(confirmItem.id)
            setConfirmItem(null)
          }}
          onCancel={() => setConfirmItem(null)}
        />
      )}
    </div>
  )
}

function Reminders({ items, setItems, date }) {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmItem, setConfirmItem] = useState(null)

  const openNew = () => {
    setEditing(null)
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setShowModal(true)
  }

  const saveReminder = (reminder) => {
    const stamped = { ...reminder, date }
    setItems((prev) => {
      const exists = prev.some((it) => it.id === stamped.id)
      return exists
        ? prev.map((it) => (it.id === stamped.id ? stamped : it))
        : [...prev, stamped]
    })
    setShowModal(false)
    setEditing(null)
  }

  const remove = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const dayHasHolidayHere = items.some(isHolidayReminder)
  const sortedItems = sortRemindersHolidayFirst(items)

  return (
    <div className="reminders">
      <div className="reminders__head-bar">
        <h3 className="reminders__title">Recordatorios</h3>
        <button className="reminders__add-btn" onClick={openNew}>
          + Agregar
        </button>
      </div>
      <div className="reminders__list">
        {items.length === 0 ? (
          <p className="reminders__empty">Sin recordatorios todav&iacute;a</p>
        ) : (
          sortedItems.map((item) => {
            const holiday = isHolidayReminder(item)
            return (
              <div
                key={item.id}
                className={`reminder-card${holiday ? ' reminder-card--holiday' : ''}`}
              >
                <EmojiImg
                  emoji={item.emoji}
                  code={item.emojiCode}
                  className="reminder-card__emoji"
                />
                <span
                  className="reminder-card__text"
                  onClick={() => (holiday ? setConfirmItem(item) : openEdit(item))}
                  title={holiday ? 'Festivo' : 'Editar'}
                >
                  {holiday ? `Festivo: ${item.text}` : item.text}
                </span>
                <button
                  className="reminder-card__remove"
                  onClick={() => setConfirmItem(item)}
                  aria-label="Eliminar"
                >
                  {'\u00D7'}
                </button>
              </div>
            )
          })
        )}
      </div>

      {showModal && (
        <ReminderModal
          reminder={editing}
          canMarkHoliday={!dayHasHolidayHere}
          onSave={saveReminder}
          onClose={() => {
            setShowModal(false)
            setEditing(null)
          }}
        />
      )}

      {confirmItem && (
        <ConfirmDialog
          title={
            isHolidayReminder(confirmItem)
              ? 'Eliminar festivo'
              : 'Eliminar recordatorio'
          }
          message={
            isHolidayReminder(confirmItem)
              ? `\u00BFQuieres eliminar el festivo "${confirmItem.text}"?`
              : `\u00BFSeguro que deseas eliminar "${confirmItem.text}"?`
          }
          onConfirm={() => {
            remove(confirmItem.id)
            setConfirmItem(null)
          }}
          onCancel={() => setConfirmItem(null)}
        />
      )}
    </div>
  )
}

function MealPicker({ tag, recipes, onPick, onAddOther, onClose }) {
  const accent = TAG_COLORS[tag]
  const [query, setQuery] = useState('')
  const [otherOpen, setOtherOpen] = useState(false)
  const [otherName, setOtherName] = useState('')
  const [otherPhoto, setOtherPhoto] = useState('')

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const handleOtherPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await compressImageToDataURL(file)
    setOtherPhoto(dataUrl)
  }

  const addOther = () => {
    const title = otherName.trim()
    if (!title) return
    onAddOther({ title, photo: otherPhoto })
  }
  return (
    <div className="modal-overlay">
      <div className="modal modal--form" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal__title">Elegir receta</h2>

        <input
          className="field__input meal-picker__search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={'Buscar\u2026'}
          autoFocus
        />

        <div className="meal-picker__other">
          {otherOpen ? (
            <div className="meal-picker__other-form">
              <span className="meal-picker__thumb" style={{ background: accent.bg }}>
                {otherPhoto ? (
                  <img src={otherPhoto} alt="" />
                ) : (
                  <label className="meal-picker__other-upload">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleOtherPhoto}
                      hidden
                    />
                    <PlateIcon className="meal-picker__thumb-icon" />
                  </label>
                )}
              </span>
              <input
                className="field__input"
                value={otherName}
                onChange={(e) => setOtherName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addOther()
                }}
                placeholder="Nombre"
                autoFocus
              />
              <button
                type="button"
                className="meal-picker__other-add"
                onClick={addOther}
                disabled={!otherName.trim()}
              >
                Agregar
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="meal-picker__item meal-picker__item--other"
              onClick={() => setOtherOpen(true)}
            >
              <span className="meal-picker__thumb meal-picker__thumb--other">+</span>
              <span className="meal-picker__info">
                <span className="meal-picker__name">Otro</span>
                <span className="meal-picker__count">
                  Solo para hoy, sin guardar
                </span>
              </span>
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="modal__text">
            {recipes.length === 0
              ? 'No hay recetas con este tag todav\u00EDa. Agr\u00E9galas en la secci\u00F3n Comidas o usa \u201COtro\u201D.'
              : 'Sin resultados para la b\u00FAsqueda.'}
          </p>
        ) : (
          <div className="meal-picker__list">
            {filtered.map((recipe) => (
              <button
                key={recipe.id}
                className="meal-picker__item"
                onClick={() => onPick(recipe)}
              >
                <span
                  className="meal-picker__thumb"
                  style={{ background: accent.bg }}
                >
                  {recipe.photo ? (
                    <img src={recipe.photo} alt={recipe.title} />
                  ) : (
                    <PlateIcon className="meal-picker__thumb-icon" />
                  )}
                </span>
                <span className="meal-picker__info">
                  <span className="meal-picker__name">{recipe.title}</span>
                  <span className="meal-picker__count">
                    {recipe.ingredients.length}{' '}
                    {recipe.ingredients.length === 1
                      ? 'ingrediente'
                      : 'ingredientes'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
        <div className="modal__actions">
          <button className="modal__btn modal__btn--cancel" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

function Meals({ storageKey }) {
  const [meals, setMeals] = usePersistedState(storageKey, {})
  const [picking, setPicking] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const allRecipes = load(recipesKey(), [])

  const recipesById = Object.fromEntries(allRecipes.map((r) => [r.id, r]))

  // Cada item guardado puede ser el id (string) de una receta existente, o un
  // objeto ad-hoc { adhoc:true, id, title, photo } que solo vive en este día.
  const resolveItem = (item) => {
    if (typeof item === 'string') {
      const recipe = recipesById[item]
      return recipe ? { id: recipe.id, recipe } : null
    }
    if (item && item.adhoc) {
      return { id: item.id, adhoc: item }
    }
    return null
  }

  const itemId = (item) => (typeof item === 'string' ? item : item && item.id)

  const addRecipe = (mealId, recipe) => {
    setMeals((prev) => {
      const current = prev[mealId] || []
      if (current.some((it) => itemId(it) === recipe.id)) return prev
      return { ...prev, [mealId]: [...current, recipe.id] }
    })
    setPicking(null)
  }

  const addOther = (mealId, { title, photo }) => {
    const entry = { adhoc: true, id: `adhoc-${Date.now()}`, title, photo }
    setMeals((prev) => ({
      ...prev,
      [mealId]: [...(prev[mealId] || []), entry],
    }))
    setPicking(null)
  }

  const removeRecipe = (mealId, id) => {
    setMeals((prev) => ({
      ...prev,
      [mealId]: (prev[mealId] || []).filter((it) => itemId(it) !== id),
    }))
  }

  // Quitar pidiendo confirmación SOLO si es un item ad-hoc ("Otro"), porque al
  // borrarlo se pierde (no existe en ningún otro lado). Las recetas reales se
  // quitan directo: siguen guardadas en la sección Comidas.
  const requestRemove = (mealId, resolved) => {
    if (resolved.adhoc) {
      setConfirmRemove({ mealId, id: resolved.id, title: resolved.adhoc.title })
    } else {
      removeRecipe(mealId, resolved.id)
    }
  }

  return (
    <div className="meals">
      <h3 className="meals__title">Comidas del d&iacute;a</h3>
      <div className="meals__list">
        {MEALS.map((meal) => {
          const accent = TAG_COLORS[meal.id]
          const selected = meals[meal.id] || []
          const canAddMore = selected.length < 4
          return (
            <div key={meal.id} className="meal-card">
              <span className="meal-card__label">{meal.label}</span>
              <div className="meal-card__items">
                {selected.map((item) => {
                  const resolved = resolveItem(item)
                  if (!resolved) return null
                  const data = resolved.recipe || resolved.adhoc
                  return (
                    <div
                      key={resolved.id}
                      className="meal-mini"
                      style={{ background: accent.bg }}
                      onClick={() =>
                        resolved.recipe ? setViewing(resolved.recipe) : null
                      }
                      role="button"
                      title={data.title}
                    >
                      <span className="meal-mini__photo">
                        {data.photo ? (
                          <img src={data.photo} alt={data.title} />
                        ) : (
                          <PlateIcon className="meal-mini__icon" />
                        )}
                      </span>
                      <span className="meal-mini__title">{data.title}</span>
                      <button
                        className="meal-mini__remove"
                        onClick={(e) => {
                          e.stopPropagation()
                          requestRemove(meal.id, resolved)
                        }}
                        aria-label="Quitar"
                      >
                        {'\u00D7'}
                      </button>
                    </div>
                  )
                })}
                {canAddMore && (
                  <button
                    className="meal-add"
                    onClick={() => setPicking(meal.id)}
                    aria-label={`Agregar ${meal.label}`}
                    title="Agregar"
                  >
                    +
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {picking && (
        <MealPicker
          tag={picking}
          recipes={allRecipes.filter((r) => r.tags.includes(picking))}
          onPick={(recipe) => addRecipe(picking, recipe)}
          onAddOther={(data) => addOther(picking, data)}
          onClose={() => setPicking(null)}
        />
      )}

      {viewing && (
        <RecipeDetailModal
          recipe={viewing}
          onClose={() => setViewing(null)}
        />
      )}

      {confirmRemove && (
        <ConfirmDialog
          title="Quitar comida"
          message={`\u00BFSeguro que va a eliminar "${confirmRemove.title}"?`}
          onConfirm={() => {
            removeRecipe(confirmRemove.mealId, confirmRemove.id)
            setConfirmRemove(null)
          }}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </div>
  )
}

function DayView() {
  const { year, month, day } = useParams()
  const navigate = useNavigate()
  const yearNumber = Number(year)
  const monthNumber = Number(month)
  const dayNumber = Number(day)

  const date = new Date(Date.UTC(yearNumber, monthNumber, dayNumber))
  const weekdayIndex = (date.getUTCDay() + 6) % 7
  const weekNumber = getISOWeek(yearNumber, monthNumber, dayNumber)
  const defaultDate = `${yearNumber}-${String(monthNumber + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`

  const [events, setEvents] = usePersistedState(eventsKey(defaultDate), [])
  const [reminders, setReminders] = usePersistedState(
    remindersKey(defaultDate),
    [],
  )
  const holidayReminder = reminders.find(isHolidayReminder)

  const refreshEvents = () => setEvents(load(eventsKey(defaultDate), []))

  const addEvent = (event) => {
    saveNewEvent(event)
    refreshEvents()
  }

  const updateEvent = (event, scope) => {
    const original = events.find((e) => e.id === event.id) || event
    editEvent(original, event, scope)
    refreshEvents()
  }

  const deleteEvent = (id, scope) => {
    const original = events.find((e) => e.id === id)
    if (original) removeEvent(original, scope)
    refreshEvents()
  }
  const isMobile = useIsMobile()

  const goDay = (delta) => {
    const d = new Date(Date.UTC(yearNumber, monthNumber, dayNumber + delta))
    navigate(
      `/year/${d.getUTCFullYear()}/month/${d.getUTCMonth()}/day/${d.getUTCDate()}`,
    )
  }

  return (
    <div className="day-view">
      <div
        className={`day-view__header${
          holidayReminder ? ' day-view__header--holiday' : ''
        }`}
      >
        <button
          className="day-view__back"
          onClick={() => navigate(`/year/${yearNumber}/week/${weekNumber}`)}
          aria-label="Volver"
        >
          {'\u2039'}
        </button>
        <div className="day-view__heading">
          <h1 className="day-view__title">
            {WEEKDAYS_FULL[weekdayIndex]} {'\u00B7'} {dayNumber} de {MONTHS[monthNumber]} {yearNumber}
          </h1>
          {holidayReminder && (
            <span className="day-view__holiday-badge">
              <EmojiImg
                emoji={holidayReminder.emoji || '\uD83C\uDF89'}
                code={holidayReminder.emojiCode || '1f389'}
                className="day-view__holiday-emoji"
              />
              Festivo: {holidayReminder.text}
            </span>
          )}
          <Breadcrumbs
            items={[
              { label: String(yearNumber), to: `/year/${yearNumber}` },
              {
                label: MONTHS[monthNumber],
                to: `/year/${yearNumber}/month/${monthNumber}`,
              },
              {
                label: `Semana ${weekNumber}`,
                to: `/year/${yearNumber}/week/${weekNumber}`,
              },
            ]}
          />
        </div>
        {isMobile ? (
          <div className="day-view__nav">
            <button
              className="day-view__nav-btn"
              onClick={() => goDay(-1)}
              aria-label={'D\u00EDa anterior'}
            >
              {'\u2039'}
            </button>
            <button
              className="day-view__nav-btn"
              onClick={() => goDay(1)}
              aria-label={'D\u00EDa siguiente'}
            >
              {'\u203A'}
            </button>
          </div>
        ) : (
          <div className="day-view__days">
            {getMonthDays(yearNumber, monthNumber)
              .filter((d) => d !== null)
              .map((d) => (
                <button
                  key={d}
                  className={`month-pill month-pill--mini${d === dayNumber ? ' month-pill--active' : ''}`}
                  onClick={() => navigate(`/year/${yearNumber}/month/${monthNumber}/day/${d}`)}
                >
                  {d}
                </button>
              ))}
          </div>
        )}
      </div>

      {isMobile ? (
        <div className="day-view__mobile">
          <Reminders items={reminders} setItems={setReminders} date={defaultDate} />
          <Todo
            storageKey={todosKey(defaultDate)}
            date={defaultDate}
            year={yearNumber}
            week={weekNumber}
            weekdayIndex={weekdayIndex}
          />
          <div className="day-view__col--schedule">
            <Schedule
              events={events}
              defaultDate={defaultDate}
              onAdd={addEvent}
              onUpdate={updateEvent}
              onDelete={deleteEvent}
            />
          </div>
          <Meals storageKey={mealsKey(defaultDate)} />
        </div>
      ) : (
        <div className="day-view__columns">
          <div className="day-view__col day-view__col--schedule">
            <Schedule
              events={events}
              defaultDate={defaultDate}
              onAdd={addEvent}
              onUpdate={updateEvent}
              onDelete={deleteEvent}
            />
          </div>
          <div className="day-view__col day-view__col--side">
            <Todo
              storageKey={todosKey(defaultDate)}
              date={defaultDate}
              year={yearNumber}
              week={weekNumber}
              weekdayIndex={weekdayIndex}
            />
            <Reminders items={reminders} setItems={setReminders} date={defaultDate} />
            <Meals storageKey={mealsKey(defaultDate)} />
          </div>
        </div>
      )}
    </div>
  )
}

export default DayView