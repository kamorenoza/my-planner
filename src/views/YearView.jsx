import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MONTHS, WEEKDAYS, getMonthDays } from "../utils/calendar";
import { dayHasHoliday } from "../utils/holidaysCO";
import {
  getDayMarks,
  stripeGradient,
  MARK_SIZE,
  LINE_HEIGHT,
} from "../utils/dayMarks";
import { useIsMobile } from "../utils/useIsMobile";
import "./YearView.css";

function MonthCard({ year, month, onClick, cardRef }) {
  const cells = getMonthDays(year, month);
  const now = new Date();
  const todayDay =
    now.getFullYear() === year && now.getMonth() === month
      ? now.getDate()
      : null;

  return (
    <div className="month-card" onClick={onClick} ref={cardRef}>
      <h3 className="month-card__title">{MONTHS[month]}</h3>
      <div className="month-card__weekdays">
        {WEEKDAYS.map((wd, i) => (
          <span key={i} className="month-card__weekday">
            {wd}
          </span>
        ))}
      </div>
      <div className="month-card__days">
        {cells.map((day, i) => {
          const holiday = day && dayHasHoliday(year, month, day);
          const marks = day ? getDayMarks(year, month, day) : [];
          return (
            <span
              key={i}
              className={`month-card__day${day ? "" : " month-card__day--empty"}${
                day && day === todayDay ? " month-card__day--today" : ""
              }${holiday ? " month-card__day--holiday" : ""}`}
            >
              <span className="month-card__num">{day || ""}</span>
              {marks.length === 1 && (
                <span
                  className="month-card__mark"
                  style={{
                    background: marks[0],
                    width: `${MARK_SIZE}px`,
                    height: `${MARK_SIZE}px`,
                  }}
                />
              )}
              {marks.length > 1 && (
                <span
                  className="month-card__mark month-card__mark--line"
                  style={{
                    background: stripeGradient(marks),
                    width: `${marks.length * MARK_SIZE}px`,
                    height: `${LINE_HEIGHT}px`,
                  }}
                />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function YearView() {
  const { year } = useParams();
  const navigate = useNavigate();
  const yearNumber = Number(year);
  const isMobile = useIsMobile();
  const currentMonthRef = useRef(null);

  const now = new Date();
  const currentMonth = now.getFullYear() === yearNumber ? now.getMonth() : null;

  useEffect(() => {
    if (isMobile && currentMonthRef.current) {
      currentMonthRef.current.scrollIntoView({ block: "start" });
    }
  }, [isMobile]);

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
            cardRef={month === currentMonth ? currentMonthRef : null}
            onClick={() => navigate(`/year/${yearNumber}/month/${month}`)}
          />
        ))}
      </div>
    </div>
  );
}

export default YearView;
