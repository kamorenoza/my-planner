// One-time data migrations to clean up localStorage.
// Each migration is guarded by a version flag so it only runs once.

import { REMINDER_EMOJIS } from "../components/ReminderModal";
import { HOLIDAY_EMOJI } from "./holidaysCO";

const MIGRATION_FLAG = "migrations-applied-v1";
const REMINDER_EMOJICODE_FLAG = "migrations-reminder-emojicode-v1";

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

// Older reminders were saved without an `emojiCode`, so they fell back to the
// native emoji glyph, which doesn't render on iPad. Backfill the Apple code
// from the shortcode stored in `emoji` so they always render as an image.
function backfillReminderEmojiCodes() {
  const codeByChar = new Map();
  for (const e of REMINDER_EMOJIS) codeByChar.set(e.char, e.code);
  codeByChar.set(HOLIDAY_EMOJI.char, HOLIDAY_EMOJI.code);

  const re = /^reminders-\d{4}-\d{2}-\d{2}$/;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !re.test(key)) continue;
    let list;
    try {
      list = JSON.parse(localStorage.getItem(key));
    } catch {
      continue;
    }
    if (!Array.isArray(list)) continue;
    let changed = false;
    const updated = list.map((item) => {
      if (item && !item.emojiCode && item.emoji && codeByChar.has(item.emoji)) {
        changed = true;
        return { ...item, emojiCode: codeByChar.get(item.emoji) };
      }
      return item;
    });
    if (changed) localStorage.setItem(key, JSON.stringify(updated));
  }
}

export function runMigrations() {
  try {
    if (!localStorage.getItem(MIGRATION_FLAG)) {
      cleanEventPollution();
      cleanDatedPollution("reminders");
      cleanDatedPollution("todos");
      localStorage.setItem(MIGRATION_FLAG, "1");
    }
    if (!localStorage.getItem(REMINDER_EMOJICODE_FLAG)) {
      backfillReminderEmojiCodes();
      localStorage.setItem(REMINDER_EMOJICODE_FLAG, "1");
    }
  } catch {
    // localStorage unavailable – ignore
  }
}