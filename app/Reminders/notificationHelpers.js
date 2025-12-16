/**
 * Notification helpers for Reminders feature
 * File: [`app/Reminders/notificationHelpers.js`](app/Reminders/notificationHelpers.js:1)
 *
 * Integrations & references:
 * - Scheduler: [`lib/reminderScheduler.js`](lib/reminderScheduler.js:1)
 * - UI screens: [`app/Reminders/index.js`](app/Reminders/index.js:1)
 * - Supabase helper: [`lib/supabase.js`](lib/supabase.js:1)
 *
 * Responsibilities:
 * - Provide functions to send local push notifications, TTS voice alerts, in-app banners,
 *   and a placeholder for email notifications.
 * - Offer a small in-process hook for in-app banners so screens can subscribe.
 *
 * Notes:
 * - This is a scaffold. Replace placeholders with your app's chosen notification & email
 *   infrastructure (e.g., Expo Notifications, native push, SendGrid, or server-side SMTP).
 * - Keep functions idempotent and handle platform differences where needed.
 */

import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import ReminderScheduler from '../../lib/reminderScheduler';
import * as SupabaseLib from '../../lib/supabase';
const supabase = SupabaseLib.supabase || SupabaseLib.default || SupabaseLib;

/**
 * Defensive helpers for environments where the native expo-notifications module
 * hasn't been installed / rebuilt yet (common error: "Cannot find native module 'ExpoPushTokenManager'").
 *
 * Strategy:
 * - Detect whether key native functions exist before calling them.
 * - Provide safeNoop fallbacks that log a warning and avoid throwing.
 */

function isNotificationsAvailable() {
  try {
    // check for the scheduler + permissions APIs we use
    return (
      Notifications &&
      typeof Notifications.scheduleNotificationAsync === 'function' &&
      typeof Notifications.getPermissionsAsync === 'function'
    );
  } catch (err) {
    return false;
  }
}

async function safeScheduleNotificationAsync(opts) {
  if (!isNotificationsAvailable()) {
    console.warn('expo-notifications native module not available — schedule skipped');
    return null;
  }
  try {
    return await Notifications.scheduleNotificationAsync(opts);
  } catch (err) {
    console.warn('safeScheduleNotificationAsync failed', err);
    return null;
  }
}

/* In-app banner subscribers (simple pub/sub) */
const inAppSubscribers = new Set();

export function subscribeInAppNotifications(fn) {
  inAppSubscribers.add(fn);
  return () => {
    inAppSubscribers.delete(fn);
  };
}

function publishInAppNotification(payload) {
  inAppSubscribers.forEach((fn) => {
    try {
      fn(payload);
    } catch (err) {
      console.warn('inApp subscriber failed', err);
    }
  });
}

/**
 * Build Notifications content object (platform-agnostic)
 * - reminder: record from Supabase
 */
function buildNotificationPayload(reminder) {
  const title = reminder.title || 'Reminder';
  const body = reminder.description || '';
  return {
    title,
    body,
    data: { reminderId: reminder.id },
  };
}

/**
 * Send a local push notification immediately.
 * Uses `expo-notifications` schedule API for immediate delivery when possible.
 */
export async function sendLocalNotificationNow(reminder) {
  if (!reminder || !reminder.id) throw new Error('sendLocalNotificationNow: invalid reminder');

  const content = buildNotificationPayload(reminder);

  // Defensive: ensure native module exists before calling into expo-notifications
  if (!isNotificationsAvailable()) {
    console.warn("sendLocalNotificationNow: expo-notifications native module unavailable. Falling back to in-app/TTS only.");
    // Show in-app banner and optionally TTS fallback
    publishInAppNotification({ type: 'notification', reminder, notificationId: null });
    try {
      // best-effort TTS fallback if voice is acceptable
      Speech.speak(`${reminder.title || 'Reminder'}. ${reminder.description || ''}`);
    } catch (e) {
      // ignore TTS errors
    }
    return null;
  }

  try {
    // On some platforms, immediate scheduling uses trigger: null
    const id = await safeScheduleNotificationAsync({
      content,
      trigger: null,
    });

    // Publish in-app banner as well
    publishInAppNotification({ type: 'notification', reminder, notificationId: id });

    return id;
  } catch (err) {
    console.error('sendLocalNotificationNow failed', err);
    // Fallback: try to show TTS if push fails (best-effort)
    try {
      Speech.speak(`${reminder.title || 'Reminder'}. ${reminder.description || ''}`);
    } catch (e) {
      // ignore
    }
    return null;
  }
}

/**
 * Schedule a notification using the ReminderScheduler helper.
 * This handles storing mapping and cancel/reschedule.
 */
export async function scheduleNotificationForReminder(reminder, options = {}) {
  // Ensure any required permissions are present
  try {
    await ReminderScheduler.ensurePermissions();
  } catch (err) {
    console.warn('scheduleNotificationForReminder: permission check failed', err);
  }

  try {
    const scheduledId = await ReminderScheduler.scheduleReminder(reminder, options);
    return scheduledId;
  } catch (err) {
    console.error('scheduleNotificationForReminder failed', err);
    return null;
  }
}

