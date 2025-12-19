/**
 * File: [`lib/defaultsEngine.js`](lib/defaultsEngine.js:1)
 *
 * Story 3.1 — Defaults resolution pipeline
 *
 * Exports:
 *  - async function resolveDefaults(input)
 *
 * Purpose:
 *  - Normalize an incoming reminder payload (from UI) into a canonical reminder object
 *    ready to be persisted/scheduled.
 *  - Ensure medication defaults: repeat -> daily, baseline notification profile -> gentle_chime
 *
 * Notes:
 *  - This is intentionally defensive and best-effort: it accepts routine tokens like
 *    "routine:breakfast", ISO datetimes, HH:MM strings, or empty times.
 *  - Uses lib/routineAnchors to resolve anchor names when useful.
 */
import RoutineAnchors from './routineAnchors';

const DEFAULT_NOTIFICATION_PROFILES = {
  gentle_chime: {
    name: 'gentle_chime',
    tier: 'T2', // baseline mid-level interruptiveness for medication reminders
    sound: 'gentle_chime',
    channels: ['push'],
  },
  appointment_default: {
    name: 'appointment_default',
    tier: 'T3',
    sound: 'default',
    channels: ['push'],
  },
  default: {
    name: 'default',
    tier: 'T3',
    sound: 'default',
    channels: ['push'],
  },
};

/**
 * Normalize/standardize category
 */
function normalizeCategory(raw) {
  if (!raw) return 'other';
  const s = String(raw).toLowerCase();
  if (s.includes('med')) return 'medications';
  if (s.includes('appoint') || s.includes('appointment')) return 'appointments';
  if (s.includes('date') || s.includes('important')) return 'important_dates';
  if (s.includes('other')) return 'other';
  return s;
}

/**
 * Utility: detect if a string is a routine token we use from the UI
 * e.g., "routine:breakfast"
 */
function parseRoutineToken(v) {
  if (!v || typeof v !== 'string') return null;
  const s = v.trim();
  if (!s.startsWith('routine:')) return null;
  const anchor = s.split(':')[1];
  if (!anchor) return null;
  // Normalize anchor (capitalize first letter)
  const cap = anchor.charAt(0).toUpperCase() + anchor.slice(1).toLowerCase();
  return cap;
}

/**
 * Utility: detect if value looks like ISO datetime
 */
function looksLikeISO(v) {
  if (!v || typeof v !== 'string') return false;
  // very permissive check
  return /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v);
}

/**
 * Utility: detect HH:MM or HH:MM:SS
 */
function looksLikeTimeOfDay(v) {
  if (!v || typeof v !== 'string') return false;
  return /^(\d{1,2}):(\d{2})(:\d{2})?$/.test(v.trim());
}

/**
 * Combine today's date with a HH:MM(:SS) time string into an ISO string in local timezone.
 * If the resulting time is in the past relative to now, this function still returns the ISO for today;
 * higher-level rules (Next Slot Rule) can move it forward if needed.
 */
function combineTodayWithTimeHHMM(timeStr) {
  try {
    const parts = timeStr.trim().split(':').map((p) => Number(p));
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parts[0] || 0, parts[1] || 0, parts[2] || 0, 0);
    return d.toISOString();
  } catch (e) {
    return null;
  }
}

/**
 * Resolve schedule input into a normalized schedule object:
 *  - { type: 'routine', anchor: 'Breakfast' }
 *  - { type: 'specific', time: '<ISO string>' }
 *  - { type: 'time_of_day', hhmm: '08:00' }  (keeps as time-of-day semantic)
 */
