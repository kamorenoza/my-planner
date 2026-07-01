import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../utils/useIsMobile";
import { getISOWeek, MONTHS_SHORT } from "../utils/calendar";
import SettingsPanel from "./SettingsPanel";
import "./SideMenu.css";

const ITEMS = [
  {
    to: "/",
    label: "Dashboard",
    match: (path) => path === "/",
    icon: (
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
    ),
  },
  {
    to: "/comidas",
    label: "Comidas",
    match: (path) => path.startsWith("/comidas"),
    icon: (
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
    ),
  },
  {
    to: "/metas",
    label: "Metas",
    match: (path) => path.startsWith("/metas"),
    icon: (
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
    ),
  },
  {
    to: "/medications",
    label: "Medicación",
    match: (path) => path.startsWith("/medications"),
    icon: (
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
    ),
  },
];

function SideMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const isMobile = useIsMobile();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth();
  const curDay = now.getDate();
  const curWeek = getISOWeek(curYear, curMonth, curDay);
  const monthLabel = MONTHS_SHORT[curMonth].toUpperCase();

  const goDay = () => {
    setJumpOpen(false);
    navigate(`/year/${curYear}/month/${curMonth}/day/${curDay}`);
  };
  const goWeek = () => {
    setJumpOpen(false);
    navigate(`/year/${curYear}/week/${curWeek}`);
  };
  const goMonth = () => {
    setJumpOpen(false);
    navigate(`/year/${curYear}/month/${curMonth}`);
  };

  return (
    <nav className="side-menu" aria-label="Menú principal">
      <div className="side-menu__jump">
        {isMobile && (
          <button
            className="side-menu__fab"
            onClick={() => setJumpOpen((o) => !o)}
            aria-label="Ir a hoy"
            aria-expanded={jumpOpen}
          >
            {jumpOpen ? "×" : "HOY"}
          </button>
        )}
        <div className={`side-menu__jump-actions${jumpOpen ? " is-open" : ""}`}>
          <button
            className="side-menu__jump-btn"
            onClick={goDay}
            aria-label="Ir al día de hoy"
            title="Día de hoy"
          >
            {isMobile ? "DIA" : "HOY"}
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
        const active = item.match(location.pathname);
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
      </button>
      {isMobile && jumpOpen && (
        <div
          className="side-menu__jump-backdrop"
          onClick={() => setJumpOpen(false)}
        />
      )}
      {settingsOpen && (
        <SettingsPanel
          onClose={() => setSettingsOpen(false)}
          onLogout={() => {
            setSettingsOpen(false);
            logout();
          }}
        />
      )}
    </nav>
  );
}

export default SideMenu;