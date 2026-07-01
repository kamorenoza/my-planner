import "./DateField.css";

const MONTHS_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

// Formats a YYYY-MM-DD string as "02 Ene 2026"
export function formatDateLabel(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";
  return `${String(day).padStart(2, "0")} ${MONTHS_SHORT[month - 1]} ${year}`;
}

// A date field that shows the formatted label ("02 Ene 2026") while still
// using the native date picker underneath (works on iPad).
function DateField({
  value,
  onChange,
  className = "field__input",
  min,
  max,
  placeholder = "",
}) {
  return (
    <div className="date-field">
      <span className="date-field__label">
        {formatDateLabel(value) || placeholder}
      </span>
      <input
        type="date"
        className={`${className} date-field__input`}
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default DateField;