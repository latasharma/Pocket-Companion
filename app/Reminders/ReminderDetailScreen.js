import { useEffect, useState } from 'react';
import { Alert, Button, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MedicationService from '../../lib/medicationService';
import ReminderScheduler from '../../lib/reminderScheduler';
import * as SupabaseLib from '../../lib/supabase';
const supabase = SupabaseLib.supabase || SupabaseLib.default || SupabaseLib;

/**
 * ReminderDetailScreen
 * File: [`app/Reminders/ReminderDetailScreen.js`](app/Reminders/ReminderDetailScreen.js:1)
 *
 * Standalone detail screen for viewing, editing, deleting and snoozing a reminder.
 */

const ReminderService = {
  async fetchOne(id) {
    try {
      const { data, error } = await supabase.from('reminders').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('fetchOne reminder error', err);
      throw err;
    }
  },

  async update(id, patch) {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('update reminder error', err);
      throw err;
    }
  },

  async softDelete(id) {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('soft delete reminder error', err);
      throw err;
    }
  },
};

/* Placeholder: schedule local notification (integrate with lib/reminderScheduler later) */
async function scheduleLocalNotification(reminder) {
  console.log('TODO schedule local notification for', reminder?.id);
}

export default function ReminderDetailScreen({ route, navigation }) {
  const reminderId = route?.params?.reminderId;
  const [reminder, setReminder] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!reminderId) return;
    setLoading(true);
    try {
      const data = await ReminderService.fetchOne(reminderId);
      setReminder(data);
    } catch (err) {
      console.error('load reminder', err);
      Alert.alert('Error', 'Could not load reminder.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [reminderId]);

  async function onDelete() {
    Alert.alert('Delete', 'Delete this reminder? It can be undone within 7 days.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await ReminderService.softDelete(reminderId);
            // TODO: cancel scheduled notifications for this reminder
            navigation?.navigate?.('RemindersList');
          } catch (err) {
            Alert.alert('Error', 'Could not delete reminder.');
          }
        },
      },
    ]);
  }

  async function onSnooze(minutes) {
    try {
      const newTime = new Date(new Date(reminder.reminder_time).getTime() + minutes * 60000).toISOString();
      const updated = await ReminderService.update(reminderId, { reminder_time: newTime, status: 'snoozed' });
      setReminder(updated);
      await scheduleLocalNotification(updated);
      Alert.alert('Snoozed', `Reminder snoozed for ${minutes} minutes`);
    } catch (err) {
      Alert.alert('Error', 'Could not snooze reminder.');
    }
  }

  if (!reminder) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  async function markTaken() {
    try {
      // create intake log with taken_time = now and status 'taken'
      const now = new Date().toISOString();
      await MedicationService.createIntakeLog({
        medicationId: reminder.id,
        scheduledTime: reminder.reminder_time,
        takenTime: now,
        doseStatus: 'taken',
      });
      // cancel any scheduled notification and update status locally
      await ReminderScheduler.cancelScheduledReminder(reminder.id);
      const updated = await ReminderService.update(reminderId, { status: 'taken' });
      setReminder(updated);
      Alert.alert('Taken', 'Marked as taken');
    } catch (err) {
      console.error('markTaken failed', err);
      Alert.alert('Error', 'Could not mark as taken');
    }
  }

  async function markMissed() {
    try {
      const now = new Date().toISOString();
      await MedicationService.createIntakeLog({
        medicationId: reminder.id,
        scheduledTime: reminder.reminder_time,
        takenTime: null,
        doseStatus: 'missed',
      });
      await ReminderScheduler.cancelScheduledReminder(reminder.id);
      const updated = await ReminderService.update(reminderId, { status: 'missed' });
      setReminder(updated);
      Alert.alert('Marked missed', 'Marked as missed');
    } catch (err) {
      console.error('markMissed failed', err);
      Alert.alert('Error', 'Could not mark missed');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{reminder.title}</Text>
      <Text style={styles.time}>{new Date(reminder.reminder_time).toLocaleString()}</Text>
      <Text style={{ marginVertical: 12 }}>{reminder.description}</Text>

      {reminder.attachment_url ? (
        <Image source={{ uri: reminder.attachment_url }} style={{ width: 120, height: 120, marginBottom: 12 }} />
      ) : null}

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 }}>
        <Button title="Edit" onPress={() => navigation?.navigate?.('ReminderForm', { reminderId })} />
        <Button title="Delete" color="red" onPress={onDelete} />
      </View>

      <View style={{ marginTop: 8 }}>
        <Text style={styles.label}>Snooze</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 8 }}>
          {[5, 10, 30, 60].map((m) => (
            <TouchableOpacity key={m} style={styles.snoozeBtn} onPress={() => onSnooze(m)}>
              <Text style={styles.snoozeText}>{m}m</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-around' }}>
        <Button title="Mark as Taken" onPress={markTaken} />
        <Button title="Mark as Missed" color="red" onPress={markMissed} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 22, fontWeight: '700' },
  time: { fontSize: 12, color: '#666' },
  label: { fontSize: 12, color: '#666', marginBottom: 4 },
  snoozeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  snoozeText: { fontWeight: '600' },
});