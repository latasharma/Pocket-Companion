import notifee, {
  AndroidImportance,
  EventType,
  TriggerType
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { computeNextOccurrence } from './dateUtils';

/* ============ INITIALIZATION & SETUP ============ */

/**
 * Initialize Notifee and set up handlers
 * Must be called once when app starts (in root layout or App.js)
 */
export async function initializeNotificationService() {
  try {
    console.log('🔔 Initializing notification service...');

    // Request permissions
    await requestNotificationPermission();

    // Set notification handler for foreground notifications
    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('👆 Notification pressed (foreground):', detail.notification.body);
        handleNotificationPress(detail.notification);
      } else if (type === EventType.DELIVERED) {
        // Notification delivered while app is in foreground - schedule next occurrence if needed
        console.log('📩 Notification delivered (foreground):', detail.notification.body);
        try {
          handleNotificationDelivered(detail.notification);
        } catch (err) {
          console.error('Error handling delivered notification (foreground):', err);
        }
      }
    });

    // Set notification handler for when app is opened from notification or background events
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('👆 Notification pressed (background/closed):', detail.notification.body);
        handleNotificationPress(detail.notification);
      } else if (type === EventType.DELIVERED) {
        // Best-effort: try to schedule next occurrence when a notification is delivered while app in background
        console.log('📩 Notification delivered (background):', detail.notification?.body);
        try {
          // handleNotificationDelivered may perform async scheduling; run but don't block
          handleNotificationDelivered(detail.notification).catch((err) => {
            console.error('Error handling delivered notification (background):', err);
          });
        } catch (err) {
          console.error('Error handling delivered notification (background):', err);
        }
      }
    });

    // Create Android channels (required for Android 8+)
    if (notifee.android) {
      await createReminderChannel();
    }

    console.log('✅ Notification service initialized');
  } catch (error) {
    console.error('Error initializing notification service:', error);
  }
}

// Create a dedicated channel for elderly-friendly reminders with a custom sound
async function createReminderChannel() {
  try {
    await notifee.createChannel({
      id: 'elderly-reminders',
      name: 'Reminder Alerts',
      importance: AndroidImportance.HIGH,
      sound: 'reminder_chime',
      vibration: true,
      lights: true,
    });
    console.log('✅ Reminder channel created (elderly-reminders)');
  } catch (error) {
    console.error('Error creating reminder channel:', error);
  }
}
/* ============ PERMISSIONS ============ */

