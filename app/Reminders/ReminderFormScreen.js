import { useEffect, useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as SupabaseLib from '../../lib/supabase';
const supabase = SupabaseLib.supabase || SupabaseLib.default || SupabaseLib;

/**
 * ReminderFormScreen
 * File: [`app/Reminders/ReminderFormScreen.js`](app/Reminders/ReminderFormScreen.js:1)
 *
 * Standalone form screen for creating and editing reminders.
 * Mirrors the logic from the original combined index file.
 */

const nowISO = () => new Date().toISOString();

const ReminderService = {
  async create(payload) {
    try {
      const insert = { ...payload, created_at: nowISO(), updated_at: nowISO() };
      const { data, error } = await supabase.from('reminders').insert([insert]).select().single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('create reminder error', err);
      throw err;
    }
  },

  async update(id, patch) {
    try {
      const updated = { ...patch, updated_at: nowISO() };
      const { data, error } = await supabase
        .from('reminders')
        .update(updated)
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
};

/* Placeholder: schedule a local notification (hook into reminderScheduler or notificationHelpers later) */
async function scheduleLocalNotification(reminder) {
  console.log('TODO schedule local notification for', reminder?.id);
}

export default function ReminderFormScreen({ route, navigation }) {
  const editingId = route?.params?.reminderId;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reminderTime, setReminderTime] = useState(new Date().toISOString());
  const [category, setCategory] = useState('appointments');
  const [notificationTypes, setNotificationTypes] = useState(['push']);
  const [loading, setLoading] = useState(false);

  async function loadIfEdit() {
    if (!editingId) return;
    setLoading(true);
    try {
      const data = await ReminderService.fetchOne(editingId);
      setTitle(data.title || '');
      setDescription(data.description || '');
      setReminderTime(data.reminder_time || new Date().toISOString());
      setCategory(data.category || 'appointments');
      setNotificationTypes(data.notification_types || ['push']);
    } catch (err) {
      console.error('loadIfEdit', err);
      Alert.alert('Error', 'Could not load reminder for editing.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIfEdit();
  }, []);

  async function onSave() {
    if (!title?.trim()) {
      Alert.alert('Validation', 'Title is required');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        reminder_time: reminderTime,
        category,
        notification_types: notificationTypes,
        repeat_frequency: 'none',
        notify_before_minutes: 0,
      };
      let saved;
      if (editingId) {
        saved = await ReminderService.update(editingId, payload);
      } else {
        saved = await ReminderService.create(payload);
      }

      // Schedule local notification (TODO: implement concrete scheduling)
      await scheduleLocalNotification(saved);

      navigation?.goBack?.();
    } catch (err) {
      console.error('onSave', err);
      Alert.alert('Error', 'Could not save reminder.');
    } finally {
      setLoading(false);
    }
  }

  async function onVoiceInput() {
    Alert.alert('Voice Input', 'Voice input not implemented in scaffold.');
  }

  async function onAddAttachment() {
    Alert.alert('Attachment', 'Attachment upload not implemented in scaffold.');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{editingId ? 'Edit Reminder' : 'New Reminder'}</Text>

      <TextInput value={title} onChangeText={setTitle} placeholder="Title" style={styles.input} maxLength={100} />
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Description"
        style={[styles.input, { height: 100 }]}
        multiline
        maxLength={500}
      />

      <Text style={styles.label}>Date & Time (ISO)</Text>
      <TextInput value={reminderTime} onChangeText={setReminderTime} style={styles.input} />

      <Text style={styles.label}>Category</Text>
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        {['important_dates', 'medications', 'appointments', 'other'].map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => setCategory(c)}
            style={[styles.pill, c === category && styles.pillActive]}
          >
            <Text style={c === category ? styles.pillTextActive : styles.pillText}>{c.replace('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <Button title="Voice" onPress={onVoiceInput} />
        <Button title="Attach" onPress={onAddAttachment} />
      </View>

      <Button title={loading ? 'Saving...' : 'Save'} onPress={onSave} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 22, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  label: { fontSize: 12, color: '#666', marginBottom: 4 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: '#2b6cb0',
  },
  pillText: { color: '#333' },
  pillTextActive: { color: 'white' },
  snoozeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  snoozeText: { fontWeight: '600' },
});