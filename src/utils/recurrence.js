// Recurring-event materialization. Events are stored per day in
// `events-YYYY-MM-DD` localStorage buckets, so a repeating event is written as
// individual occurrences across the relevant day buckets, all sharing a
// `seriesId`. This lets every view (Day/Week/Month) read events the same way
// while still supporting iOS-style "this event" / "all events" edits.

import { load, save, eventsKey } from "../database/localStore";
import { generateOccurrenceDates } from "./events";

const newSeriesId = () =>
  `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function appendToBucket(dk, event) {
  const list = load(eventsKey(dk), []);
  list.push(event);
  list.sort((a, b) => a.start - b.start);
  save(eventsKey(dk), list);
}

function removeFromBucket(dk, id) {
  const list = load(eventsKey(dk), []);
  const filtered = list.filter((e) => e.id !== id);
  if (filtered.length !== list.length) save(eventsKey(dk), filtered);
}

function eachEventBucketKey(cb) {
  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith("events-")) keys.push(key);
  }
  keys.forEach(cb);
}

function materializeSeries(event, seriesId, anchorDate) {
  const dates = generateOccurrenceDates(
    anchorDate,
    event.repeat,
    event.repeatUntil || undefined,
    event.weekdays,
  );
  dates.forEach((dk, i) => {
    appendToBucket(dk, {
      ...event,
      id: `${seriesId}-${i}`,
      date: dk,
      seriesId,
      repeat: event.repeat,
      repeatUntil: event.repeatUntil || "",
      weekdays: event.weekdays || [],
    });
  });
}

function earliestSeriesDate(seriesId, fallback) {
  let earliest = null;
  eachEventBucketKey((key) => {
    const list = load(key, []);
    list.forEach((e) => {
      if (e.seriesId === seriesId && (!earliest || e.date < earliest)) {
        earliest = e.date;
      }
    });
  });
  return earliest || fallback;
}

// Delete every occurrence belonging to a series.
export function deleteEventSeries(seriesId) {
  eachEventBucketKey((key) => {
    const list = load(key, []);
    const filtered = list.filter((e) => e.seriesId !== seriesId);
    if (filtered.length !== list.length) save(key, filtered);
  });
}

// Delete occurrences of a series from `fromDate` (inclusive) onward.
export function deleteEventSeriesFrom(seriesId, fromDate) {
  eachEventBucketKey((key) => {
    const list = load(key, []);
    const filtered = list.filter(
      (e) => !(e.seriesId === seriesId && e.date >= fromDate),
    );
    if (filtered.length !== list.length) save(key, filtered);
  });
}

// Persist a brand-new event (single or recurring).
export function saveNewEvent(event) {
  if (event.repeat && event.repeat !== "none") {
    materializeSeries(event, newSeriesId(), event.date);
  } else {
    appendToBucket(event.date, {
      ...event,
      repeat: "none",
      repeatUntil: "",
      weekdays: [],
    });
  }
}

// Apply an edit. `original` is the stored occurrence being edited, `updated`
// carries the new field values, and `scope` is 'one' | 'all' (only relevant
// when the original belongs to a series).
export function editEvent(original, updated, scope) {
  const wasSeries = !!original.seriesId;

  if (!wasSeries) {
    removeFromBucket(original.date, original.id);
    if (updated.repeat && updated.repeat !== "none") {
      materializeSeries(updated, newSeriesId(), updated.date);
    } else {
      appendToBucket(updated.date, {
        ...updated,
        repeat: "none",
        repeatUntil: "",
        weekdays: [],
        seriesId: undefined,
      });
    }
    return;
  }

  if (scope === "one") {
    // Detach this single occurrence from the series.
    removeFromBucket(original.date, original.id);
    appendToBucket(updated.date, {
      ...updated,
      repeat: "none",
      repeatUntil: "",
      weekdays: [],
      seriesId: undefined,
    });
    return;
  }

  // scope === 'all': rebuild the whole series from its original anchor.
  const anchor = earliestSeriesDate(original.seriesId, original.date);
  deleteEventSeries(original.seriesId);
  if (updated.repeat && updated.repeat !== "none") {
    materializeSeries(updated, original.seriesId, anchor);
  } else {
    appendToBucket(anchor, {
      ...updated,
      date: anchor,
      repeat: "none",
      repeatUntil: "",
      weekdays: [],
      seriesId: undefined,
    });
  }
}

// Remove an event. For a series: `scope === 'all'` deletes every occurrence,
// `scope === 'future'` deletes this occurrence and all later ones, otherwise
// only the given occurrence is removed.
export function removeEvent(original, scope) {
  if (original.seriesId && scope === "all") {
    deleteEventSeries(original.seriesId);
  } else if (original.seriesId && scope === "future") {
    deleteEventSeriesFrom(original.seriesId, original.date);
  } else {
    removeFromBucket(original.date, original.id);
  }
}