export async function requestNotificationPermission() {
  try {
    const settings = await notifee.requestPermission({
      // iOS specific permissions
      ios: {
        alert: true,
        sound: true,
        badge: true,
        criticalAlert: true,
        provisional: false,
      },
      // Android specific permissions
      android: {
        alert: true,
        sound: true,
      },
    });

    const authorized =
      settings.authorizationStatus >= 1;

    if (authorized) {
      console.log('✅ Notification permissions granted');
    } else {
      console.log('❌ Notification permissions denied');
    }

    return authorized;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/* ============ CORE SCHEDULER ============ */

/**
 * Schedule a notification to fire at a specific time
 * Works in ALL scenarios: foreground, background, and closed app
 */
export async function scheduleNotification({
  id,
  title,
  body,
  date,
  type,
  data = {},
}) {
  try {
    // Validate inputs
    if (!id || !title || !body || !date) {
      console.error('Missing required notification fields');
      return null;
    }

    if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.error('Invalid date provided:', date);
      return null;
    }

    const now = new Date();

    // Only schedule if date is in the future
    if (date <= now) {
      console.warn(`⏭️  Notification date is in the past: ${date.toISOString()}`);
      return null;
    }

    // Calculate milliseconds until notification should fire
    const delayMs = date.getTime() - now.getTime();

    console.log(
      `📅 Scheduling notification: "${title}"`
    );
    console.log(`   ID: ${id}`);
    console.log(`   Fires in: ${Math.round(delayMs / 1000)} seconds`);
    console.log(`   Fire time: ${date.toISOString()}`);

    // Create trigger object
    const trigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: date.getTime(),
    };

    // Create notification object
    const notificationBody = {
      id, // Use custom ID to prevent duplicates
      title,
      body,
      // Use custom sound for important_date reminders when provided
      sound: type === 'reminder_chime',
      ios: {
        sound: type === 'reminder_chime.wav',
        critical: true,
        criticalVolume: 1.0,
        interruptionLevel: 'critical',
        foregroundPresentationOptions: {
          alert: true,
          sound: true,
          badge: true,
          banner: true,
          list: true,
        },
      },
      android: {
        channelId: type === 'elderly-reminders',
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
        importance: AndroidImportance.HIGH,
        vibrationPattern: [0, 50, 100, 50],
        lights: [0xFFFFFFFF, 1000, 1000],
        sound: type === 'reminder_chime',
      },
      data: {
        type,
        ...data,
        scheduledTime: date.toISOString(),
      },
    };

    // Schedule the notification
    const notificationId = await notifee.createTriggerNotification(
      notificationBody,
      trigger
    );

    // Store notification metadata for tracking
    await storeNotificationMetadata(id, {
      notificationId,
      title,
      body,
      scheduledTime: date.toISOString(),
      createdAt: now.toISOString(),
    });

    console.log(`✅ Notification scheduled with ID: ${id}`);
    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

/**
 * Store notification metadata in AsyncStorage for tracking
 */
async function storeNotificationMetadata(customId, metadata) {
  try {
    const stored = await AsyncStorage.getItem('scheduled_notifications');
    const notifications = stored ? JSON.parse(stored) : {};
    notifications[customId] = metadata;
    await AsyncStorage.setItem(
      'scheduled_notifications',
      JSON.stringify(notifications)
    );
  } catch (error) {
    console.error('Error storing notification metadata:', error);
  }
}

/* ============ NOTIFICATION MANAGEMENT ============ */

/**
 * Cancel a specific scheduled notification
 */
export async function cancelScheduledNotification(customId) {
  try {
    await notifee.cancelNotification(customId);
    
    // Remove from tracking
    const stored = await AsyncStorage.getItem('scheduled_notifications');
    if (stored) {
      const notifications = JSON.parse(stored);
      delete notifications[customId];
      await AsyncStorage.setItem(
        'scheduled_notifications',
        JSON.stringify(notifications)
      );
    }

    console.log(`✅ Cancelled notification: ${customId}`);
  } catch (error) {
    console.error('Error cancelling notification:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications() {
  try {
    const allNotifications = await notifee.getTriggerNotifications();
    
    for (const notification of allNotifications) {
      await notifee.cancelNotification(notification.notification.id);
    }

    await AsyncStorage.removeItem('scheduled_notifications');
    console.log('✅ All notifications cancelled');
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
}

/**
 * Get all scheduled notifications
 */
export async function getAllScheduledNotifications() {
  try {
    const notifications = await notifee.getTriggerNotifications();
    console.log(`📋 Total scheduled notifications: ${notifications.length}`);
    return notifications;
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Get stored notification metadata
 */
export async function getNotificationMetadata() {
  try {
    const stored = await AsyncStorage.getItem('scheduled_notifications');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error getting notification metadata:', error);
    return {};
  }
}

/* ============ NOTIFICATION HANDLERS ============ */

/**
 * Handle notification press (works in all scenarios)
 * This is called when user taps on a notification
 */
function handleNotificationPress(notification) {
  const data = notification.data;
  
  console.log('📬 Notification handler triggered');
  console.log('Data:', data);

  // You can add custom logic here based on notification type
  if (data?.type === 'important_date') {
    console.log(`Important date notification: ${data.dateTitle}`);
    // Navigate to Important Dates screen or handle appropriately
    // This could be done through navigation context
  }
}

/**
 * Handle a delivered notification (fires when notification is shown/delivered).
 * For repeating important dates we schedule the next occurrence only (per docs 6.8):
 *  - Non-repeating -> no-op (existing logic)
 *  - Repeating -> schedule next occurrence only
 *  - After notification fires -> schedule next
 *  - App foreground -> re-evaluate by refetching important dates
 */
async function handleNotificationDelivered(notification) {
  try {
    const data = notification?.data || {};
    if (!data) return;

    // Only handle important_date type
    if (data.type !== 'important_date') return;

    const repeat = data.repeatType || data.repeat_type || 'none';
    if (!repeat || repeat === 'none') {
      console.log('No repeat for this notification — skipping next-schedule');
      return;
    }

    // Offsets used when scheduling
    const offsets = {
      '1_week': 7 * 24 * 60 * 60 * 1000,
      '24_hours': 24 * 60 * 60 * 1000,
      '5_minutes': 5 * 60 * 1000,
    };

    const messages = {
      '1_week': 'In 1 week',
      '24_hours': 'Tomorrow',
      '5_minutes': 'In 5 minutes',
    };

    const reminderKey = data.reminderType || data.reminder_type;
    const dateId = data.dateId || data.date_id;
    const dateTitle = data.dateTitle || data.date_title || 'Important Date';

    // Compute base event date for the fired notification. Prefer scheduledTime + offset
    let baseEventDate = null;

    if (data.scheduledTime && reminderKey && offsets[reminderKey]) {
      const scheduled = new Date(data.scheduledTime);
      if (!isNaN(scheduled.getTime())) {
        baseEventDate = new Date(scheduled.getTime() + offsets[reminderKey]);
      }
    }

    // Fallback: parse originalDate (MM/DD/YYYY) and set default hour to 20:00
    if (!baseEventDate && data.originalDate) {
      let parsed = new Date(data.originalDate);
      if (isNaN(parsed.getTime())) {
        const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(data.originalDate));
        if (m) parsed = new Date(parseInt(m[3], 10), parseInt(m[1], 10) - 1, parseInt(m[2], 10));
      }
      if (!isNaN(parsed.getTime())) {
        parsed.setHours(20, 0, 0, 0);
        baseEventDate = parsed;
      }
    }

    if (!baseEventDate) {
      console.warn('Unable to determine base event date for delivered notification — skipping');
      return;
    }

    // Compute next occurrence according to rules (advance until in future)
    let nextEvent = computeNextOccurrence(baseEventDate, repeat);
    const now = new Date();
    if (nextEvent <= now) {
      // Advance until in future (safety loop)
      let safety = 0;
      while (nextEvent <= now && safety < 1000) {
        const tmp = computeNextOccurrence(nextEvent, repeat);
        // replace the reference with the advanced date
        nextEvent = tmp;
        safety += 1;
      }
    }
    // Schedule notifications for next occurrence according to reminderKey
    const scheduleForReminder = (remKey) => {
      const offsetMs = offsets[remKey];
      if (!offsetMs) return;
      const triggerDate = new Date(nextEvent.getTime() - offsetMs);
      if (triggerDate <= new Date()) {
        console.log('Next trigger is in the past; skipping scheduling for', remKey);
        return;
      }

      const notificationId = `important-date-${dateId}-${remKey}`;
      scheduleNotification({
        id: notificationId,
        title: 'Important Date Reminder',
        body: `${messages[remKey]}: ${dateTitle}`,
        date: triggerDate,
        type: 'important_date',
        data: {
          dateId,
          dateTitle,
          originalDate: data.originalDate || null,
          reminderType: remKey,
          repeatType: repeat,
        },
      });
    };

    if (reminderKey === 'all') {
      scheduleForReminder('1_week');
      scheduleForReminder('24_hours');
      scheduleForReminder('5_minutes');
    } else if (reminderKey) {
      scheduleForReminder(reminderKey);
    }

    console.log('Scheduled next occurrence for repeating important date', dateId);
  } catch (err) {
    console.error('Error in handleNotificationDelivered:', err);
  }
}

/**
 * Check if there's a notification that opened the app
 * (useful when app is completely closed)
 */
export async function getInitialNotification() {
  try {
    const notification = await notifee.getInitialNotification();
    
    if (notification) {
      console.log('📱 App opened from notification:', notification.notification.body);
      return notification;
    }

    return null;
  } catch (error) {
    console.error('Error getting initial notification:', error);
    return null;
  }
}

/* ============ DEBUGGING ============ */

/**
 * Display all notification information (for debugging)
 */
export async function displayNotificationInfo() {
  try {
    const scheduled = await notifee.getTriggerNotifications();
    const metadata = await getNotificationMetadata();

    console.log('\n========== NOTIFICATION INFO ==========');
    console.log(`Scheduled notifications: ${scheduled.length}`);
    
    scheduled.forEach((notification, index) => {
      console.log(`\n[${index + 1}] ${notification.notification.title}`);
      console.log(`   ID: ${notification.notification.id}`);
      console.log(`   Trigger: ${notification.trigger?.timestamp}`);
    });

    console.log('\n========== METADATA ==========');
    console.log(JSON.stringify(metadata, null, 2));
    console.log('====================================\n');
  } catch (error) {
    console.error('Error displaying notification info:', error);
  }
}