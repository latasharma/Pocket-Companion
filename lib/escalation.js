/**
 * File: [`lib/escalation.js`](lib/escalation.js:1)
 *
 * Story 8.1 — Tier-1 escalation state machine
 *
 * Responsibilities:
 * - For Tier-1 reminders, schedule follow-up escalation notifications at:
 *     - +15 minutes (repeat alert)
 *     - +45 minutes (nudge)
 *     - +60 minutes (caregiver escalation trigger)
 * - Persist escalation notification ids per reminder so they can be cancelled.
 * - Provide startEscalation(reminder) and stopEscalation(reminderId).
 *
 * Notes:
 * - This implementation schedules local notifications using expo-notifications directly.
 * - It persists escalation mapping under AsyncStorage key '@poco:escalation_map'.
 * - The module is conservative: it skips scheduling escalation milestones that are already in the past.
 * - The caregiver escalation (T+60) currently schedules a local notification with escalation metadata.
 *   Server-side caregiver integration is out-of-scope for Story 8.1 and is left for Story 8.2.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import NotificationTiers from './notificationTiers';
import ReminderScheduler from './reminderScheduler';
import { supabase } from './supabase'; // server client used to register caregiver escalation events
 
const STORAGE_KEY = '@poco:escalation_map';
const CG_STORAGE_KEY = '@poco:caregiver_links';

/**
 * escalation map shape:
 * {
 *   [reminderId]: {
 *     notifications: [
 *       { id: '<notificationId>', level: 1, scheduledAt: '<ISO>' },
 *       ...
 *     ],
 *     createdAt: '<ISO>'
 *   },
 *   ...
 * }
 */

/* Helper: load persisted escalation map */
async function loadMap() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('escalation.loadMap failed', err);
    return {};
  }
}

/* Helper: save persisted escalation map */
async function saveMap(map) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('escalation.saveMap failed', err);
  }
}

/* Helper: format a Date or ISO to a Date instance; returns null on invalid */
function toDate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return null;
  return dt;
}

/* Build notification content for escalation level */
function buildEscalationContent(reminder, level) {
  const title = reminder.title || 'Reminder';
  let body = reminder.description || '';
  // Friendly escalation messages per level
  if (level === 1) {
    body = body || 'Still due — please acknowledge.';
  } else if (level === 2) {
    body = body || 'Reminder still outstanding — please check.';
  } else if (level === 3) {
    body = body || 'Unacknowledged Tier-1 reminder — caregiver escalation initiated.';
  }
 
  // Base content
  const content = {
    title,
    body,
    data: {
      reminderId: reminder.id,
      _poco_escalation: {
        level,
        originalReminderTime: reminder.reminder_time,
      },
    },
  };
 
  // Attach tier hints (if any) to keep delivery consistent with Tier profiles
  const tier = NotificationTiers.resolveTierForCategory(reminder.category || reminder.tier || reminder.type || null);
  return NotificationTiers.attachTierToContent(content, tier);
}
 
/**
 * Persist caregiver link info (per reminder) locally.
 * - caregiver object shape is application-defined; typical fields:
 *   { id: '<caregiver-id>', name: 'Jane Doe', phone: '+123...', push_token: '...' }
 * - Stored under CG_STORAGE_KEY as a map { [reminderId]: caregiver }
 */