async function resolveSchedule(rawReminderTime) {
  if (!rawReminderTime) {
    return { type: 'unspecified' };
  }

  // Normalize incoming simple values
  const rawStr = typeof rawReminderTime === 'string' ? rawReminderTime.trim() : String(rawReminderTime);

  // routine token
  const anchor = parseRoutineToken(rawStr);
  if (anchor) {
    return { type: 'routine', anchor };
  }

  // Day-only parsing: "Friday" -> upcoming Friday (at 09:00 local by default)
  // Accept full names or common three-letter forms (Fri, friday, FRIDAY).
  const weekdayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const low = rawStr.toLowerCase();
  const three = low.slice(0,3);
  let weekdayIndex = -1;
  if (weekdayNames.includes(low)) {
    weekdayIndex = weekdayNames.indexOf(low);
  } else {
    // try three-letter match
    const idx = weekdayNames.findIndex((w) => w.slice(0,3) === three);
    if (idx >= 0) weekdayIndex = idx;
  }
  if (weekdayIndex >= 0) {
    try {
      const ref = new Date();
      const curIdx = ref.getDay();
      let diff = (weekdayIndex - curIdx + 7) % 7;
      if (diff === 0) diff = 7; // interpret "Friday" as upcoming Friday (not today)
      const target = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + diff, 9, 0, 0, 0);
      return { type: 'specific', time: target.toISOString(), parsed_day: weekdayNames[weekdayIndex] };
    } catch (e) {
      // fallthrough to other parsing strategies
    }
  }

  // ISO datetime
  if (looksLikeISO(rawStr)) {
    try {
      const d = new Date(rawStr);
      if (!isNaN(d.getTime())) {
        return { type: 'specific', time: d.toISOString() };
      }
    } catch (e) {
      // fallthrough
    }
  }

  // HH:MM or HH:MM:SS
  if (looksLikeTimeOfDay(rawStr)) {
    const iso = combineTodayWithTimeHHMM(rawStr);
    if (iso) return { type: 'specific', time: iso, original_time_of_day: rawStr.trim() };
  }

  // If the value looks like a named anchor string (Breakfast/Lunch...), accept it
  const anchors = await RoutineAnchors.getAnchors().catch(() => null);
  if (anchors) {
    const keys = Object.keys(anchors || {});
    const found = keys.find((k) => k.toLowerCase() === String(rawStr).toLowerCase());
    if (found) {
      return { type: 'routine', anchor: found };
    }
  }

  // Fallback - preserve raw value
  return { type: 'unspecified', raw: rawReminderTime };
}

/**
 * computeNextSlot(referenceISO)
 *
 * If no explicit time is provided, schedule at the next routine anchor after the
 * given reference time (defaults to now). Returns:
 *   { anchor: 'Lunch', time: '<ISO string>', anchor_time: 'HH:MM:SS' }
 * or null if anchors cannot be determined.
 *
 * This implements the "Next Slot Rule" required by Story 3.2.
 */
export async function computeNextSlot(referenceISO) {
  const ref = referenceISO ? new Date(referenceISO) : new Date();
  if (isNaN(ref.getTime())) return null;

  const anchors = await RoutineAnchors.getAnchors().catch(() => null);
  if (!anchors) return null;

  // Order defines priority when multiple anchors are candidates on same day
  const order = ['Breakfast', 'Lunch', 'Dinner', 'Bedtime'];
  let chosen = null;

  for (const anchorName of order) {
    const timeStr = anchors[anchorName];
    if (!timeStr) continue;

    const parts = timeStr.split(':').map((p) => Number(p));
    const cand = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), parts[0] || 0, parts[1] || 0, parts[2] || 0, 0);

    // If candidate is not strictly after ref, advance to next day
    if (cand.getTime() <= ref.getTime()) {
      cand.setDate(cand.getDate() + 1);
    }

    if (!chosen || cand.getTime() < chosen.time.getTime()) {
      chosen = { anchor: anchorName, time: cand, anchor_time: timeStr };
    }
  }

  if (!chosen) return null;

  return { anchor: chosen.anchor, time: chosen.time.toISOString(), anchor_time: chosen.anchor_time };
}

/**
 * resolveDefaults(input)
 *
 * Input: partial payload from UI / form. Common fields:
 *  - title, description
 *  - reminder_time (could be "routine:breakfast", "HH:MM", ISO string, or empty)
 *  - category (e.g., 'medications', 'appointments', 'other')
 *  - notification_types (['push', ...])
 *  - repeat_frequency / frequency_type (optional)
 *  - metadata (object)
 *
 * Output: normalized object:
 * {
 *   category,
 *   schedule: { type, anchor|time|raw },
 *   repeat: { frequency_type, times_per_day, repeat_days } OR { frequency_type: 'none' },
 *   notification_profile: { name, tier, sound, channels },
 *   notify_before_minutes: number,
 *   metadata: {...}
 * }
 */
