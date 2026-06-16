import { useState } from 'react'
import { compressImageToDataURL } from '../utils/image'

export const MEAL_TAGS = [
  { id: 'desayuno', label: 'Desayuno' },
  { id: 'almuerzo', label: 'Almuerzo' },
  { id: 'cena', label: 'Cena' },
  { id: 'postre', label: 'Postre' },
]

export const TAG_COLORS = {
  desayuno: { color: 'C87F1E_1', bg: 'FBEEDE_1' },
  almuerzo: { color: '3F8F5C_1', bg: 'E6F3EA_1' },
  cena: { color: '5A6DB0_1', bg: 'E8ECF8_1' },
  postre: { color: 'var(--cat-pink)', bg: 'var(--cat-pink-bg)' },
}

const EMPTY = {
  title: '',
  photo: '',
  ingredients: [''],
  preparation: '',
  tags: [],
}

// Resize + compress a picked image into a small JPEG data URL.
//
// CRÍTICO: todo el planner (recetas incluidas) se respalda como UN solo
// documento de Firestore, que tiene un límite duro de 1 MiB. Una foto de la
// cámara pesa varios MB; guardada en crudo (base64) hace que la subida a la
// nube falle en silencio y la foto se pierda al sincronizar entre dispositivos.
// La lógica de reescalado/compresión vive en utils/image.js.


export function RecipeModal({ recipe, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    ...recipe,
    ingredients:
      recipe && recipe.ingredients.length ? [...recipe.ingredients] : [''],
    tags: recipe ? [...recipe.tags] : [],
  }))

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const setIngredient = (i, value) =>
    setForm((prev) => {
      const ingredients = [...prev.ingredients]
      ingredients[i] = value
      return { ...prev, ingredients }
    })

  const addIngredient = () =>
    setForm((prev) => ({ ...prev, ingredients: [...prev.ingredients, ''] }))

  const removeIngredient = (i) =>
    setForm((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, idx) => idx !== i),
    }))

  const toggleTag = (tagId) =>
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter((t) => t !== tagId)
        : [...prev.tags, tagId],
    }))

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await compressImageToDataURL(file)
    set('photo', dataUrl)
  }

  const canSave = form.title.trim() && form.tags.length > 0

  const submit = () => {
    if (!canSave) return
    const ingredients = form.ingredients
      .map((s) => s.trim())
      .filter(Boolean)
    onSave({
      id: recipe?.id || `r-${Date.now()}`,
      title: form.title.trim(),
      photo: form.photo,
      ingredients,
      preparation: form.preparation.trim(),
      tags: form.tags,
    })
  }

  return (
    <div className="modal-overlay">
      <div
        className="modal modal--form"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal__title">
          {recipe ? 'Editar receta' : 'Nueva receta'}
        </h2>

        <label className="field">
          <span className="field__label">Título</span>
          <input
            className="field__input"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Nombre de la receta"
            autoFocus
          />
        </label>

        <div className="field">
          <span className="field__label">Foto</span>
          {form.photo ? (
            <div className="recipe-photo-edit">
              <img
                className="recipe-photo-edit__img"
                src={form.photo}
                alt="Vista previa"
              />
              <button
                type="button"
                className="recipe-photo-edit__remove"
                onClick={() => set('photo', '')}
              >
                Quitar foto
              </button>
            </div>
          ) : (
            <label className="recipe-photo-upload">
              <input
                type="file"
                accept="image/*"
                onChange={handlePhoto}
                hidden
              />
              <span>+ Subir foto</span>
            </label>
          )}
        </div>

        <div className="field">
          <span className="field__label">Ingredientes</span>
          {form.ingredients.map((ing, i) => (
            <div key={i} className="ingredient-row">
              <input
                className="field__input"
                value={ing}
                onChange={(e) => setIngredient(i, e.target.value)}
                placeholder={`Ingrediente ${i + 1}`}
              />
              {form.ingredients.length > 1 && (
                <button
                  type="button"
                  className="ingredient-row__remove"
                  onClick={() => removeIngredient(i)}
                  aria-label="Quitar ingrediente"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="ingredient-add"
            onClick={addIngredient}
          >
            + Agregar ingrediente
          </button>
        </div>

        <label className="field">
          <span className="field__label">Preparación</span>
          <textarea
            className="field__input field__input--area"
            rows={4}
            value={form.preparation}
            onChange={(e) => set('preparation', e.target.value)}
            placeholder="Pasos de preparación"
          />
        </label>

        <div className="field">
          <span className="field__label">Tags</span>
          <div className="tag-picker">
            {MEAL_TAGS.map((tag) => {
              const active = form.tags.includes(tag.id)
              const c = TAG_COLORS[tag.id]
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`tag-pill${active ? ' tag-pill--active' : ''}`}
                  style={
                    active
                      ? { color: c.color, background: c.bg, borderColor: 'transparent' }
                      : { color: c.color }
                  }
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="modal__actions">
          <button
            className="modal__btn modal__btn--cancel"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="modal__btn modal__btn--primary"
            onClick={submit}
            disabled={!canSave}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

export function RecipeDetailModal({ recipe, onClose, onEdit, onDelete }) {
  const tagLabels = MEAL_TAGS.filter((t) => recipe.tags.includes(t.id))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal modal--form recipe-detail"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="recipe-detail__actions">
          {onEdit && (
            <button
              className="icon-btn"
              onClick={onEdit}
              aria-label="Editar"
              title="Editar"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              className="icon-btn icon-btn--danger"
              onClick={onDelete}
              aria-label="Eliminar"
              title="Eliminar"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          )}
        </div>

        <h2 className="modal__title recipe-detail__title">{recipe.title}</h2>

        {tagLabels.length > 0 && (
          <div className="recipe-detail__tags">
            {tagLabels.map((t) => {
              const c = TAG_COLORS[t.id]
              return (
                <span
                  key={t.id}
                  className="tag-pill tag-pill--static"
                  style={{ color: c.color, background: c.bg }}
                >
                  {t.label}
                </span>
              )
            })}
          </div>
        )}

        {recipe.photo && (
          <img
            className="recipe-detail__photo"
            src={recipe.photo}
            alt={recipe.title}
          />
        )}

        {recipe.ingredients.length > 0 && (
          <div className="recipe-detail__section">
            <h3 className="recipe-detail__heading">Ingredientes</h3>
            <ul className="recipe-detail__ingredients">
              {recipe.ingredients.map((ing, i) => (
                <li key={i}>{ing}</li>
              ))}
            </ul>
          </div>
        )}

        {recipe.preparation && (
          <div className="recipe-detail__section">
            <h3 className="recipe-detail__heading">Preparación</h3>
            <p className="recipe-detail__preparation">{recipe.preparation}</p>
          </div>
        )}
      </div>
    </div>
  )
}