/**
 * Text-to-Speech voice alert for reminder.
 * Will speak title and optionally description based on params.
 * - polite: if true, speak quietly / shorter phrase. (placeholder option)
 */
export function speakReminder(reminder, { speakDescription = false, polite = false } = {}) {
  if (!reminder) return false;
  try {
    const title = reminder.title || 'Reminder';
    const desc = speakDescription ? (reminder.description || '') : '';
    const text = polite ? `${title}. ${desc}` : `${title}. ${desc}`;
    const options = {
      // Adjust voice/locale options here if needed; fallback to defaults.
    };
    Speech.speak(text, options);
    // Also publish an in-app event so UI can show a banner as well
    publishInAppNotification({ type: 'tts', reminder });
    return true;
  } catch (err) {
    console.warn('speakReminder failed', err);
    return false;
  }
}

/**
 * Send email notification placeholder.
 * - This function demonstrates sending an email via Supabase Edge Function or via
 *   a server-side webhook. Replace rpc name / endpoint with your implementation.
 *
 * Note: Supabase doesn't provide direct SMTP from client; prefer calling your
 * serverless function or 3rd-party API from the backend to send email.
 */
export async function sendEmailNotification(reminder) {
  if (!reminder) return false;

  // Example: call a Supabase function named "send_reminder_email"
  // which you would implement server-side to avoid exposing API keys.
  try {
    // Attempt to call RPC (server-side function)
    const { data, error } = await supabase.rpc('send_reminder_email', {
      p_reminder_id: reminder.id,
    });
    if (error) {
      console.warn('sendEmailNotification: rpc error', error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('sendEmailNotification failed', err);
    return false;
  }
}

/**
 * Convenience: handle delivery according to notification_types in reminder record.
 * - This inspects reminder.notification_types (array) and performs the requested deliveries.
 *
 * Returns an object describing which channels succeeded.
 */
export async function deliverReminder(reminder) {
  if (!reminder) throw new Error('deliverReminder: missing reminder');
 
  const types = Array.isArray(reminder.notification_types) ? reminder.notification_types : ['push'];
  const results = {};
 
  if (types.includes('in_app')) {
    publishInAppNotification({ type: 'in_app', reminder });
    results.in_app = true;
  }
 
  if (types.includes('push')) {
    try {
      const id = await sendLocalNotificationNow(reminder);
      results.push = !!id;
    } catch (err) {
      results.push = false;
    }
  }
 
  if (types.includes('voice')) {
    try {
      results.voice = speakReminder(reminder, { speakDescription: true });
    } catch (err) {
      results.voice = false;
    }
  }
 
  if (types.includes('email')) {
    try {
      results.email = await sendEmailNotification(reminder);
    } catch (err) {
      results.email = false;
    }
  }
 
  // If the reminder is recurring (daily/weekly), attempt to schedule the next occurrence.
  try {
    const freq = String(reminder.frequency_type || '').toLowerCase();
    if (['daily', 'weekly'].includes(freq)) {
      await ReminderScheduler.scheduleNextOccurrence(reminder);
    }
  } catch (err) {
    console.warn('deliverReminder: scheduleNextOccurrence failed', err);
  }
 
  return results;
}

/**
 * Cancel scheduled notification and optionally notify UI
 */
export async function cancelReminderNotification(reminderId) {
  try {
    await ReminderScheduler.cancelScheduledReminder(reminderId);
    publishInAppNotification({ type: 'cancel', reminderId });
    return true;
  } catch (err) {
    console.warn('cancelReminderNotification failed', err);
    return false;
  }
}

/**
 * Helper used by UI when a reminder fires while the app is in foreground.
 * This allows the app to both show in-app UI and optionally speak the reminder.
 *
 * Example usage:
 * - Hook `Notifications.addNotificationReceivedListener` and call this when a notification is received.
 */
export async function handleForegroundNotification(notification) {
  try {
    const reminderId = notification?.request?.content?.data?.reminderId;
    if (!reminderId) {
      publishInAppNotification({ type: 'notification', raw: notification });
      return;
    }

    // best-effort fetch latest reminder state
    const { data: reminder, error } = await supabase.from('reminders').select('*').eq('id', reminderId).single();
    if (reminder && !error) {
      publishInAppNotification({ type: 'notification', reminder });
      // Optionally speak if user's preference is voice-first
      // (This preference lookup is left to UI / settings code to decide)
    } else {
      publishInAppNotification({ type: 'notification', raw: notification });
    }
  } catch (err) {
    console.warn('handleForegroundNotification failed', err);
  }
}

/* Export public API */
export default {
  subscribeInAppNotifications,
  sendLocalNotificationNow,
  scheduleNotificationForReminder,
  speakReminder,
  sendEmailNotification,
  deliverReminder,
  cancelReminderNotification,
  handleForegroundNotification,
};