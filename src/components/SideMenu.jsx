import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../utils/useIsMobile";
import { getISOWeek, MONTHS_SHORT } from "../utils/calendar";
import SettingsPanel from "./SettingsPanel";
import "./SideMenu.css";

const DASHBOARD_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

const COMIDAS_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3" />
    <path d="M6 12v9" />
    <path d="M18 3c-1.5 0-3 1.8-3 5s1.5 4 3 4" />
    <path d="M18 3v18" />
  </svg>
);

const METAS_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </svg>
);

const MEDS_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(45 12 12)" />
    <path d="M8.5 8.5l7 7" />
  </svg>
);

const SETTINGS_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const MENU_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="22"
    height="22"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

// Iconos del menú lateral (escritorio).
const ITEMS = [
  { to: "/", label: "Dashboard", match: (path) => path === "/", icon: DASHBOARD_ICON },
  {
    to: "/comidas",
    label: "Comidas",
    match: (path) => path.startsWith("/comidas"),
    icon: COMIDAS_ICON,
  },
  { to: "/metas", label: "Metas", match: (path) => path.startsWith("/metas"), icon: METAS_ICON },
  {
    to: "/medications",
    label: "Medicación",
    match: (path) => path.startsWith("/medications"),
    icon: MEDS_ICON,
  },
];

// Vistas que se muestran en el menú hamburguesa (móvil).
const SHEET_ITEMS = [
  {
    to: "/comidas",
    label: "Comidas",
    match: (path) => path.startsWith("/comidas"),
    icon: COMIDAS_ICON,
  },
  {
    to: "/medications",
    label: "Medicamentos",
    match: (path) => path.startsWith("/medications"),
    icon: MEDS_ICON,
  },
  { to: "/metas", label: "Metas", match: (path) => path.startsWith("/metas"), icon: METAS_ICON },
];

function SideMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const isMobile = useIsMobile();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  const curDay = now.getDate();
  const curWeek = getISOWeek(curYear, curMonth, curDay);
  const monthLabel = MONTHS_SHORT[curMonth].toUpperCase();
  const path = location.pathname;

  const goDay = () =>
    navigate(`/year/${curYear}/month/${curMonth}/day/${curDay}`);
  const goWeek = () => navigate(`/year/${curYear}/week/${curWeek}`);
  const goMonth = () => navigate(`/year/${curYear}/month/${curMonth}`);

  const settings = settingsOpen && (
    <SettingsPanel
      onClose={() => setSettingsOpen(false)}
      onLogout={() => {
        setSettingsOpen(false);
        logout();
      }}
    />
  );

  // ---- Móvil: barra inferior + menú hamburguesa ----
  if (isMobile) {
    const sheetActive = SHEET_ITEMS.some((i) => i.match(path));
    return (
      <>
        <nav className="mobile-nav" aria-label="Menú principal">
          <button
            className={`mobile-nav__item${path === "/" ? " mobile-nav__item--active" : ""}`}
            onClick={() => navigate("/")}
            aria-label="Dashboard"
          >
            {DASHBOARD_ICON}
          </button>
          <button
            className={`mobile-nav__item mobile-nav__item--text${path.includes("/week/") ? " mobile-nav__item--active" : ""}`}
            onClick={goWeek}
            aria-label="Semana actual"
          >
            <span className="mobile-nav__text-main">SEM</span>
            <span className="mobile-nav__text-sub">{curWeek}</span>
          </button>
          <button
            className="mobile-nav__fab"
            onClick={goDay}
            aria-label="Ir a hoy"
          >
            HOY
          </button>
          <button
            className={`mobile-nav__item mobile-nav__item--text${path.includes("/month/") ? " mobile-nav__item--active" : ""}`}
            onClick={goMonth}
            aria-label="Mes actual"
          >
            <span className="mobile-nav__text-main">{monthLabel}</span>
          </button>
          <button
            className={`mobile-nav__item${sheetActive ? " mobile-nav__item--active" : ""}`}
            onClick={() => setSheetOpen(true)}
            aria-label="Más opciones"
            aria-expanded={sheetOpen}
          >
            {MENU_ICON}
          </button>
        </nav>

        {sheetOpen && (
          <div
            className="mobile-sheet-overlay"
            onClick={() => setSheetOpen(false)}
          >
            <div className="mobile-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-sheet__handle" />
              {SHEET_ITEMS.map((item) => (
                <button
                  key={item.to}
                  className={`mobile-sheet__item${item.match(path) ? " mobile-sheet__item--active" : ""}`}
                  onClick={() => {
                    setSheetOpen(false);
                    navigate(item.to);
                  }}
                >
                  <span className="mobile-sheet__icon">{item.icon}</span>
                  <span className="mobile-sheet__label">{item.label}</span>
                </button>
              ))}
              <button
                className="mobile-sheet__item"
                onClick={() => {
                  setSheetOpen(false);
                  setSettingsOpen(true);
                }}
              >
                <span className="mobile-sheet__icon">{SETTINGS_ICON}</span>
                <span className="mobile-sheet__label">Configuración</span>
              </button>
            </div>
          </div>
        )}

        {settings}
      </>
    );
  }

  // ---- Escritorio: menú lateral vertical ----
  return (
    <nav className="side-menu" aria-label="Menú principal">
      <div className="side-menu__jump">
        <div className="side-menu__jump-actions">
          <button
            className="side-menu__jump-btn"
            onClick={goDay}
            aria-label="Ir al día de hoy"
            title="Día de hoy"
          >
            HOY
          </button>
          <button
            className="side-menu__jump-btn"
            onClick={goWeek}
            aria-label="Ir a la semana actual"
            title="Semana actual"
          >
            SEM
          </button>
          <button
            className="side-menu__jump-btn"
            onClick={goMonth}
            aria-label="Ir al mes actual"
            title="Mes actual"
          >
            {monthLabel}
          </button>
        </div>
      </div>
      {ITEMS.map((item) => {
        const active = item.match(path);
        return (
          <button
            key={item.to}
            className={`side-menu__item${active ? " side-menu__item--active" : ""}`}
            onClick={() => navigate(item.to)}
            aria-label={item.label}
            title={item.label}
          >
            {item.icon}
          </button>
        );
      })}
      <button
        className="side-menu__item side-menu__settings"
        onClick={() => setSettingsOpen(true)}
        aria-label="Configuración"
        title="Configuración"
      >
        {SETTINGS_ICON}
      </button>
      {settings}
    </nav>
  );
}

export default SideMenu;