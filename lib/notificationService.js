/**
 * Cross-platform notification service wrapper
 * File: [`lib/notificationService.js`](lib/notificationService.js:1)
 *
 * Purpose:
 * - Provide a small, testable wrapper over Expo Notifications for scheduling,
 *   updating and cancelling local notifications (one-time + simple repeating).
 * - Persist mapping reminderId -> scheduledNotificationId in AsyncStorage so
 *   scheduled notifications can be cancelled/rescheduled across restarts.
 *
 * Notes:
 * - This wrapper complements the existing [`lib/reminderScheduler.js`](lib/reminderScheduler.js:1)
 *   (which handles a lot of reminder lifecycle logic). Where possible the scheduler
 *   functions are reused (for one-time scheduling). For simple repeating schedules
 *   (daily / weekly single-day), we attempt to use the platform repeating trigger.
 *
 * Acceptance target (Story 4.1):
 * - Expose schedule / update / cancel / reschedule operations so the app can
 *   schedule and reschedule reminders reliably.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import ReminderScheduler from './reminderScheduler';

const STORAGE_KEY = '@poco:reminder_notification_map';

/* Simple map persistence helpers (mirrors behavior in reminderScheduler) */
async function loadMap() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('notificationService: failed to load map', err);
    return {};
  }
}

async function saveMap(map) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('notificationService: failed to save map', err);
  }
}

/* Basic permission helper (delegates to ReminderScheduler implementation) */
export async function ensurePermissions() {
  // ReminderScheduler exports ensurePermissions which already handles expo-notifications.
  if (typeof ReminderScheduler.ensurePermissions === 'function') {
    return ReminderScheduler.ensurePermissions();
  }
  // Fallback: try basic expo-notifications permission flow
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || current.ios?.status === Notifications.PermissionStatus.GRANTED) {
      return true;
    }
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted || requested.ios?.status === Notifications.PermissionStatus.GRANTED;
  } catch (err) {
    console.warn('notificationService.ensurePermissions failed', err);
    return false;
  }
}

/* Utility: parse an ISO datetime and return { hour, minute, weekday } if possible */
function parseIsoToTimeParts(iso) {
  try {
    if (!iso || typeof iso !== 'string') return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return { hour: d.getHours(), minute: d.getMinutes(), weekday: d.getDay() || 7 }; // Expo weekdays are 1-7 (Mon-Sun) in some implementations; keep 0-6 fallback
  } catch (err) {
    return null;
  }
}

/**
 * Schedule a notification for a reminder.
 * - Handles:
 *    - repeating daily/weekly when simple time info is available
 *    - one-time scheduling (delegates to ReminderScheduler)
 *
 * reminder: object (must include at least id and reminder_time or repeat info)
 * options:
 *   - overrideDate: Date or ISO string to schedule at (one-time)
 *
 * Returns scheduledNotificationId or null.
 */