export async function resolveDefaults(input = {}) {
  // Defensive copy
  const raw = input || {};
  const category = normalizeCategory(raw.category || raw.category?.toString?.() || '');

  // Resolve schedule
  const schedule = await resolveSchedule(raw.reminder_time || raw.reminder_time_token || raw.time || null);

  // Next Slot Rule: if no explicit time was provided, pick the next routine anchor after reference time.
  // Reference time may be provided by the caller via raw.requested_at / raw.created_at / raw.now; otherwise use current time.
  let finalSchedule = schedule;
  if (schedule && schedule.type === 'unspecified') {
    try {
      const refIso = raw.requested_at || raw.created_at || raw.now || null;
      const next = await computeNextSlot(refIso);
      if (next && next.time) {
        finalSchedule = {
          type: 'specific',
          time: next.time,
          resolved_anchor: next.anchor,
          anchor_time: next.anchor_time,
          resolved_by: 'next_slot_rule',
        };
      }
    } catch (e) {
      // best-effort: keep finalSchedule as schedule
    }
  }

  // Repeat handling (medication default -> daily)
  let repeat = {
    frequency_type: (raw.repeat_frequency || raw.frequency_type || raw.frequencyType || raw.frequency || 'none').toString().toLowerCase(),
    times_per_day: raw.times_per_day || raw.timesPerDay || null,
    repeat_days: raw.repeat_days || raw.repeatDays || null,
  };

  // If medication and no explicit repeat provided, default to daily
  if (category === 'medications') {
    if (!repeat || !repeat.frequency_type || repeat.frequency_type === 'none' || repeat.frequency_type === '') {
      repeat.frequency_type = 'daily';
      // If times_per_day not provided, try to infer from payload or default to 1
      repeat.times_per_day = repeat.times_per_day || (raw.dose_times ? raw.dose_times.length : 1);
    }
  } else {
    // Normalize unspecified to 'none'
    if (!repeat || !repeat.frequency_type) repeat.frequency_type = 'none';
  }

  // Notification profile selection
  let notification_profile = null;
  if (raw.notification_profile) {
    notification_profile = raw.notification_profile;
  } else {
    // category specific defaults
    if (category === 'medications') {
      notification_profile = DEFAULT_NOTIFICATION_PROFILES.gentle_chime;
    } else if (category === 'appointments') {
      notification_profile = DEFAULT_NOTIFICATION_PROFILES.appointment_default;
    } else {
      notification_profile = DEFAULT_NOTIFICATION_PROFILES.default;
    }
  }

  // notify_before_minutes default (appointments often have buffers — default 0 here; appointment buffers handled below)
  const notify_before_minutes = typeof raw.notify_before_minutes === 'number' ? raw.notify_before_minutes : (raw.notify_before_minutes ? Number(raw.notify_before_minutes) : 0);

  // Build normalized metadata
  const metadata = raw.metadata && typeof raw.metadata === 'object' ? { ...raw.metadata } : {};
  // Ensure attachments array normalized
  if (metadata.attachments && !Array.isArray(metadata.attachments)) {
    metadata.attachments = [metadata.attachments];
  }

  // Appointment buffers: by default create buffer reminders 2 hours (120m) and 1 day (1440m) before the appointment.
  // These are provided in minutes and stored in metadata.buffers for downstream callers (UI/scheduler/saving flow).
  if (category === 'appointments') {
    metadata.buffers = Array.isArray(metadata.buffers) ? metadata.buffers : [120, 1440];
  }

  // Build final normalized payload
  const normalized = {
    // Basic fields
    title: raw.title ? String(raw.title).trim() : (raw.name || '') ,
    description: raw.description ? String(raw.description).trim() : (raw.notes || ''),
    category,
    schedule: finalSchedule,
    repeat,
    notification_profile,
    notify_before_minutes,
    notification_types: Array.isArray(raw.notification_types) ? raw.notification_types : (raw.notification_types ? [raw.notification_types] : ['push']),
    metadata,
    // Preserve original raw input for traceability/debug
    _raw_input: raw,
  };

  return normalized;
}

const DefaultsEngine = {
  resolveDefaults,
  computeNextSlot,
};

export default DefaultsEngine;