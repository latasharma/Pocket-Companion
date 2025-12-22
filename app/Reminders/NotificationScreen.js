import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Accessibility, hitSlopFor } from '../../constants/Accessibility';
import Escalation from '../../lib/escalation';
import MedicationService from '../../lib/medicationService';
import ReminderScheduler from '../../lib/reminderScheduler';
import * as SupabaseLib from '../../lib/supabase';

const supabase = SupabaseLib.supabase || SupabaseLib.default || SupabaseLib;

/**
 * NotificationScreen
 * File: [`app/Reminders/NotificationScreen.js`](app/Reminders/NotificationScreen.js:1)
 *
 * Implements "The Active Experience" per docs: a full-screen dialog-like alert
 * with spacing from edges, close button, gentle chime, visual instructions and
 * three actions: I did it / Remind in 15 mins / Skip.
 */
export default function NotificationScreen({ route, navigation }) {
  const reminderId = route?.params?.reminderId;
  const [reminder, setReminder] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    fetchReminder(reminderId);
    // attempt gentle wake chime when screen opens
    playChime();
    // speak title for accessibility
    if (reminderId) setTimeout(() => speakReminderIfNeeded(), 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminderId]);

  async function fetchReminder(id) {
    if (!id) return;
    try {
      const { data, error } = await supabase.from('reminders').select('*').eq('id', id).single();
      if (error) throw error;
      setReminder(data);
    } catch (err) {
      console.warn('NotificationScreen: failed to load reminder', err);
    }
  }

  async function playChime() {
    try {
      const soundObject = new Audio.Sound();
      // remote gentle chime (best-effort). If network/bundled asset not available this will fail silently.
      await soundObject.loadAsync({ uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' }, { shouldPlay: true });
      // Unload after a short delay
      setTimeout(() => {
        soundObject.unloadAsync().catch(() => {});
      }, 2000);
    } catch (e) {
      // if sound fails, fallback to TTS or haptics
      try {
        Speech.speak(reminder?.title || 'Reminder');
      } catch (err) {
        // ignore
      }
    }
  }

  function speakReminderIfNeeded() {
    if (!reminder) return;
    try {
      Speech.speak(`${reminder.title || 'Reminder'}. ${reminder.description || ''}`);
    } catch (e) {
      // ignore
    }
  }

  async function markDone() {
    if (!reminder) return;
    setLoadingAction(true);
    const now = new Date().toISOString();
    try {
      try {
        await MedicationService.createIntakeLog({
          medicationId: reminder.id,
          scheduledTime: reminder.reminder_time,
          takenTime: now,
          doseStatus: 'taken',
        });
      } catch (e) {
        console.warn('markDone: intake log creation failed', e);
      }

      try {
        await ReminderScheduler.cancelScheduledReminder(reminder.id);
      } catch (e) {
        console.warn('markDone: cancelScheduledReminder failed', e);
      }

      try {
        await Escalation.stopEscalation(reminder.id);
      } catch (e) {
        console.warn('markDone: stopEscalation failed', e);
      }

      try {
        const { data, error } = await supabase
          .from('reminders')
          .update({ status: 'taken', completed_at: now, updated_at: now })
          .eq('id', reminder.id)
          .select()
          .single();
        if (error) throw error;
        setReminder(data);
      } catch (e) {
        console.warn('markDone: update failed', e);
      }

      Alert.alert('Marked done', 'Great — marked as done.');
      navigation?.goBack?.();
    } catch (err) {
      console.error('markDone unexpected', err);
      Alert.alert('Error', 'Could not mark as done.');
    } finally {
      setLoadingAction(false);
    }
  }

  async function remindIn15() {
    if (!reminder) return;
    setLoadingAction(true);
    try {
      // Use the centralized snooze flow which updates the DB, records snooze patterns and reschedules
      try {
        const updated = await ReminderScheduler.snoozeReminder(reminder.id, 15);
        if (updated) {
          Alert.alert('Will remind', 'I will remind you in 15 minutes.');
        } else {
          Alert.alert('Error', 'Could not schedule follow-up.');
        }
      } catch (e) {
        console.warn('remindIn15: snooze flow failed', e);
        Alert.alert('Error', 'Could not schedule follow-up.');
      }

      navigation?.goBack?.();
    } catch (err) {
      console.error('remindIn15 failed', err);
      Alert.alert('Error', 'Could not schedule follow-up.');
    } finally {
      setLoadingAction(false);
    }
  }

  async function skipThis() {
    if (!reminder) return;
    Alert.alert('Skip', 'Skip this reminder?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Skip',
        style: 'destructive',
        onPress: async () => {
          setLoadingAction(true);
          const now = new Date().toISOString();
          try {
            try {
              await ReminderScheduler.cancelScheduledReminder(reminder.id);
            } catch (e) {
              console.warn('skipThis: cancel failed', e);
            }

            try {
              await Escalation.stopEscalation(reminder.id);
            } catch (e) {
              console.warn('skipThis: stopEscalation failed', e);
            }

            try {
              const { data, error } = await supabase
                .from('reminders')
                .update({ status: 'skipped', skipped_at: now, updated_at: now })
                .eq('id', reminder.id)
                .select()
                .single();
              if (error) throw error;
              setReminder(data);
            } catch (e) {
              console.warn('skipThis: update failed', e);
            }

            Alert.alert('Skipped', 'Marked as skipped.');
            navigation?.goBack?.();
          } catch (err) {
            console.error('skipThis failed', err);
            Alert.alert('Error', 'Could not skip reminder.');
          } finally {
            setLoadingAction(false);
          }
        },
      },
    ]);
  }

  const showFoodIcon = reminder && reminder.metadata && (reminder.metadata.includes?.('with food') || reminder.metadata.food === true || (reminder.metadata && reminder.metadata.medication_food));
  const showWaterIcon = reminder && reminder.metadata && (reminder.metadata.includes?.('with water') || reminder.metadata.needs_water === true);

  if (!reminder) {
    const placeholder = {
      title: 'Take your medication',
      description: 'This is a preview of the reminder alert. No data is loaded.',
      metadata: { medication_food: true, needs_water: true },
      attachment_url: null,
    };

    return (
      <View style={styles.container}>
        <View style={styles.dialog}>
          <TouchableOpacity style={styles.close} onPress={() => router.back()} hitSlop={hitSlopFor()} accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={Accessibility.DARK_TEXT} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Attention</Text>

          <View style={styles.content}>
            <Text style={styles.largeTitle}>{placeholder.title}</Text>
            <Text style={styles.instruction}>{placeholder.description}</Text>

            <View style={styles.hintsRow}>
              <View style={styles.hint}>
                <Ionicons name="restaurant" size={26} color="#374151" />
                <Text style={styles.hintText}>With food</Text>
              </View>

              <View style={styles.hint}>
                <Ionicons name="water" size={26} color="#374151" />
                <Text style={styles.hintText}>With water</Text>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionButton, styles.primary]} onPress={() => {}} accessibilityLabel="I did it" hitSlop={hitSlopFor()}>
              <Text style={styles.actionText}>I did it</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.secondary]} onPress={() => {}} accessibilityLabel="Remind me in 15 mins" hitSlop={hitSlopFor()}>
              <Text style={styles.actionText}>Remind me in 15 mins</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.tertiary]} onPress={() => {}} accessibilityLabel="Skip this" hitSlop={hitSlopFor()}>
              <Text style={styles.actionText}>Skip this</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{Platform.OS === 'ios' ? 'Press Home to close' : 'Use Back to close'}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.dialog}>
        <TouchableOpacity style={styles.close} onPress={() => navigation?.goBack?.()} hitSlop={hitSlopFor()} accessibilityLabel="Close">
          <Ionicons name="close" size={22} color={Accessibility.DARK_TEXT} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Attention</Text>

        {reminder.attachment_url ? (
          <View style={styles.imageWrap}>
            <Image source={{ uri: reminder.attachment_url }} style={styles.attachment} resizeMode="cover" />
          </View>
        ) : null}

        <View style={styles.content}>
          <Text style={styles.largeTitle}>{reminder.title || 'Reminder'}</Text>
          <Text style={styles.instruction}>{reminder.description || ''}</Text>

          <View style={styles.hintsRow}>
            {showFoodIcon ? (
              <View style={styles.hint}>
                <Ionicons name="restaurant" size={26} color="#374151" />
                <Text style={styles.hintText}>With food</Text>
              </View>
            ) : null}

            {showWaterIcon ? (
              <View style={styles.hint}>
                <Ionicons name="water" size={26} color="#374151" />
                <Text style={styles.hintText}>With water</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primary]}
            onPress={markDone}
            disabled={loadingAction}
            accessibilityLabel="I did it"
            hitSlop={hitSlopFor()}
          >
            <Text style={styles.actionText}>I did it</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondary]}
            onPress={remindIn15}
            disabled={loadingAction}
            accessibilityLabel="Remind me in 15 mins"
            hitSlop={hitSlopFor()}
          >
            <Text style={styles.actionText}>Remind me in 15 mins</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.tertiary]}
            onPress={skipThis}
            disabled={loadingAction}
            accessibilityLabel="Skip this"
            hitSlop={hitSlopFor()}
          >
            <Text style={styles.actionText}>Skip this</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{Platform.OS === 'ios' ? 'Press Home to close' : 'Use Back to close'}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Accessibility.OFF_WHITE_BACKGROUND, justifyContent: 'center', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  dialog: {
    width: '92%',
    maxWidth: 760,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    paddingTop: 34,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  close: { position: 'absolute', right: 14, top: 12, padding: 6 },
  headerTitle: { position: 'absolute', left: 20, top: 12, fontSize: 16, fontWeight: '700', color: Accessibility.DARK_TEXT },
  imageWrap: { alignItems: 'center', marginTop: 6 },
  attachment: { width: 220, height: 220, borderRadius: 12, backgroundColor: '#f3f4f6' },
  content: { marginTop: 12 },
  largeTitle: { fontSize: 26, fontWeight: '800', color: Accessibility.DARK_TEXT, marginTop: 6 },
  instruction: { fontSize: 16, color: '#374151', marginTop: 8 },
  hintsRow: { flexDirection: 'row', marginTop: 12, gap: 14 },
  hint: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  hintText: { marginLeft: 8, color: '#374151' },
  actions: { marginTop: 18, gap: 12 },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    minWidth: Accessibility.BUTTON_MIN_SIZE,
  },
  primary: { backgroundColor: '#10b981' },
  secondary: { backgroundColor: '#f59e0b' },
  tertiary: { backgroundColor: '#9ca3af' },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { alignItems: 'center', paddingTop: 6 },
  footerText: { color: '#9ca3af', fontSize: 12 },
});
