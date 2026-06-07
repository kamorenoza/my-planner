import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import { THEMES, getTheme, setTheme } from "../utils/theme";
import "./SettingsPanel.css";

function SettingsPanel({ onClose, onLogout }) {
  const [theme, setActiveTheme] = useState(getTheme);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const changeTheme = (id) => {
    setActiveTheme(id);
    setTheme(id);
  };

  return (
    <>
      <div className="settings-overlay" onClick={onClose} />
      <aside
        className="settings-panel"
        role="dialog"
        aria-label="Configuración"
      >
        <header className="settings-panel__header">
          <h2 className="settings-panel__title">Configuración</h2>
          <button
            className="settings-panel__close"
            onClick={onClose}
            aria-label="Cerrar"
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
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="settings-panel__body">
          <section className="settings-field">
            <h3 className="settings-field__label">Tema</h3>
            <div className="settings-themes">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`settings-theme${theme === t.id ? " settings-theme--active" : ""}`}
                  onClick={() => changeTheme(t.id)}
                >
                  <span
                    className={`settings-theme__swatch settings-theme__swatch--${t.id}`}
                  />
                  <span className="settings-theme__name">{t.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <footer className="settings-panel__footer">
          <button
            className="settings-logout"
            onClick={() => setConfirmLogout(true)}
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </footer>
      </aside>

      {confirmLogout && (
        <ConfirmDialog
          title="Cerrar sesión"
          message="¿Seguro que quieres cerrar sesión?"
          confirmLabel="Cerrar sesión"
          onConfirm={() => {
            setConfirmLogout(false);
            onLogout();
          }}
          onCancel={() => setConfirmLogout(false)}
        />
      )}
    </>
  );
}

export default SettingsPanel;
