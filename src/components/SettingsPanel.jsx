import { useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import { THEMES, getTheme, setTheme } from "../utils/theme";
import { useAuth } from "../context/AuthContext";
import {
  notificationsSupported,
  notificationPermission,
  enableNotifications,
  disableNotifications,
} from "../database/messaging";
import "./SettingsPanel.css";

function SettingsPanel({ onClose, onLogout }) {
  const { user } = useAuth();
  const [theme, setActiveTheme] = useState(getTheme);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [notifState, setNotifState] = useState(() => notificationPermission());
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifToken, setNotifToken] = useState(null);
  const [notifError, setNotifError] = useState("");

  const changeTheme = (id) => {
    setActiveTheme(id);
    setTheme(id);
  };

  const turnOnNotifications = async () => {
    setNotifError("");
    setNotifBusy(true);
    try {
      if (!(await notificationsSupported())) {
        setNotifError(
          "Tu dispositivo no soporta notificaciones. En iPhone/iPad debes instalar la app en la pantalla de inicio.",
        );
        return;
      }
      const token = await enableNotifications(user?.uid);
      if (token) {
        setNotifToken(token);
        setNotifState("granted");
      } else if (notificationPermission() === "denied") {
        setNotifState("denied");
        setNotifError(
          "Permiso denegado. Actívalo desde los ajustes del sistema para esta app.",
        );
      } else {
        setNotifError(
          "No se pudo activar las notificaciones. Intenta de nuevo.",
        );
      }
    } catch {
      setNotifError("Ocurrió un error activando las notificaciones.");
    } finally {
      setNotifBusy(false);
    }
  };

  const turnOffNotifications = async () => {
    setNotifBusy(true);
    try {
      await disableNotifications(user?.uid, notifToken);
      setNotifToken(null);
      setNotifState("off");
    } catch {
      setNotifError("No se pudo desactivar.");
    } finally {
      setNotifBusy(false);
    }
  };

  const notifActive = notifState === "granted" && !!notifToken;

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

          <section className="settings-field">
            <h3 className="settings-field__label">Notificaciones</h3>
            <p className="settings-field__hint">
              Recibe un resumen del día a las 8:00 a. m. y un aviso 1 hora antes
              de cada evento.
            </p>
            <button
              className={`settings-notif-btn${
                notifActive ? " settings-notif-btn--on" : ""
              }`}
              onClick={notifActive ? turnOffNotifications : turnOnNotifications}
              disabled={notifBusy || notifState === "denied"}
            >
              {notifBusy
                ? "Procesando…"
                : notifActive
                  ? "Notificaciones activadas ✓"
                  : "Activar notificaciones"}
            </button>
            {notifState === "denied" && (
              <p className="settings-field__error">
                Permiso bloqueado. Habilítalo en los ajustes del sistema.
              </p>
            )}
            {notifError && (
              <p className="settings-field__error">{notifError}</p>
            )}
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
