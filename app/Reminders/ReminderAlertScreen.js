import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Accessibility, hitSlopFor } from '../../constants/Accessibility';
import Escalation from '../../lib/escalation';
import MedicationService from '../../lib/medicationService';
import ReminderScheduler from '../../lib/reminderScheduler';
import * as SupabaseLib from '../../lib/supabase';

const supabase = SupabaseLib.supabase || SupabaseLib.default || SupabaseLib;

/**
 * ReminderAlertScreen
 * File: [`app/Reminders/ReminderAlertScreen.js`](app/Reminders/ReminderAlertScreen.js:1)
 *
 * Full-screen landing screen for reminders opened from notifications.
 * - Renders large visuals (title, description, optional attachment)
 * - Shows instruction icons (food / water) when metadata hints are present
 * - Provides three primary actions exactly as specified in E5:
 *    - "I did it"          -> mark complete + log timestamp
 *    - "Remind me in 15 mins" -> schedule follow-up at +15 minutes
 *    - "Skip this"         -> mark skipped
 *
 * Acceptance target (Story 5.1):
 * - Notification opens a full-screen command UI (this screen is the UI).
 *
 * Note: The notification-to-screen deep link / navigation should provide `reminderId`
 * via route params. This screen is defensive if the id is missing.
 */

export default function ReminderAlertScreen({ route, navigation }) {
  const reminderId = route?.params?.reminderId;
  const [reminder, setReminder] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [caregiver, setCaregiver] = useState(null);
  const [escalationActive, setEscalationActive] = useState(false);

  async function fetchReminder(id) {
    if (!id) return;
    try {
      const { data, error } = await supabase.from('reminders').select('*').eq('id', id).single();
      if (error) throw error;
      setReminder(data);
    } catch (err) {
      console.warn('ReminderAlertScreen: failed to load reminder', err);
    }
  }

  async function checkEscalationState(id) {
    if (!id) return;
    try {
      const active = await Escalation.isEscalationActive(id);
      setEscalationActive(!!active);
      const cg = await Escalation.getCaregiverLink(id);
      setCaregiver(cg);
    } catch (e) {
      console.warn('checkEscalationState failed', e);
    }
  }

  useEffect(() => {
    fetchReminder(reminderId);
    checkEscalationState(reminderId);
    const iv = setInterval(() => checkEscalationState(reminderId), 10000);
    return () => clearInterval(iv);
  }, [reminderId]);

async function markDone() {
  if (!reminder) return;
  setLoadingAction(true);
  const now = new Date().toISOString();
 
  try {
    // Create an intake log when relevant (medication) - best effort
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
 
    // Cancel any scheduled notification for this reminder
    try {
      await ReminderScheduler.cancelScheduledReminder(reminder.id);
    } catch (e) {
      console.warn('markDone: cancelScheduledReminder failed', e);
    }

    // Stop any escalation chain for this reminder (best-effort)
    try {
      await Escalation.stopEscalation(reminder.id);
    } catch (e) {
      console.warn('markDone: stopEscalation failed', e);
    }
 
    // Update DB state to 'taken' and record completion timestamp
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
      // If the column doesn't exist or update fails, log and continue (best-effort)
      console.warn('markDone: update failed', e);
    }
 
    // Provide immediate feedback and close the alert
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
    // Schedule a one-off follow-up notification 15 minutes from now without mutating the original reminder record.
    const overrideDate = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    try {
      await ReminderScheduler.scheduleReminder({ ...reminder, reminder_time: overrideDate }, { overrideDate });
      Alert.alert('Will remind', 'I will remind you in 15 minutes.');
    } catch (e) {
      console.warn('remindIn15: scheduling follow-up failed', e);
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
          // Cancel scheduled notification
          try {
            await ReminderScheduler.cancelScheduledReminder(reminder.id);
          } catch (e) {
            console.warn('skipThis: cancel failed', e);
          }

          // Stop any escalation chain for this reminder (best-effort)
          try {
            await Escalation.stopEscalation(reminder.id);
          } catch (e) {
            console.warn('skipThis: stopEscalation failed', e);
          }
 
          // Update DB state to 'skipped' and record skipped timestamp (best-effort)
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

  // Call caregiver action (shown when escalation is active and caregiver info exists)
  async function callCaregiver() {
    if (!caregiver || !caregiver.phone) {
      Alert.alert('No caregiver', 'No caregiver phone number available.');
      return;
    }
    // Best-effort: stop escalation chain when user chooses to call
    try {
      if (reminder && reminder.id) {
        await Escalation.stopEscalation(reminder.id);
        setEscalationActive(false);
      }
    } catch (e) {
      console.warn('callCaregiver: stopEscalation failed', e);
    }

    const tel = `tel:${caregiver.phone}`;
    try {
      await Linking.openURL(tel);
    } catch (e) {
      console.warn('callCaregiver: openURL failed', e);
      Alert.alert('Call failed', 'Could not initiate call from this device.');
    }
  }

  // Visual helpers: check metadata for food/water hints (simple heuristic)
  const showFoodIcon = reminder && reminder.metadata && (reminder.metadata.includes?.('with food') || reminder.metadata.food === true || (reminder.metadata && reminder.metadata.medication_food));
  const showWaterIcon = reminder && reminder.metadata && (reminder.metadata.includes?.('with water') || reminder.metadata.needs_water === true);

  if (!reminder) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.title}>Loading reminder…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{reminder.title || 'Reminder'}</Text>
        <Text style={styles.time}>{new Date(reminder.reminder_time).toLocaleString()}</Text>
      </View>

      {reminder.attachment_url ? (
        <View style={styles.imageWrap}>
          <Image source={{ uri: reminder.attachment_url }} style={styles.attachment} resizeMode="cover" />
        </View>
      ) : null}

      <View style={styles.descWrap}>
        <Text style={styles.description}>{reminder.description || ''}</Text>

        <View style={styles.hintsRow}>
          {showFoodIcon ? (
            <View style={styles.hint}>
              <Ionicons name="restaurant" size={28} color="#374151" />
              <Text style={styles.hintText}>With food</Text>
            </View>
          ) : null}

          {showWaterIcon ? (
            <View style={styles.hint}>
              <Ionicons name="water" size={28} color="#374151" />
              <Text style={styles.hintText}>Take with water</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.actions}>
        {/* Prominent caregiver CTA when escalation is active */}
        {escalationActive && caregiver ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.callButton]}
            onPress={callCaregiver}
            disabled={loadingAction}
            accessibilityLabel={`Call Caregiver ${caregiver.name || ''}`}
            hitSlop={hitSlopFor()}
          >
            <Text style={styles.actionText}>
              {`Call Caregiver${caregiver.name ? ' ' + caregiver.name : ''}`}
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#10b981' }]}
          onPress={markDone}
          disabled={loadingAction}
          accessibilityLabel="I did it"
          hitSlop={hitSlopFor()}
        >
          <Text style={styles.actionText}>I did it</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#f59e0b' }]}
          onPress={remindIn15}
          disabled={loadingAction}
          accessibilityLabel="Remind me in 15 mins"
          hitSlop={hitSlopFor()}
        >
          <Text style={styles.actionText}>Remind me in 15 mins</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
          onPress={skipThis}
          disabled={loadingAction}
          accessibilityLabel="Skip this"
          hitSlop={hitSlopFor()}
        >
          <Text style={styles.actionText}>Skip this</Text>
        </TouchableOpacity>
      </View>

      {/* Small footer: platform note */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {Platform.OS === 'ios' ? 'Press Home to close' : 'Use Back to close'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: Accessibility.OFF_WHITE_BACKGROUND, justifyContent: 'space-between' },
  center: { alignItems: 'center', justifyContent: 'center' },
  headerRow: { marginTop: 12 },
  title: { fontSize: 28, fontWeight: '800', color: Accessibility.DARK_TEXT },
  time: { fontSize: 13, color: '#6b7280', marginTop: 6 },
  imageWrap: { alignItems: 'center', marginTop: 18 },
  attachment: { width: 220, height: 220, borderRadius: 12, backgroundColor: '#f3f4f6' },
  descWrap: { marginTop: 18, flex: 1 },
  description: { fontSize: 16, color: '#374151', lineHeight: 22 },
  hintsRow: { flexDirection: 'row', marginTop: 12, gap: 18 },
  hint: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  hintText: { marginLeft: 8, color: '#374151' },
  actions: { marginBottom: 24, gap: 12 },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minWidth: Accessibility.BUTTON_MIN_SIZE,
    minHeight: Accessibility.BUTTON_MIN_SIZE,
  },
  // CTA style for "Call Caregiver" - visually prominent and accessible
  callButton: {
    backgroundColor: '#b91c1c',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minWidth: Accessibility.BUTTON_MIN_SIZE,
    minHeight: Accessibility.BUTTON_MIN_SIZE,
  },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { alignItems: 'center', paddingBottom: 6 },
  footerText: { color: '#9ca3af', fontSize: 12 },
});