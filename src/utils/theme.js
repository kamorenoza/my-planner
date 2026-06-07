// Theme preference – stored locally only (never synced to the cloud).

const THEME_KEY = "theme";

export const THEMES = [
  { id: "default", label: "Original" },
  { id: "masculino", label: "Azul" },
];

export function getTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved && THEMES.some((t) => t.id === saved)) return saved;
  } catch {
    // ignore
  }
  return "default";
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "default") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

export function setTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
  applyTheme(theme);
}
