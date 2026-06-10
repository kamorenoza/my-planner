// A plate/cutlery placeholder icon used when a recipe has no photo.
// Rendered as an inline SVG so it looks identical across devices (including iPad),
// unlike the native emoji glyph which renders inconsistently.
function PlateIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}

export default PlateIcon;