async function storeCaregiverLink(reminderId, caregiver) {
  if (!reminderId || !caregiver) return false;
  try {
    const raw = await AsyncStorage.getItem(CG_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[reminderId] = caregiver;
    await AsyncStorage.setItem(CG_STORAGE_KEY, JSON.stringify(map));
    return true;
  } catch (err) {
    console.warn('storeCaregiverLink failed', err);
    return false;
  }
}
 
async function getCaregiverLink(reminderId) {
  if (!reminderId) return null;
  try {
    const raw = await AsyncStorage.getItem(CG_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[reminderId] || null;
  } catch (err) {
    return null;
  }
}
 
/**
  * sendCaregiverEscalation(reminder, scheduledAtISO)
  *
  * API contract (server-side expectation):
  * - Insert a row into a 'caregiver_escalations' table (or call an RPC) with the payload:
  *     {
  *       reminder_id: <reminder.id>,
  *       caregiver_id: <optional caregiver id>,
  *       scheduled_at: <ISO timestamp when escalation should be delivered>,
  *       payload: <json: { title, body, reminder_time, extra }>,
  *       status: 'scheduled' // server will update to 'delivered' / 'failed'
  *     }
  *
  * - The server is responsible for delivering an external push/SMS/voice to the caregiver at scheduled_at.
  *
  * This client-side implementation attempts an INSERT into 'caregiver_escalations' as the canonical event.
  */
async function sendCaregiverEscalation(reminder, scheduledAtISO) {
  if (!reminder || !reminder.id || !scheduledAtISO) return null;
  try {
    // Try to attach any locally-stored caregiver link for this reminder (app settings may have provided it)
    const localCaregiver = await getCaregiverLink(reminder.id);
    const caregiverId = localCaregiver?.id || reminder.caregiver_id || null;
    const payload = {
      title: reminder.title || 'Medication not acknowledged',
      body:
        reminder.description ||
        `A Tier-1 reminder scheduled at ${reminder.reminder_time} was not acknowledged. Please check in.`,
      reminder_time: reminder.reminder_time,
      reminder_id: reminder.id,
    };
 
    // Insert escalation request - server should process this row and deliver external notification.
    const { data, error } = await supabase.from('caregiver_escalations').insert([
      {
        reminder_id: reminder.id,
        caregiver_id: caregiverId,
        scheduled_at: scheduledAtISO,
        payload,
        status: 'scheduled',
        created_at: new Date().toISOString(),
      },
    ]);
 
    if (error) {
      console.warn('sendCaregiverEscalation: supabase insert error', error);
      return null;
    }
 
    return data && data[0] ? data[0] : null;
  } catch (err) {
    console.warn('sendCaregiverEscalation failed', err);
    return null;
  }
}

/**
 * startEscalation(reminder)
 *
 * - If the reminder is not Tier-1 (using NotificationTiers.resolveTierForCategory), this is a no-op.
 * - Schedules escalation notifications at offsets: +15, +45, +60 minutes from reminder.reminder_time.
 * - Persists scheduled notification ids so they can be cancelled with stopEscalation.
 *
 * Returns an object with scheduled notification ids or null on failure.
 */
export async function startEscalation(reminder) {
  try {
    if (!reminder || !reminder.id || !reminder.reminder_time) {
      throw new Error('startEscalation: invalid reminder');
    }

    // Resolve tier profile - only proceed for Tier 1
    const tierProfile = NotificationTiers.resolveTierForCategory(reminder.category || reminder.tier || reminder.type || null);
    if (!tierProfile || tierProfile.id !== 'T1') {
      // Not Tier-1: nothing to do
      return null;
    }

    // Persist any caregiver info present on the reminder so UI can surface a "Call Caregiver" CTA when escalation is active.
    // This helps Story 8.3: ensure on-device UI can show caregiver action when escalation milestones are scheduled.
    try {
      if (reminder && reminder.caregiver && (reminder.caregiver.id || reminder.caregiver.phone)) {
        await storeCaregiverLink(reminder.id, reminder.caregiver);
      }
    } catch (e) {
      console.warn('startEscalation: storeCaregiverLink failed', e);
    }

    // Ensure notification permission (best-effort)
    try {
      if (typeof ReminderScheduler.ensurePermissions === 'function') {
        await ReminderScheduler.ensurePermissions();
      } else {
        await Notifications.getPermissionsAsync();
      }
    } catch (e) {
      // continue - scheduling may fail if no permission
      console.warn('startEscalation: permission check failed', e);
    }

    const base = toDate(reminder.reminder_time);
    if (!base) throw new Error('startEscalation: invalid reminder_time');

    // Offsets in minutes (levels 1..3)
    const offsets = [
      { minutes: 15, level: 1 },
      { minutes: 45, level: 2 },
      { minutes: 60, level: 3 },
    ];

    const map = await loadMap();
    // Cancel any existing escalations for this reminder first to avoid duplicates
    if (map[reminder.id] && Array.isArray(map[reminder.id].notifications)) {
      for (const n of map[reminder.id].notifications) {
        try {
          if (n && n.id) await Notifications.cancelScheduledNotificationAsync(n.id);
        } catch (e) {
          // ignore per-notification cancel errors
        }
      }
    }

    const scheduled = [];

    for (const o of offsets) {
      const scheduledAt = new Date(base.getTime() + o.minutes * 60 * 1000);
 
      // Skip scheduling if this milestone is in the past
      if (scheduledAt.getTime() <= Date.now()) {
        continue;
      }
 
      const content = buildEscalationContent(reminder, o.level);
      try {
        const nid = await Notifications.scheduleNotificationAsync({
          content,
          trigger: scheduledAt,
        });
        scheduled.push({ id: nid, level: o.level, scheduledAt: scheduledAt.toISOString() });
 
        // For the final escalation milestone (level 3 / +60), also register a server-side escalation event
        // so the backend can send an external push/SMS/voice to the caregiver at the scheduled time.
        if (o.level === 3) {
          try {
            // Register escalation event with server (server-driven push recommended).
            await sendCaregiverEscalation(reminder, scheduledAt.toISOString());
          } catch (e) {
            console.warn('startEscalation: sendCaregiverEscalation failed', e);
          }
        }
      } catch (err) {
        console.warn('startEscalation: scheduling escalation notification failed', err);
      }
    }

    if (scheduled.length > 0) {
      map[reminder.id] = { notifications: scheduled, createdAt: new Date().toISOString() };
      await saveMap(map);
    } else {
      // nothing scheduled but ensure mapping cleared
      if (map[reminder.id]) {
        delete map[reminder.id];
        await saveMap(map);
      }
    }

    return scheduled;
  } catch (err) {
    console.error('startEscalation error', err);
    return null;
  }
}

/**
 * stopEscalation(reminderId)
 *
 * - Cancels any scheduled escalation notifications for the given reminderId and clears persisted mapping.
 * - Returns true on success.
 */
export async function stopEscalation(reminderId) {
  try {
    if (!reminderId) return false;
    const map = await loadMap();
    const entry = map[reminderId];
    if (!entry || !Array.isArray(entry.notifications)) {
      return true;
    }
    for (const n of entry.notifications) {
      try {
        if (n && n.id) await Notifications.cancelScheduledNotificationAsync(n.id);
      } catch (e) {
        console.warn('stopEscalation: cancel failed for', n, e);
      }
    }
    delete map[reminderId];
    await saveMap(map);
    return true;
  } catch (err) {
    console.warn('stopEscalation error', err);
    return false;
  }
}

/* Utility: returns whether escalation is active for a reminder */
export async function isEscalationActive(reminderId) {
  try {
    const map = await loadMap();
    const entry = map[reminderId];
    return !!(entry && Array.isArray(entry.notifications) && entry.notifications.length);
  } catch (err) {
    return false;
  }
}

/* Utility: gets internal escalation map (for debugging) */
export async function getEscalationMap() {
  return loadMap();
}

const Escalation = {
  startEscalation,
  stopEscalation,
  isEscalationActive,
  getEscalationMap,
  // Caregiver helpers
  storeCaregiverLink,
  getCaregiverLink,
  sendCaregiverEscalation,
};
 
 
export default Escalation;