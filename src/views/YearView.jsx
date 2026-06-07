import { useParams, useNavigate } from "react-router-dom";
import { MONTHS, WEEKDAYS, getMonthDays } from "../utils/calendar";
import "./YearView.css";

function MonthCard({ year, month, onClick }) {
  const cells = getMonthDays(year, month);
  const now = new Date();
  const todayDay =
    now.getFullYear() === year && now.getMonth() === month
      ? now.getDate()
      : null;

  return (
    <div className="month-card" onClick={onClick}>
      <h3 className="month-card__title">{MONTHS[month]}</h3>
      <div className="month-card__weekdays">
        {WEEKDAYS.map((wd, i) => (
          <span key={i} className="month-card__weekday">
            {wd}
          </span>
        ))}
      </div>
      <div className="month-card__days">
        {cells.map((day, i) => (
          <span
            key={i}
            className={`month-card__day${day ? "" : " month-card__day--empty"}${
              day && day === todayDay ? " month-card__day--today" : ""
            }`}
          >
            {day || ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function YearView() {
  const { year } = useParams();
  const navigate = useNavigate();
  const yearNumber = Number(year);

  return (
    <div className="year-view">
      <div className="year-view__header">
        <button
          className="year-view__back"
          onClick={() => navigate("/")}
          aria-label="Volver"
        >
          ‹
        </button>
        <h1 className="year-view__title">Agenda de {yearNumber}</h1>
      </div>
      <div className="year-view__grid">
        {MONTHS.map((_, month) => (
          <MonthCard
            key={month}
            year={yearNumber}
            month={month}
            onClick={() => navigate(`/year/${yearNumber}/month/${month}`)}
          />
        ))}
      </div>
    </div>
  );
}

export default YearView;
