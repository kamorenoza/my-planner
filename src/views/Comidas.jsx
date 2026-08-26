import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { usePersistedState, recipesKey } from "../utils/storage";
import {
  RecipeModal,
  RecipeDetailModal,
  TAG_COLORS,
} from "../components/RecipeModal";
import {
  deleteRecipeFromCloud,
  saveRecipeToCloud,
} from "../database/backup";
import ConfirmDialog from "../components/ConfirmDialog";
import PlateIcon from "../components/PlateIcon";
import "./Comidas.css";

const SECTIONS = [
  { tag: "desayuno", label: "Desayunos" },
  { tag: "almuerzo", label: "Almuerzos" },
  { tag: "cena", label: "Cenas" },
  { tag: "postre", label: "Postres" },
];

const FILTERS = [
  { tag: "todas", label: "Todas" },
  { tag: "desayuno", label: "Desayuno" },
  { tag: "almuerzo", label: "Almuerzo" },
  { tag: "cena", label: "Cena" },
  { tag: "postre", label: "Postre" },
];

function RecipeCard({ recipe, accent, onClick }) {
  return (
    <button
      className="recipe-card"
      onClick={onClick}
      style={{
        background: accent.bg,
        border: `1px solid color-mix(in srgb, ${accent.color} 35%, white)`,
      }}
    >
      <div className="recipe-card__photo">
        {recipe.photo ? (
          <img src={recipe.photo} alt={recipe.title} />
        ) : (
          <PlateIcon className="recipe-card__placeholder" />
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

function Section({ tag, label, recipes, open, filtering, onToggle, onOpen }) {
  const accent = TAG_COLORS[tag];

  return (
    <section
      className={`comidas__section${open ? " comidas__section--open" : ""}`}
    >
      <button
        type="button"
        className="comidas__section-header"
        onClick={filtering ? undefined : onToggle}
        aria-expanded={open}
        disabled={filtering}
      >
        <span className="comidas__section-title">
          <span
            className="comidas__section-dot"
            style={{ background: accent.color }}
          />
          {label}
          <span className="comidas__section-count">{recipes.length}</span>
        </span>
        {!filtering && (
          <svg
            className="comidas__section-chevron"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </button>
      {open && (
        <div className="comidas__section-body">
          {recipes.length === 0 ? (
            <p className="comidas__empty">Aún no hay recetas aquí.</p>
          ) : (
            <div className="recipe-grid">
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  accent={accent}
                  onClick={() => onOpen(recipe)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Comidas() {
  const { user } = useAuth();
  const [recipes, setRecipes] = usePersistedState(recipesKey(), []);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [openTags, setOpenTags] = useState([]);
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("todas");

  const toggleOpen = (tag) =>
    setOpenTags((prev) =>
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

  const saveRecipe = async (recipe) => {
    await saveRecipeToCloud(user.uid, recipe);
    setRecipes((prev) => {
      const exists = prev.some((r) => r.id === recipe.id);
      return exists
        ? prev.map((r) => (r.id === recipe.id ? recipe : r))
        : [...prev, recipe];
    });
    setShowForm(false);
    setEditing(null);
  };

  const deleteRecipe = async () => {
    const id = confirmDelete.id;
    await deleteRecipeFromCloud(user.uid, id);
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    setConfirmDelete(null);
    setDetail(null);
  };

  const query = search.trim().toLowerCase();
  const filtering = query !== "" || filterTag !== "todas";

  const matchesSearch = (recipe) =>
    !query || recipe.title.toLowerCase().includes(query);

  const sections = SECTIONS.filter(
    (s) => filterTag === "todas" || s.tag === filterTag,
  )
    .map((s) => ({
      ...s,
      recipes: recipes.filter(
        (r) => r.tags.includes(s.tag) && matchesSearch(r),
      ),
    }))
    .filter((s) => !filtering || s.recipes.length > 0);

  return (
    <div className="page page--scroll comidas-page">
      <div className="page__header">
        <h1 className="page__title comidas__title">Comidas</h1>
        <button className="comidas__add-btn" onClick={openNew}>
          + Agregar receta
        </button>
      </div>

      <div className="search-bar comidas__search">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="var(--color-text-muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          className="search-bar__input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar"
        />
      </div>

      <div className="cat-pills comidas__filters">
        {FILTERS.map((f) => {
          const accent = f.tag === "todas" ? null : TAG_COLORS[f.tag];
          return (
            <button
              key={f.tag}
              type="button"
              className={`cat-pill${filterTag === f.tag ? " cat-pill--active" : ""}`}
              style={
                accent
                  ? { "--pill-color": accent.color, "--pill-bg": accent.bg }
                  : {
                      "--pill-color": "var(--color-primary)",
                      "--pill-bg": "var(--color-primary-light)",
                    }
              }
              onClick={() => setFilterTag(f.tag)}
            >
              {accent && (
                <span
                  className="cat-pill__dot"
                  style={{ background: accent.color }}
                />
              )}
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="comidas__sections">
        {sections.length === 0 ? (
          <p className="comidas__empty comidas__empty--page">
            No hay recetas que coincidan.
          </p>
        ) : (
          sections.map((section) => (
            <Section
              key={section.tag}
              tag={section.tag}
              label={section.label}
              recipes={section.recipes}
              open={filtering ? true : openTags.includes(section.tag)}
              filtering={filtering}
              onToggle={() => toggleOpen(section.tag)}
              onOpen={setDetail}
            />
          ))
        )}
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