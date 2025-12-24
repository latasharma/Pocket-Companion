/**
 * File: [`lib/routineAnchors.js`](lib/routineAnchors.js:1)
 *
 * Implements Story 1.1 — Routine anchors model + defaults
 *
 * - Defines RoutineAnchor defaults (Breakfast/Lunch/Dinner/Bedtime)
 * - Persists anchors in AsyncStorage with a simple migration strategy
 * - Exposes API to change anchors; changing an anchor triggers a reschedule
 *   of future reminders/medications that are tied to that anchor.
 *
 * Usage:
 *  - import RoutineAnchors from './lib/routineAnchors';
 *  - await RoutineAnchors.initialize(); // call at app start
 *  - const anchors = await RoutineAnchors.getAnchors();
 *  - await RoutineAnchors.setAnchor('Breakfast', '08:30');
 *
 * Notes / Assumptions:
 *  - Reminders/medications that are tied to anchors are expected to have a
 *    column `routine_anchor` (string: one of Breakfast/Lunch/Dinner/Bedtime).
 *    If your DB uses a different column, adapt the queries in
 *    rescheduleRemindersForAnchorChange.
 *  - This module attempts to update `medications` first (meds table), then
 *    falls back to `reminders` table for legacy rows.
 *  - Time strings accepted: "HH:MM" or "HH:MM:SS" (24-hour). Stored anchor
 *    values are normalized to "HH:MM:SS".
 *  - Rescheduling strategy: for any future reminder row with a matching
 *    routine_anchor, we preserve the original date, but replace the time
 *    portion with the new anchor time and write ISO timestamps back to DB.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import ReminderScheduler from './reminderScheduler';
import * as SupabaseLib from './supabase';

const supabase = SupabaseLib.supabase || SupabaseLib.default || SupabaseLib;

const STORAGE_KEY = '@poco:routine_anchors';
const LEGACY_STORAGE_KEY = '@poco:anchors'; // attempted migration source

// Default anchor times (24-hour): Breakfast 08:00, Lunch 12:30, Dinner 18:00, Bedtime 21:00
const DEFAULT_ANCHORS = {
  Breakfast: '08:00:00',
  Lunch: '12:30:00',
  Dinner: '18:00:00',
  Bedtime: '21:00:00',
};

/**
 * Helper: normalize time string to "HH:MM:SS"
 */
function normalizeTimeStr(t) {
  if (!t || typeof t !== 'string') return null;
  const s = t.trim();
  // HH:MM
  const m1 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m1) {
    const hh = m1[1].padStart(2, '0');
    const mm = m1[2];
    return `${hh}:${mm}:00`;
  }
  // HH:MM:SS
  const m2 = s.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (m2) {
    const hh = m2[1].padStart(2, '0');
    const mm = m2[2];
    const ss = m2[3];
    return `${hh}:${mm}:${ss}`;
  }
  return null;
}

/**
 * Load anchors from storage (merge with defaults)
 */
async function getAnchors() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    // normalize stored times
    const normalized = {};
    for (const k of Object.keys(DEFAULT_ANCHORS)) {
      const val = stored[k] || DEFAULT_ANCHORS[k];
      normalized[k] = normalizeTimeStr(val) || DEFAULT_ANCHORS[k];
    }
    return normalized;
  } catch (err) {
    console.warn('routineAnchors.getAnchors: failed to load, returning defaults', err);
    return { ...DEFAULT_ANCHORS };
  }
}

/**
 * Persist anchors map
 */
async function saveAnchors(map) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('routineAnchors.saveAnchors: failed to save', err);
  }
}

/**
 * Combine a date ISO string with a time string ("HH:MM:SS") -> ISO string
 * Preserves the date and local timezone interpretation.
 */
