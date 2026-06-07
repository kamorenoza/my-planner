// One-time data migrations to clean up localStorage.
// Each migration is guarded by a version flag so it only runs once.

const MIGRATION_FLAG = "migrations-applied-v1";

// Earlier versions of usePersistedState could copy a day's data onto another
// day's storage key when navigating between days. Events always carry their own
// `date`, so we can reliably remove any event whose date doesn't match the key
// it is stored under.
function cleanEventPollution() {
  const re = /^events-(\d{4}-\d{2}-\d{2})$/;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const match = key && key.match(re);
    if (!match) continue;
    const dk = match[1];
    let list;
    try {
      list = JSON.parse(localStorage.getItem(key));
    } catch {
      continue;
    }
    if (!Array.isArray(list)) continue;
    const cleaned = list
      .map((e) => (e && !e.date ? { ...e, date: dk } : e))
      .filter((e) => e && e.date === dk);
    if (cleaned.length !== list.length) {
      localStorage.setItem(key, JSON.stringify(cleaned));
    }
  }
}

// Same idea for reminders, which we now stamp with their date on creation.
function cleanDatedPollution(prefix) {
  const re = new RegExp(`^${prefix}-(\\d{4}-\\d{2}-\\d{2})$`);
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const match = key && key.match(re);
    if (!match) continue;
    const dk = match[1];
    let list;
    try {
      list = JSON.parse(localStorage.getItem(key));
    } catch {
      continue;
    }
    if (!Array.isArray(list)) continue;
    // Only drop items that carry a mismatching date. Legacy items without a
    // date are left untouched so we never delete real data.
    const cleaned = list.filter(
      (item) => !item || !item.date || item.date === dk,
    );
    if (cleaned.length !== list.length) {
      localStorage.setItem(key, JSON.stringify(cleaned));
    }
  }
}

export function runMigrations() {
  try {
    if (localStorage.getItem(MIGRATION_FLAG)) return;
    cleanEventPollution();
    cleanDatedPollution("reminders");
    cleanDatedPollution("todos");
    localStorage.setItem(MIGRATION_FLAG, "1");
  } catch {
    // localStorage unavailable – ignore
  }
}