export async function scheduleNotification(reminder, options = {}) {
  if (!reminder || !reminder.id) throw new Error('scheduleNotification: invalid reminder');

  // Ensure permission best-effort
  try {
    await ensurePermissions();
  } catch (err) {
    // continue even if permission check fails (scheduling will likely fail later)
  }

  // If reminder indicates a repeating schedule, try to use a repeating trigger
  const freq =
    (reminder.repeat && reminder.repeat.frequency_type) ||
    reminder.repeat_frequency ||
    (reminder.frequency_type || null);
  const freqStr = freq ? String(freq).toLowerCase() : null;

  // Prefer explicit overrideDate for one-time scheduling
  if (options.overrideDate) {
    // Delegate to ReminderScheduler for consistent persistence / DB flows
    return ReminderScheduler.scheduleReminder(reminder, { overrideDate: options.overrideDate });
  }

  // If repeating daily and we can extract hour/minute from reminder_time -> use repeating trigger
  if (freqStr === 'daily') {
    const parts = parseIsoToTimeParts(reminder.reminder_time);
    if (parts) {
      const trigger = { hour: parts.hour, minute: parts.minute, repeats: true };
      try {
        const content = {
          title: reminder.title || 'Reminder',
          body: reminder.description || '',
          data: { reminderId: reminder.id },
        };
        const id = await Notifications.scheduleNotificationAsync({ content, trigger });
        const map = await loadMap();
        map[reminder.id] = id;
        await saveMap(map);
        return id;
      } catch (err) {
        console.warn('notificationService: repeating daily schedule failed, falling back', err);
        // fallback to one-time scheduling via ReminderScheduler
        return ReminderScheduler.scheduleReminder(reminder);
      }
    }
  }

  // If repeating weekly and repeat_days has a single day, attempt weekly repeating trigger
  if (freqStr === 'weekly') {
    // Accept repeat_days as array of day names or numbers (Sun=0..Sat=6 or Mon=1..Sun=7 depending on source)
    const rd = Array.isArray(reminder.repeat_days) ? reminder.repeat_days : (reminder.repeat && reminder.repeat.repeat_days) || null;
    const parts = parseIsoToTimeParts(reminder.reminder_time);
    if (rd && rd.length === 1 && parts) {
      // Map day to 1-7 (Mon-Sun) for some platforms; expo may accept weekday: number
      let dayVal = rd[0];
      if (typeof dayVal === 'string') {
        const s = dayVal.trim().slice(0, 3).toLowerCase();
        const map = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
        dayVal = map[s] ?? null;
      }
      if (typeof dayVal === 'number') {
        // attempt to use weekday trigger (platform support varies)
        try {
          const trigger = { weekday: dayVal, hour: parts.hour, minute: parts.minute, repeats: true };
          const content = {
            title: reminder.title || 'Reminder',
            body: reminder.description || '',
            data: { reminderId: reminder.id },
          };
          const id = await Notifications.scheduleNotificationAsync({ content, trigger });
          const map = await loadMap();
          map[reminder.id] = id;
          await saveMap(map);
          return id;
        } catch (err) {
          console.warn('notificationService: weekly repeating schedule failed, falling back', err);
          return ReminderScheduler.scheduleReminder(reminder);
        }
      }
    }
  }

  // For all other cases, delegate to ReminderScheduler which handles one-time scheduling and DB mapping.
  return ReminderScheduler.scheduleReminder(reminder);
}

/**
 * Update an existing scheduled notification:
 * - Cancels any existing scheduled notification for the reminder and re-schedules.
 */
export async function updateNotification(reminder, options = {}) {
  if (!reminder || !reminder.id) throw new Error('updateNotification: invalid reminder');
  try {
    await cancelNotification(reminder.id);
  } catch (err) {
    // continue to scheduling even if cancel fails
    console.warn('notificationService.updateNotification: cancel failed', err);
  }
  return scheduleNotification(reminder, options);
}

/**
 * Cancel a scheduled notification for a reminderId (removes mapping)
 */
export async function cancelNotification(reminderId) {
  if (!reminderId) return false;
  const map = await loadMap();
  const nid = map[reminderId];
  if (!nid) return true; // nothing to cancel
  try {
    await Notifications.cancelScheduledNotificationAsync(nid);
  } catch (err) {
    console.warn('notificationService.cancelNotification: cancel failed', err);
    // proceed to remove mapping anyway
  }
  delete map[reminderId];
  await saveMap(map);
  return true;
}

/**
 * Reschedule all reminders by delegating to ReminderScheduler.rescheduleAll
 */
export async function rescheduleAll() {
  if (typeof ReminderScheduler.rescheduleAll === 'function') {
    return ReminderScheduler.rescheduleAll();
  }
  return false;
}

/* Export public API */
const NotificationService = {
  ensurePermissions,
  scheduleNotification,
  updateNotification,
  cancelNotification,
  rescheduleAll,
};

export default NotificationService;