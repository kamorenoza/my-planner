import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

initializeApp();
const db = getFirestore();

// How often the scheduler runs (minutes). Must match the schedule below.
const RUN_INTERVAL_MIN = 15;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Local date/time parts for a given IANA timezone.
function localParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const hour = parts.hour === "24" ? 0 : Number(parts.hour);
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    minute: Number(parts.minute),
    minutes: hour * 60 + Number(parts.minute),
  };
}

function formatTime(min) {
  const hour = Math.floor(min / 60);
  const minutes = min % 60;
  const period = hour < 12 ? "am" : "pm";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${String(minutes).padStart(2, "0")} ${period}`;
}

function parseList(planner, key) {
  try {
    return JSON.parse(planner?.[key] || "[]");
  } catch {
    return [];
  }
}

function isHoliday(reminder) {
  return reminder && reminder.holiday === true;
}

// Build the 8:00 daily messages: events, reminders and tasks, each as its own
// notification and only when there is something to show.
// Returns an array of { title, body }.
function buildDailyMessages(planner, dateKey) {
  const events = parseList(planner, `events-${dateKey}`).sort(
    (a, b) => a.start - b.start,
  );
  const reminders = parseList(planner, `reminders-${dateKey}`).filter(
    (r) => !isHoliday(r),
  );
  const todos = parseList(planner, `todos-${dateKey}`).filter((t) => !t.done);

  const messages = [];

  if (events.length) {
    messages.push({
      title: "Eventos para hoy",
      body: events.map((e) => `- ${e.title} ${formatTime(e.start)}`).join("\n"),
    });
  }

  if (reminders.length) {
    messages.push({
      title: "Recordatorios para hoy",
      body: reminders.map((r) => `- ${r.text}`).join("\n"),
    });
  }

  if (todos.length) {
    messages.push({
      title: "Tareas para hoy",
      body: todos.map((t) => `- ${t.text}`).join("\n"),
    });
  }

  return messages;
}

// Send a data-only message to every token of a user, pruning invalid ones.
// Data-only (no `notification` field) avoids the duplicate where iOS auto-shows
// the notification AND the service worker shows it again in onBackgroundMessage.
async function sendToUser(uid, tokensMap, message) {
  const tokens = Object.keys(tokensMap || {});
  if (tokens.length === 0) return;

  const res = await getMessaging().sendEachForMulticast({
    tokens,
    data: {
      title: String(message.title || ""),
      body: String(message.body || ""),
    },
    webpush: {
      fcmOptions: { link: "/" },
    },
  });

  // Remove tokens that are no longer valid.
  const invalid = {};
  res.responses.forEach((r, i) => {
    if (!r.success) {
      const code = r.error?.code || "";
      if (
        code.includes("registration-token-not-registered") ||
        code.includes("invalid-argument") ||
        code.includes("invalid-registration-token")
      ) {
        invalid[`notif.tokens.${tokens[i]}`] = FieldValue.delete();
      }
    }
  });
  if (Object.keys(invalid).length) {
    await db
      .doc(`users/${uid}`)
      .set(invalid, { merge: true })
      .catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Scheduled function
// ---------------------------------------------------------------------------

export const sendPlannerNotifications = onSchedule(
  {
    schedule: `every ${RUN_INTERVAL_MIN} minutes`,
    timeZone: "Etc/UTC",
    region: "us-central1",
    retryCount: 0,
  },
  async () => {
    const now = new Date();
    const snap = await db.collection("users").get();

    const jobs = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const notif = data.notif;
      if (!notif || notif.enabled === false) return;
      const tokens = notif.tokens || {};
      if (Object.keys(tokens).length === 0) return;

      const timezone = data.timezone || "America/Bogota";
      const dailyHour = Number.isInteger(notif.dailyHour) ? notif.dailyHour : 8;
      const leadMin = Number.isInteger(notif.eventLeadMinutes)
        ? notif.eventLeadMinutes
        : 60;

      const { dateKey, hour, minutes } = localParts(now, timezone);
      const planner = data.planner || {};
      const sent = notif.sent || {};
      const newSent = {};
      // Keep only today's markers to avoid unbounded growth.
      Object.keys(sent).forEach((k) => {
        if (k.includes(dateKey)) newSent[k] = sent[k];
      });

      const updates = {};
      const messages = [];

      // 8:00 daily summary — fire once in the interval window starting at the
      // configured hour. Sends a reminders message and/or a tasks message.
      const dailyKey = `daily-${dateKey}`;
      if (hour === dailyHour && minutes - dailyHour * 60 < RUN_INTERVAL_MIN) {
        if (!newSent[dailyKey]) {
          const daily = buildDailyMessages(planner, dateKey);
          if (daily.length) {
            daily.forEach((m) => messages.push(m));
            newSent[dailyKey] = true;
          }
        }
      }

      // Event reminders — `leadMin` minutes before each event start.
      const events = parseList(planner, `events-${dateKey}`);
      events.forEach((ev) => {
        const until = ev.start - minutes;
        if (until <= leadMin && until > leadMin - RUN_INTERVAL_MIN) {
          const evKey = `evt-${dateKey}-${ev.id}`;
          if (!newSent[evKey]) {
            messages.push({
              title: `Evento: ${ev.title}`,
              body: `Empieza a las ${formatTime(ev.start)}`,
            });
            newSent[evKey] = true;
          }
        }
      });

      if (messages.length === 0) return;

      updates["notif.sent"] = newSent;
      jobs.push(
        (async () => {
          for (const msg of messages) {
            await sendToUser(docSnap.id, tokens, msg);
          }
          await db
            .doc(`users/${docSnap.id}`)
            .set(updates, { merge: true })
            .catch(() => {});
        })(),
      );
    });

    await Promise.all(jobs);
    logger.info(`Notification run complete: ${jobs.length} user(s) notified.`);
  },
);
