/**
 * Lightweight reminder scheduler for PoCo app.
 * File: [`lib/reminderScheduler.js`](lib/reminderScheduler.js:1)
 *
 * Responsibilities:
 * - On app start, fetch upcoming reminders from Supabase and schedule local notifications.
 * - Provide functions to schedule, reschedule, snooze and cancel reminders.
 * - Persist mapping of reminderId -> scheduledNotificationId in AsyncStorage so scheduled
 *   notifications can be cancelled/rescheduled across app restarts.
 *
 * Notes:
 * - This scaffold assumes integration with `expo-notifications` and `@react-native-async-storage/async-storage`.
 * - Replace or adapt to native notification modules if not using Expo.
 * - Recurrence / complex repeat rules are out of scope for this simple scheduler and are marked TODO.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as SupabaseLib from '../lib/supabase';
import Escalation from './escalation';
import RoutineAnchors from './routineAnchors';
import SnoozePatterns from './snoozePatterns';
const supabase = SupabaseLib.supabase || SupabaseLib.default || SupabaseLib;

const STORAGE_KEY = '@poco:reminder_notification_map';

/**
 * Helper: load the mapping of reminderId -> notificationId (string)
 */
async function loadMap() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('reminderScheduler: failed to load map', err);
    return {};
  }
}

/**
 * Helper: persist the mapping
 */
async function saveMap(map) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('reminderScheduler: failed to save map', err);
  }
}

/**
 * Request and ensure notification permissions (best-effort).
 * Returns boolean whether permission granted.
 */
async function ensurePermissions() {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || current.ios?.status === Notifications.PermissionStatus.GRANTED) {
      return true;
    }
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted || requested.ios?.status === Notifications.PermissionStatus.GRANTED;
  } catch (err) {
    console.warn('reminderScheduler: permission request failed', err);
    return false;
  }
}

/**
 * Build notification content from reminder record
 */
function buildNotificationContent(reminder) {
  const title = reminder.title || 'Reminder';
  const body = reminder.description || '';
  return {
    title,
    body,
    data: { reminderId: reminder.id },
  };
}

/**
 * Schedule a single reminder.
 * - reminder: object as returned from Supabase (must include id and reminder_time)
 * - options:
 *    - overrideDate: Date instance to schedule at instead of reminder.reminder_time
 * Returns scheduledNotificationId (string)
 */
async function scheduleReminder(reminder, options = {}) {
  if (!reminder || !reminder.id) throw new Error('scheduleReminder: invalid reminder');

  const map = await loadMap();

  // Cancel any existing scheduled notification for this reminder first
  if (map[reminder.id]) {
    try {
      await Notifications.cancelScheduledNotificationAsync(map[reminder.id]);
    } catch (err) {
      // ignore
    }
  }

  const notifyBefore = Number(reminder.notify_before_minutes || 0);

  // Resolve targetDate from different reminder_time formats
  let targetDate = null;

  // 1) overrideDate option (Date instance or ISO string)
  if (options.overrideDate) {
    targetDate = new Date(options.overrideDate);
  } else if (typeof reminder.reminder_time === 'string' && reminder.reminder_time.startsWith('routine:')) {
    // 2) routine token: resolve using RoutineAnchors to next occurrence of that anchor
    try {
      const token = reminder.reminder_time.split(':')[1]; // e.g. 'breakfast'
      const canonical = token ? token.charAt(0).toUpperCase() + token.slice(1) : token;
      const anchors = await RoutineAnchors.getAnchors();
      const timeStr = anchors[canonical] || anchors[token] || null; // HH:MM:SS
      if (timeStr) {
        const parts = timeStr.split(':').map((p) => Number(p));
        const now = new Date();
        let candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parts[0], parts[1], parts[2] || 0, 0);
        // If the candidate time is in the past, schedule for tomorrow
        if (candidate.getTime() <= Date.now()) {
          candidate = new Date(candidate.getFullYear(), candidate.getMonth(), candidate.getDate() + 1, parts[0], parts[1], parts[2] || 0, 0);
        }
        targetDate = candidate;
      }
    } catch (e) {
      console.warn('scheduleReminder: failed to resolve routine token', e);
    }
  } else {
    // 3) explicit ISO or other string
    targetDate = new Date(reminder.reminder_time);
  }

  if (!targetDate || isNaN(targetDate.getTime())) {
    console.warn('scheduleReminder: invalid reminder_time, skipping', reminder);
    return null;
  }

  if (notifyBefore > 0) {
    targetDate = new Date(targetDate.getTime() - notifyBefore * 60000);
  }

  // If target is in the past, don't schedule (could mark missed or fire immediately)
  if (targetDate.getTime() <= Date.now()) {
    console.info('scheduleReminder: targetDate is in the past, not scheduling', reminder.id);
    return null;
  }

  const content = buildNotificationContent(reminder);

  // Simple date trigger
  const trigger = targetDate;

  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content,
      trigger,
    });

    map[reminder.id] = notificationId;
    await saveMap(map);
    // Start escalation chain for Tier-1 items (Escalation.startEscalation is a no-op for non-T1)
    try {
      await Escalation.startEscalation(reminder);
    } catch (e) {
      console.warn('reminderScheduler: startEscalation failed', e);
    }
    return notificationId;
  } catch (err) {
    console.error('scheduleReminder: failed to schedule', err);
    return null;
  }
}

