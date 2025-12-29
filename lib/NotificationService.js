import notifee, {
  AndroidImportance,
  RepeatFrequency,
  TriggerType
} from '@notifee/react-native';

/* ------------------ Permissions ------------------ */

export async function requestNotificationPermission() {
  // Request explicit iOS permissions including sound and critical alerts.
  // The `ios` object follows Notifee's requestPermission shape and ensures
  // the user is prompted for sound and critical-alert capability.
  const settings = await notifee.requestPermission({
    ios: {
      alert: true,
      sound: true,
      badge: true,
      criticalAlert: true,
    },
  });

  return settings.authorizationStatus >= 1;
}

/* ------------------ Android Channel ------------------ */

// async function ensureAndroidChannel() {
//   if (Platform.OS === 'android') {
//     return await notifee.createChannel({
//       id: 'reminders',
//       name: 'Reminders',
//       importance: AndroidImportance.HIGH,
//     });
//   }
//   return undefined;
// }

/* ------------------ Core Scheduler ------------------ */

export async function scheduleNotification({
  id,
  title,
  body,
  date,
  repeat = false,
  type,
}) {
  if (!date || isNaN(date.getTime())) return;

  // const channelId = await ensureAndroidChannel();

  const trigger = repeat
    ? {
        type: TriggerType.TIMESTAMP,
        timestamp: date.getTime(),
        repeatFrequency: RepeatFrequency.DAILY,
      }
    : {
        type: TriggerType.TIMESTAMP,
        timestamp: date.getTime(),
      };

  await notifee.createTriggerNotification(
    {
      id, // prevents duplicates
      title,
      // 🔊 Sound (iOS + Android)
      sound: 'default',
      body,
      ios: {
        // Ensure iOS plays a sound and (where available) treats this as a critical alert.
        // Note: Critical alerts require a special entitlement from Apple and the user
        // must grant the critical-alert permission. See instructions below.
        sound: 'default',
        critical: true,
        criticalVolume: 1.0,
        interruptionLevel: 'critical',
        foregroundPresentationOptions: {
          alert: true,
          sound: true,
          badge: true,
          // `banner` and `list` are supported on newer iOS versions; include for completeness
          banner: true,
          list: true,
        },
      },
      android: {
        // channelId,
        pressAction: { id: 'default' },
        importance: AndroidImportance.HIGH,
        // 📳 Gentle haptic
        vibrationPattern: [0, 50],
      },
      data: { type },
    },
    trigger
  );
}

/* ------------------ Cancel ------------------ */

export async function cancelNotification(id) {
  await notifee.cancelNotification(id);
}
