import { Link } from "react-router-dom";
import "./Breadcrumbs.css";

// items: array of { label, to } – each rendered as a link, separated by "/"
function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Migas de pan">
      {items.map((item, i) => (
        <span key={i} className="breadcrumbs__item">
          {i > 0 && <span className="breadcrumbs__sep">/</span>}
          {item.to ? (
            <Link className="breadcrumbs__link" to={item.to}>
              {item.label}
            </Link>
          ) : (
            <span className="breadcrumbs__current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export default Breadcrumbs;
