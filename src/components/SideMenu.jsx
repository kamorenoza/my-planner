import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
];

function SideMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const goToday = () => {
    const now = new Date();
    navigate(
      `/year/${now.getFullYear()}/month/${now.getMonth()}/day/${now.getDate()}`,
    );
  };

  return (
    <nav className="side-menu" aria-label="Menú principal">
      <button
        className="side-menu__item side-menu__today"
        onClick={goToday}
        aria-label="Hoy"
        title="Ir al día de hoy"
      >
        HOY
      </button>
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
