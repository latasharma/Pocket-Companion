import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Button,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import RoutineAnchors from '../lib/routineAnchors';

/**
 * File: [`app/my-routine.js`](app/my-routine.js:1)
 *
 * "My Routine" settings screen (Story 1.2)
 *
 * Features implemented:
 * - Large selector rows for Breakfast/Lunch/Dinner/Bedtime
 * - Safe time entry with validation and basic 12h/24h handling
 * - Triggers rescheduling on save via [`lib/routineAnchors.js`](lib/routineAnchors.js:1) API
 *
 * Notes:
 * - setAnchor(...) calls into the routineAnchors module which performs DB rescheduling.
 * - This is a settings screen (no navigation wiring assumed) — add a route in your navigator if needed.
 */

export default function MyRoutineScreen({ navigation }) {
  const [anchors, setAnchors] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal editing state
  const [editingKey, setEditingKey] = useState(null); // e.g., 'Breakfast'
  const [editingValue, setEditingValue] = useState('');
  const [use24Hour, setUse24Hour] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const a = await RoutineAnchors.getAnchors();
        setAnchors(a);
      } catch (e) {
        console.warn('MyRoutineScreen: failed to load anchors', e);
        Alert.alert('Error', 'Could not load routine anchors.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function displayTime(hms, prefer24 = true) {
    if (!hms) return '--:--';
    // hms is "HH:MM:SS"
    const parts = hms.split(':');
    if (parts.length < 2) return hms;
    let hh = Number(parts[0]);
    const mm = parts[1].padStart(2, '0');
    if (prefer24) {
      return `${String(hh).padStart(2, '0')}:${mm}`;
    }
    // 12-hour
    const ampm = hh >= 12 ? 'PM' : 'AM';
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${h12}:${mm} ${ampm}`;
  }

  /**
   * parseFlexibleTime
   * Accepts:
   *  - "9:00", "09:00", "9:00 AM", "09:00pm", "21:30", "21:30:00"
   * Returns normalized "HH:MM:SS" or null on invalid input
   */
  function parseFlexibleTime(input) {
    if (!input || typeof input !== 'string') return null;
    const s = input.trim();
    // Match HH:MM or HH:MM:SS with optional AM/PM
    const re = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)?$/;
    const m = s.match(re);
    if (!m) return null;
    let hh = Number(m[1]);
    const mm = Number(m[2]);
    const ss = m[3] ? Number(m[3]) : 0;
    const ampm = m[4] ? m[4].toLowerCase() : null;
    if (mm < 0 || mm > 59 || ss < 0 || ss > 59) return null;
    if (ampm) {
      if (hh < 1 || hh > 12) return null;
      if (ampm === 'pm' && hh < 12) hh += 12;
      if (ampm === 'am' && hh === 12) hh = 0;
    } else {
      if (hh < 0 || hh > 23) return null;
    }
    const hhStr = String(hh).padStart(2, '0');
    const mmStr = String(mm).padStart(2, '0');
    const ssStr = String(ss).padStart(2, '0');
    return `${hhStr}:${mmStr}:${ssStr}`;
  }

  async function openEdit(key) {
    const current = anchors?.[key] || '';
    setEditingKey(key);
    // show friendly representation in input
    setEditingValue(displayTime(current, !use24Hour));
  }

  function closeEdit() {
    setEditingKey(null);
    setEditingValue('');
  }

  async function onSaveEdit() {
    const parsed = parseFlexibleTime(editingValue);
    if (!parsed) {
      Alert.alert('Invalid time', 'Please enter a valid time like "09:00" or "9:00 AM".');
      return;
    }
    // Apply locally
    const updated = { ...(anchors || {}) };
    updated[editingKey] = parsed;
    setAnchors(updated);
    closeEdit();
  }

  async function onSaveAll() {
    if (!anchors) return;
    setSaving(true);
    try {
      // Persist each anchor via RoutineAnchors.setAnchor (which triggers rescheduling)
      for (const k of Object.keys(anchors)) {
        try {
          await RoutineAnchors.setAnchor(k, anchors[k]);
        } catch (e) {
          console.warn('MyRoutineScreen: setAnchor failed for', k, e);
        }
      }
      Alert.alert('Saved', 'Your routine anchors have been updated.');
      // Optionally navigate back
      navigation?.goBack?.();
    } catch (err) {
      console.error('MyRoutineScreen: saveAll failed', err);
      Alert.alert('Error', 'Failed to save anchors.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const rows = ['Breakfast', 'Lunch', 'Dinner', 'Bedtime'];

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Routine</Text>
      <Text style={styles.sub}>Set times for the routine anchors. Changes affect future reminders.</Text>

      <View style={{ marginTop: 18 }}>
        {rows.map((r) => (
          <TouchableOpacity key={r} style={styles.row} onPress={() => openEdit(r)} activeOpacity={0.8}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{r}</Text>
              <Text style={styles.rowSub}>Tap to edit</Text>
            </View>
            <View style={styles.timePill}>
              <Text style={styles.timeText}>{displayTime(anchors?.[r], use24Hour)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ marginTop: 24 }}>
        <Button title={saving ? 'Saving...' : 'Save changes'} onPress={onSaveAll} disabled={saving} />
      </View>

      <Modal visible={!!editingKey} transparent animationType="slide" onRequestClose={closeEdit}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit {editingKey}</Text>
            <Text style={styles.helpText}>Enter time (e.g. 09:00 or 9:00 AM). Seconds are optional.</Text>

            <TextInput
              value={editingValue}
              onChangeText={setEditingValue}
              placeholder={use24Hour ? 'HH:MM' : 'HH:MM AM'}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
              style={styles.input}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <Button title={use24Hour ? 'Switch to 12h' : 'Switch to 24h'} onPress={() => setUse24Hour((s) => !s)} />
              <View style={{ width: 12 }} />
              <Button title="Cancel" onPress={closeEdit} />
              <View style={{ width: 12 }} />
              <Button title="Save" onPress={onSaveEdit} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  header: { fontSize: 24, fontWeight: '700' },
  sub: { color: '#6b7280', marginTop: 6 },
  row: {
    padding: 16,
    marginVertical: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  rowSub: { fontSize: 12, color: '#6b7280' },
  timePill: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timeText: { color: '#fff', fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  helpText: { fontSize: 13, color: '#6b7280', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});