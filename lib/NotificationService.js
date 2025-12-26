import notifee, {
  AndroidImportance,
  RepeatFrequency,
  TriggerType
} from '@notifee/react-native';

/* ------------------ Permissions ------------------ */

export async function requestNotificationPermission() {
  const settings = await notifee.requestPermission();
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

//   const channelId = await ensureAndroidChannel();

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
        foregroundPresentationOptions:{
          alert: true,
          sound: true
        }
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