function combineDateWithTimeISO(dateISO, timeStr) {
  try {
    const t = normalizeTimeStr(timeStr);
    if (!t) return null;
    // Parse dateISO into local date components
    const d = new Date(dateISO);
    if (isNaN(d.getTime())) return null;
    const parts = t.split(':').map((p) => Number(p));
    // Set local hours/minutes/seconds
    d.setHours(parts[0], parts[1], parts[2] || 0, 0);
    return d.toISOString();
  } catch (err) {
    console.warn('combineDateWithTimeISO failed', err);
    return null;
  }
}

/**
 * Reschedule all future reminders/medications that reference a given anchor.
 * - anchorName: 'Breakfast' | 'Lunch' | 'Dinner' | 'Bedtime'
 * - newTimeStr: 'HH:MM:SS' or similar
 *
 * Behavior:
 *  - Finds future rows (reminder_time >= now) where routine_anchor == anchorName
 *  - Replaces the time portion of reminder_time with newTimeStr while keeping the date
 *  - Updates rows in `medications` (preferred) then `reminders` as fallback
 *  - For each updated row, triggers ReminderScheduler.scheduleReminder(updated)
 */
async function rescheduleRemindersForAnchorChange(anchorName, newTimeStr) {
  if (!anchorName || !newTimeStr) return { updated: 0 };
  const normalizedTime = normalizeTimeStr(newTimeStr);
  if (!normalizedTime) {
    console.warn('rescheduleRemindersForAnchorChange: invalid time', newTimeStr);
    return { updated: 0 };
  }

  const now = new Date().toISOString();
  let updatedCount = 0;
  try {
    // Try updating medications table first (meds)
    try {
      const { data: meds, error: medsError } = await supabase
        .from('medications')
        .select('*')
        .eq('routine_anchor', anchorName)
        .gte('reminder_time', now);

      if (!medsError && Array.isArray(meds) && meds.length) {
        const patches = meds.map((row) => {
          const newISO = combineDateWithTimeISO(row.reminder_time, normalizedTime) || row.reminder_time;
          return { id: row.id, reminder_time: newISO, status: 'pending', updated_at: new Date().toISOString() };
        });

        // Bulk update: supabase doesn't support array-of-patches in a single call reliably across clients,
        // so update rows one-at-a-time to keep logic simple and allow per-row scheduling.
        for (const p of patches) {
          try {
            const { data: updated, error: updateErr } = await supabase
              .from('medications')
              .update({ reminder_time: p.reminder_time, status: p.status, updated_at: p.updated_at })
              .eq('id', p.id)
              .select()
              .single();
            if (!updateErr && updated) {
              updatedCount++;
              // schedule notification for updated record
              try {
                await ReminderScheduler.scheduleReminder(updated);
              } catch (e) {
                // continue, scheduling is best-effort
              }
            }
          } catch (inner) {
            console.warn('rescheduleRemindersForAnchorChange: meds update failed for', p.id, inner);
          }
        }
      }
    } catch (e) {
      console.warn('rescheduleRemindersForAnchorChange: meds query failed', e);
    }

    // Fallback: update reminders table (legacy or non-medication reminders)
    try {
      const { data: reminders, error: remindersError } = await supabase
        .from('reminders')
        .select('*')
        .eq('routine_anchor', anchorName)
        .gte('reminder_time', now);

      if (!remindersError && Array.isArray(reminders) && reminders.length) {
        for (const row of reminders) {
          const newISO = combineDateWithTimeISO(row.reminder_time, normalizedTime) || row.reminder_time;
          try {
            const { data: updated, error: updateErr } = await supabase
              .from('reminders')
              .update({ reminder_time: newISO, status: 'pending', updated_at: new Date().toISOString() })
              .eq('id', row.id)
              .select()
              .single();
            if (!updateErr && updated) {
              updatedCount++;
              try {
                await ReminderScheduler.scheduleReminder(updated);
              } catch (e) {
                // ignore scheduling errors
              }
            }
          } catch (inner) {
            console.warn('rescheduleRemindersForAnchorChange: reminders update failed for', row.id, inner);
          }
        }
      }
    } catch (e) {
      console.warn('rescheduleRemindersForAnchorChange: reminders query failed', e);
    }

    // As a final pass, refresh all scheduled notifications (best-effort)
    try {
      await ReminderScheduler.rescheduleAll();
    } catch (e) {
      // ignore
    }

    console.info('rescheduleRemindersForAnchorChange: updated rows count:', updatedCount);
    return { updated: updatedCount };
  } catch (err) {
    console.error('rescheduleRemindersForAnchorChange: unexpected error', err);
    return { updated: updatedCount, error: String(err) };
  }
}

