import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

function Dashboard() {
  const [years, setYears] = useState([2026]);
  const [modal, setModal] = useState(null);
  const navigate = useNavigate();

  const requestAddYear = () => {
    const nextYear = years.length > 0 ? Math.max(...years) + 1 : 2026;
    const now = new Date();
    // Se permite crear el año X a partir del 1 de diciembre del año X-1
    const unlockDate = new Date(nextYear - 1, 11, 1);

    if (now >= unlockDate) {
      setModal({ type: "confirm", year: nextYear });
    } else {
      setModal({ type: "blocked", year: nextYear });
    }
  };

  const confirmAddYear = () => {
    setYears((prev) => [...prev, modal.year]);
    setModal(null);
  };

  return (
    <div className="page">
      <div className="page__header">
        <h1 className="page__title">Mi Agenda</h1>
      </div>
      <div className="dashboard__grid">
        {years.map((year) => (
          <div
            key={year}
            className="card card--clickable dashboard__card"
            onClick={() => navigate(`/year/${year}`)}
          >
            <span className="dashboard__card-year">{year}</span>
          </div>
        ))}
        <div className="card card--add" onClick={requestAddYear}>
          <span className="card__plus">+</span>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {modal.type === "confirm" ? (
              <>
                <h2 className="modal__title">Crear nueva agenda</h2>
                <p className="modal__text">
                  Se va a crear una nueva agenda para el año {modal.year}.
                  ¿Desea continuar?
                </p>
                <div className="modal__actions">
                  <button
                    className="modal__btn modal__btn--cancel"
                    onClick={() => setModal(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="modal__btn modal__btn--primary"
                    onClick={confirmAddYear}
                  >
                    Continuar
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="modal__title">Año no disponible</h2>
                <p className="modal__text">
                  Aún no se puede generar el año {modal.year}. Podrás crearlo a
                  partir del 1 de diciembre de {modal.year - 1}.
                </p>
                <div className="modal__actions">
                  <button
                    className="modal__btn modal__btn--primary"
                    onClick={() => setModal(null)}
                  >
                    Entendido
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