/**
 * Compute next occurrence for basic recurrence (daily/weekly).
 * Returns ISO string or null if no next occurrence.
 */
function computeNextOccurrence(reminder) {
  if (!reminder || !reminder.reminder_time) return null;
  try {
    const freq = (reminder.frequency_type || '').toLowerCase();
    const current = new Date(reminder.reminder_time);
    const now = new Date();
    let next = null;

    if (freq === 'daily') {
      next = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    } else if (freq === 'weekly') {
      // If repeat_days provided, compute next matching day
      const rd = Array.isArray(reminder.repeat_days) ? reminder.repeat_days : null;
      const dayNameToIndex = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      if (rd && rd.length) {
        // map to indexes
        const targetIdx = rd
          .map((d) => {
            if (typeof d === 'number') return d;
            const s = String(d).trim();
            if (s.length === 0) return null;
            // try full name or three-letter
            const key = s.length >= 3 ? s.slice(0, 3) : s;
            // normalize first letter uppercase
            const cap = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
            return dayNameToIndex[cap] ?? null;
          })
          .filter((n) => typeof n === 'number');
        const curIdx = current.getDay();
        // find minimal days ahead
        let minDays = null;
        for (const idx of targetIdx) {
          let diff = (idx - curIdx + 7) % 7;
          if (diff === 0) diff = 7; // schedule next week if same day
          if (minDays === null || diff < minDays) minDays = diff;
        }
        if (minDays == null) {
          next = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else {
          next = new Date(current.getTime() + minDays * 24 * 60 * 60 * 1000);
        }
      } else {
        next = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
      }
    } else {
      // once / custom / unknown - no automatic next occurrence handled here
      return null;
    }

    // Ensure next is in the future; if not, advance until it is
    if (next && next.getTime() <= now.getTime()) {
      const step = freq === 'daily' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
      while (next.getTime() <= now.getTime()) {
        next = new Date(next.getTime() + step);
      }
    }

    return next.toISOString();
  } catch (err) {
    console.warn('computeNextOccurrence failed', err);
    return null;
  }
}

/**
 * Schedule the next occurrence for a recurring reminder/medication.
 * - Computes next occurrence using computeNextOccurrence
 * - Updates the underlying row in the database (attempts `medications` first, falls back to `reminders`)
 * - Calls scheduleReminder(updated) to persist and schedule the notification
 *
 * Returns the updated record or null on failure / when no next occurrence.
 */
async function scheduleNextOccurrence(reminder) {
  if (!reminder || !reminder.id) return null;
  try {
    const nextISO = computeNextOccurrence(reminder);
    if (!nextISO) return null;

    let updated = null;

    // Try updating medications table (for medication records)
    try {
      const { data, error } = await supabase
        .from('medications')
        .update({ reminder_time: nextISO, status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', reminder.id)
        .select()
        .single();
      if (!error) updated = data;
    } catch (e) {
      // ignore and try fallback
    }

    // Fallback to the older `reminders` table if medications update didn't succeed
    if (!updated) {
      try {
        const { data, error } = await supabase
          .from('reminders')
          .update({ reminder_time: nextISO, status: 'pending', updated_at: new Date().toISOString() })
          .eq('id', reminder.id)
          .select()
          .single();
        if (!error) updated = data;
      } catch (e) {
        // ignore
      }
    }

    if (updated) {
      // Schedule the newly-updated record
      await scheduleReminder(updated);
      return updated;
    }

    return null;
  } catch (err) {
    console.error('scheduleNextOccurrence failed', err);
    return null;
  }
}

/**
 * Cancel a scheduled reminder (by reminderId).
 * Will remove mapping in AsyncStorage and cancel scheduled notification.
 */
async function cancelScheduledReminder(reminderId) {
  if (!reminderId) return;
  const map = await loadMap();
  const notificationId = map[reminderId];
  if (notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (err) {
      console.warn('cancelScheduledReminder: cancel failed', err);
    }
    delete map[reminderId];
    await saveMap(map);
  }
}

/**
 * Snooze a reminder by minutes.
 * - Updates reminder.reminder_time in Supabase to the new time and reschedules notification.
 * - minutes: number (e.g., 5, 10, 30, 60)
 * Returns updated reminder record or null on failure.
 */
async function snoozeReminder(reminderId, minutes = 5) {
  if (!reminderId) throw new Error('snoozeReminder: missing reminderId');
  try {
    // Fetch current reminder
    const { data: reminder, error: fetchErr } = await supabase.from('reminders').select('*').eq('id', reminderId).single();
    if (fetchErr || !reminder) {
      console.warn('snoozeReminder: could not fetch reminder', fetchErr);
      return null;
    }

    const currentTime = new Date(reminder.reminder_time);
    const newTime = new Date(currentTime.getTime() + minutes * 60000).toISOString();

    const { data: updated, error: updateErr } = await supabase
      .from('reminders')
      .update({ reminder_time: newTime, status: 'snoozed', updated_at: new Date().toISOString() })
      .eq('id', reminderId)
      .select()
      .single();

    if (updateErr || !updated) {
      console.warn('snoozeReminder: failed to update reminder', updateErr);
      return null;
    }

    // Record snooze pattern (best-effort). This will detect repeating snoozes and prompt user to update anchors.
    try {
      await SnoozePatterns.recordSnooze(updated, updated.reminder_time);
    } catch (e) {
      console.warn('snoozeReminder: recordSnooze failed', e);
    }

    // Reschedule local notification
    await scheduleReminder(updated);

    return updated;
  } catch (err) {
    console.error('snoozeReminder: error', err);
    return null;
  }
}

/**
 * Reschedule all upcoming reminders:
 * - Fetch reminders from Supabase where is_deleted = false and status in ('pending','snoozed')
 * - Schedule each reminder's notification using scheduleReminder
 *
 * This should be called at app start (after auth is ready) and after create/update operations.
 */
async function rescheduleAll() {
  try {
    const permission = await ensurePermissions();
    if (!permission) {
      console.warn('rescheduleAll: notification permission denied');
      return;
    }

    // fetch upcoming reminders (within next 1 year to limit results)
    const now = new Date().toISOString();
    const oneYear = new Date();
    oneYear.setFullYear(oneYear.getFullYear() + 1);
    const oneYearISO = oneYear.toISOString();

    // Fetch reminders including those that use routine tokens (e.g. 'routine:breakfast').
    // To ensure we include token-based rows, fetch all pending/snoozed reminders for the user
    // and perform scheduling resolution in JS. Limit results to 2000 to avoid huge queries.
    const { data: reminders, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('is_deleted', false)
      .in('status', ['pending', 'snoozed'])
      .order('reminder_time', { ascending: true })
      .limit(2000);

    if (error) {
      console.warn('rescheduleAll: error fetching reminders', error);
      return;
    }

    for (const r of reminders || []) {
      try {
        await scheduleReminder(r);
      } catch (err) {
        console.warn('rescheduleAll: scheduling failed for', r.id, err);
      }
    }
  } catch (err) {
    console.error('rescheduleAll: unexpected error', err);
  }
}

/**
 * Clear all scheduled reminders managed by this app (useful for logout or account switch).
 * Cancels scheduled notifications and clears the persistent map.
 */
 async function clearAllScheduled() {
  try {
    const map = await loadMap();
    const ids = Object.values(map);
    for (const nid of ids) {
      try {
        await Notifications.cancelScheduledNotificationAsync(nid);
      } catch (err) {
        // ignore per-notification errors
      }
    }
    await saveMap({});
  } catch (err) {
    console.warn('clearAllScheduled: failed', err);
  }
}

/**
 * Export default helper object
 */
const ReminderScheduler = {
  ensurePermissions,
  scheduleReminder,
  scheduleNextOccurrence,
  computeNextOccurrence,
  cancelScheduledReminder,
  snoozeReminder,
  rescheduleAll,
  clearAllScheduled,
};
 
export default ReminderScheduler;

/*
  TODOs / Extensions:
  - Support repeat_frequency (daily/weekly/monthly/yearly/custom) using either
    recurring scheduled notifications (platform dependent) or scheduling the next occurrence
    after each notification fires.
  - Add handling to mark reminders as 'missed' when time passed without firing.
  - Add logic to immediately fire a notification for reminders scheduled within a small threshold
    when the app is in foreground (if desired).
  - Consider using a server-side scheduler (cron / supabase functions) for more robust delivery
    when the app is not running, especially for push notifications.
*/