/**
 * Set single anchor and trigger reschedule of future instances tied to it.
 * - anchorName: one of Breakfast/Lunch/Dinner/Bedtime
 * - timeStr: "HH:MM" or "HH:MM:SS"
 */
async function setAnchor(anchorName, timeStr) {
  if (!anchorName || !DEFAULT_ANCHORS[anchorName]) {
    throw new Error('setAnchor: invalid anchor name');
  }
  const normalized = normalizeTimeStr(timeStr);
  if (!normalized) {
    throw new Error('setAnchor: invalid time format');
  }

  const current = await getAnchors();
  const next = { ...current, [anchorName]: normalized };
  await saveAnchors(next);

  // Trigger reschedule for affected future reminders
  try {
    await rescheduleRemindersForAnchorChange(anchorName, normalized);
  } catch (err) {
    console.warn('setAnchor: reschedule failed', err);
  }
  return next;
}

/**
 * initialize(): migration + ensure defaults exist.
 * - Should be called once at app start (after auth if you want DB-backed seeds).
 */
async function initialize() {
  try {
    // Attempt a simple migration from legacy key (if present)
    try {
      const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        try {
          const parsed = JSON.parse(legacy);
          // If legacy has expected keys, migrate them
          const candidate = {};
          for (const k of Object.keys(DEFAULT_ANCHORS)) {
            if (parsed[k]) candidate[k] = normalizeTimeStr(parsed[k]) || DEFAULT_ANCHORS[k];
          }
          // If we have at least one migrated value, persist it merged with defaults
          if (Object.keys(candidate).length) {
            const merged = { ...DEFAULT_ANCHORS, ...candidate };
            await saveAnchors(merged);
            // remove legacy key (best-effort)
            try {
              await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
            } catch (e) {
              // ignore
            }
            console.info('routineAnchors: migrated legacy anchors');
            return merged;
          }
        } catch (e) {
          // ignore parsing errors and fallthrough to normal init
        }
      }
    } catch (e) {
      // ignore
    }

    // Ensure storage has anchors; if not, write defaults
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      await saveAnchors({ ...DEFAULT_ANCHORS });
      console.info('routineAnchors: initialized defaults');
      return { ...DEFAULT_ANCHORS };
    }

    // Normalize stored anchors and save back if required
    const stored = raw ? JSON.parse(raw) : {};
    let changed = false;
    const normalized = {};
    for (const k of Object.keys(DEFAULT_ANCHORS)) {
      const value = stored[k] || DEFAULT_ANCHORS[k];
      const n = normalizeTimeStr(value) || DEFAULT_ANCHORS[k];
      normalized[k] = n;
      if (n !== value) changed = true;
    }
    if (changed) {
      await saveAnchors(normalized);
    }
    return normalized;
  } catch (err) {
    console.warn('routineAnchors.initialize failed, falling back to defaults', err);
    // best-effort fallback
    await saveAnchors({ ...DEFAULT_ANCHORS });
    return { ...DEFAULT_ANCHORS };
  }
}

/**
 * Export default object
 */
const RoutineAnchors = {
  DEFAULT_ANCHORS,
  getAnchors,
  setAnchor,
  rescheduleRemindersForAnchorChange,
  initialize,
};

export default RoutineAnchors;