import { useState, useRef, useEffect } from "react";
import { usePersistedState, recipesKey } from "../utils/storage";
import {
  RecipeModal,
  RecipeDetailModal,
  TAG_COLORS,
} from "../components/RecipeModal";
import ConfirmDialog from "../components/ConfirmDialog";
import "./Comidas.css";

const SECTIONS = [
  { tag: "desayuno", label: "Desayunos" },
  { tag: "almuerzo", label: "Almuerzos" },
  { tag: "cena", label: "Cenas" },
  { tag: "postre", label: "Postres" },
];

function useGridColumns(ref) {
  const [columns, setColumns] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const cols = getComputedStyle(el)
        .gridTemplateColumns.split(" ")
        .filter(Boolean).length;
      setColumns(cols);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return columns;
}

function RecipeCard({ recipe, accent, onClick }) {
  return (
    <button
      className="recipe-card"
      onClick={onClick}
      style={{ background: accent.bg }}
    >
      <div className="recipe-card__photo">
        {recipe.photo ? (
          <img src={recipe.photo} alt={recipe.title} />
        ) : (
          <span className="recipe-card__placeholder">🍽️</span>
        )}
      </div>
      <div className="recipe-card__body">
        <span className="recipe-card__title">{recipe.title}</span>
        <span className="recipe-card__count">
          {recipe.ingredients.length}{" "}
          {recipe.ingredients.length === 1 ? "ingrediente" : "ingredientes"}
        </span>
      </div>
    </button>
  );
}

function Section({ tag, label, recipes, onOpen, expanded, onToggleExpand }) {
  const gridRef = useRef(null);
  const columns = useGridColumns(gridRef);
  const accent = TAG_COLORS[tag];

  const perRow = columns || recipes.length;
  const shown = expanded ? recipes : recipes.slice(0, perRow);
  const needsSecondRow = recipes.length > perRow;

  return (
    <section className="comidas__section">
      <h2 className="comidas__section-title">
        <span
          className="comidas__section-dot"
          style={{ background: accent.color }}
        />
        {label}
      </h2>
      {recipes.length === 0 ? (
        <p className="comidas__empty">Aún no hay recetas aquí.</p>
      ) : (
        <>
          <div className="recipe-grid" ref={gridRef}>
            {shown.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                accent={accent}
                onClick={() => onOpen(recipe)}
              />
            ))}
          </div>
          {needsSecondRow && (
            <div className="comidas__more-row">
              <button
                className="comidas__more"
                onClick={onToggleExpand}
                aria-label={expanded ? "Ver menos" : "Ver más"}
                title={expanded ? "Ver menos" : "Ver más"}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: expanded ? "rotate(180deg)" : "none",
                    transition: "transform 0.2s ease",
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Comidas() {
  const [recipes, setRecipes] = usePersistedState(recipesKey(), []);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [expandedTags, setExpandedTags] = useState([]);

  const toggleExpand = (tag) =>
    setExpandedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );

  const openNew = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (recipe) => {
    setDetail(null);
    setEditing(recipe);
    setShowForm(true);
  };

  const saveRecipe = (recipe) => {
    setRecipes((prev) => {
      const exists = prev.some((r) => r.id === recipe.id);
      return exists
        ? prev.map((r) => (r.id === recipe.id ? recipe : r))
        : [...prev, recipe];
    });
    setShowForm(false);
    setEditing(null);
  };

  const deleteRecipe = () => {
    const id = confirmDelete.id;
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    setConfirmDelete(null);
    setDetail(null);
  };

  const anyExpanded = expandedTags.length > 0;

  return (
    <div
      className={`page comidas-page${anyExpanded ? " comidas-page--scroll" : ""}`}
    >
      <div className="page__header">
        <h1 className="page__title comidas__title">Comidas</h1>
        <button className="comidas__add-btn" onClick={openNew}>
          + Agregar receta
        </button>
      </div>

      <div className="comidas__sections">
        {SECTIONS.map((section) => (
          <Section
            key={section.tag}
            tag={section.tag}
            label={section.label}
            recipes={recipes.filter((r) => r.tags.includes(section.tag))}
            onOpen={setDetail}
            expanded={expandedTags.includes(section.tag)}
            onToggleExpand={() => toggleExpand(section.tag)}
          />
        ))}
      </div>

      {detail && (
        <RecipeDetailModal
          recipe={detail}
          onClose={() => setDetail(null)}
          onEdit={() => openEdit(detail)}
          onDelete={() => setConfirmDelete(detail)}
        />
      )}

      {showForm && (
        <RecipeModal
          recipe={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={saveRecipe}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar receta"
          message={`¿Seguro que deseas eliminar "${confirmDelete.title}"? Esta acción no se puede deshacer.`}
          onConfirm={deleteRecipe}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

export default Comidas;
