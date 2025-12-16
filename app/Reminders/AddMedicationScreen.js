/**
 * File: [`app/Reminders/AddMedicationScreen.js`](app/Reminders/AddMedicationScreen.js:1)
 *
 * Purpose:
 * - Mobile Add Medication screen with manual entry
 * - Client-side validation on blur and on Save
 * - Saves medication via lib/medicationService.createMedication
 *
 * Fields included:
 * - Medication name, type, dosage value
 * - Instructions
 * - Frequency type, times per day, dose times
 * - Start date, end date, repeat days
 * - Timezone
 */

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MedicationService from '../../lib/medicationService';

const MED_TYPES = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Drops'];
const FREQUENCY_TYPES = ['Once', 'Daily', 'Weekly', 'Custom'];
const DEFAULT_TIME_EXAMPLE = '08:00';

/**
 * Helpers
 */
function todayISODate() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function isValidTimeHHMM(v) {
  if (!v || typeof v !== 'string') return false;
  const m = v.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  return !!m;
}

/**
 * Validation messages
 */
const ERROR_MESSAGES = {
  medication_name: 'Please enter a valid medication name',
  medication_type: 'Please select a medication type',
  dosage_value: 'Dosage must be greater than 0',
  instructions: 'Instructions cannot exceed 250 characters',
  frequency_type: 'Please select how often the medication is taken',
  times_per_day: 'Times per day must be between 1 and 10',
  dose_times: 'Please add at least one reminder time',
  start_date: 'Start date cannot be in the past',
  end_date: 'End date cannot be before start date',
  repeat_days: 'Please select at least one day',
  dose_times_count_mismatch: 'Number of reminder times must match times per day',
};

export default function AddMedicationScreen({ navigation }) {
  // Section 1: Medication Details
  const [medicationName, setMedicationName] = useState('');
  const [medicationType, setMedicationType] = useState('');
  const [dosageValue, setDosageValue] = useState('');
  const [instructions, setInstructions] = useState('');

  // Section 2: Schedule & Timing
  const [frequencyType, setFrequencyType] = useState('Once');
  const [timesPerDay, setTimesPerDay] = useState(1);
  const [doseTimes, setDoseTimes] = useState([DEFAULT_TIME_EXAMPLE]);
  const [newTimeInput, setNewTimeInput] = useState('');
  const [startDate, setStartDate] = useState(todayISODate());
  const [endDate, setEndDate] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [repeatDays, setRepeatDays] = useState([]);
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Validation state
  const isFormValid = useMemo(() => {
    if (!medicationName || medicationName.trim().length < 2) return false;
    if (!medicationType) return false;
    const dv = Number(dosageValue);
    if (!dosageValue || isNaN(dv) || dv <= 0) return false;
    if (!frequencyType) return false;
    if (!timesPerDay || timesPerDay < 1 || timesPerDay > 10) return false;
    if (!doseTimes || doseTimes.length < 1) return false;
    if (!startDate) return false;
    if (new Date(startDate + 'T00:00:00').getTime() < new Date(todayISODate() + 'T00:00:00').getTime()) return false;
    if (endDate) {
      if (new Date(endDate + 'T00:00:00').getTime() < new Date(startDate + 'T00:00:00').getTime()) return false;
    }
    if ((frequencyType === 'Weekly' || frequencyType === 'Custom') && (!repeatDays || repeatDays.length === 0))
      return false;
    if (!timezone) return false;
    if (doseTimes.length !== Number(timesPerDay)) return false;
    return true;
  }, [medicationName, medicationType, dosageValue, frequencyType, timesPerDay, doseTimes, startDate, endDate, repeatDays, timezone]);

  /**
   * Field-level validators
   */
  function validateField(name, value) {
    let msg = null;
    switch (name) {
      case 'medication_name':
        if (!value || value.trim().length < 2) msg = ERROR_MESSAGES.medication_name;
        break;
      case 'medication_type':
        if (!value) msg = ERROR_MESSAGES.medication_type;
        break;
      case 'dosage_value':
        {
          const n = Number(value);
          if (!value || isNaN(n) || n <= 0) msg = ERROR_MESSAGES.dosage_value;
        }
        break;
      case 'instructions':
        if (value && value.length > 250) msg = ERROR_MESSAGES.instructions;
        break;
      case 'frequency_type':
        if (!value) msg = ERROR_MESSAGES.frequency_type;
        break;
      case 'times_per_day':
        {
          const n = Number(value);
          if (!value || isNaN(n) || n < 1 || n > 10) msg = ERROR_MESSAGES.times_per_day;
        }
        break;
      case 'dose_times':
        if (!value || value.length < 1) msg = ERROR_MESSAGES.dose_times;
        else {
          const invalid = value.find((t) => !isValidTimeHHMM(t));
          if (invalid) msg = 'Invalid time: use HH:MM format';
        }
        break;
      case 'start_date':
        if (!value) msg = ERROR_MESSAGES.start_date;
        else {
          const start = new Date(value + 'T00:00:00');
          const today = new Date(todayISODate() + 'T00:00:00');
          if (start.getTime() < today.getTime()) msg = ERROR_MESSAGES.start_date;
        }
        break;
      case 'end_date':
        if (value) {
          const end = new Date(value + 'T00:00:00');
          const start = new Date(startDate + 'T00:00:00');
          if (end.getTime() < start.getTime()) msg = ERROR_MESSAGES.end_date;
        }
        break;
      case 'repeat_days':
        if ((frequencyType === 'Weekly' || frequencyType === 'Custom') && (!value || value.length === 0))
          msg = ERROR_MESSAGES.repeat_days;
        break;
      default:
        break;
    }

    setErrors((prev) => ({ ...prev, [name]: msg }));
    return msg;
  }

  function validateAll() {
    const checks = [
      ['medication_name', medicationName],
      ['medication_type', medicationType],
      ['dosage_value', dosageValue],
      ['instructions', instructions],
      ['frequency_type', frequencyType],
      ['times_per_day', timesPerDay],
      ['dose_times', doseTimes],
      ['start_date', startDate],
      ['end_date', endDate],
      ['repeat_days', repeatDays],
    ];
    let anyError = false;
    for (const [k, v] of checks) {
      const err = validateField(k, v);
      if (err) anyError = true;
    }

    if (doseTimes.length !== Number(timesPerDay)) {
      setErrors((prev) => ({ ...prev, dose_times_count_mismatch: ERROR_MESSAGES.dose_times_count_mismatch }));
      anyError = true;
    } else {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.dose_times_count_mismatch;
        return copy;
      });
    }

    return !anyError;
  }

  /**
   * UI operations
   */
  function addDoseTimeFromInput() {
    const v = newTimeInput.trim();
    if (!isValidTimeHHMM(v)) {
      Alert.alert('Invalid time', 'Please enter time in HH:MM (24h) format');
      return;
    }
    if (doseTimes.includes(v)) {
      Alert.alert('Duplicate time', 'This time is already in the list');
      return;
    }
    const updated = [...doseTimes, v].slice(0, 10);
    setDoseTimes(updated);
    setNewTimeInput('');
    validateField('dose_times', updated);
  }

  function formatTimeInput(text) {
    if (!text) {
      setNewTimeInput('');
      return;
    }

    const incomingDigits = (text || '').replace(/\D/g, '').slice(0, 4);
    const previousFormatted = newTimeInput || '';
    const previousDigits = previousFormatted.replace(/\D/g, '');
    const isDeletion = incomingDigits.length < previousDigits.length || (text.length < previousFormatted.length);

    let digits = incomingDigits;

    if (digits.length >= 2) {
      const hour = Number(digits.slice(0, 2));
      if (!Number.isNaN(hour) && hour > 23) {
        digits = digits.slice(0, 1);
      }
    }

    if (digits.length >= 3) {
      const firstMin = Number(digits.charAt(2));
      if (!Number.isNaN(firstMin) && firstMin > 5) {
        digits = digits.slice(0, 2);
      } else if (digits.length === 4) {
        const mins = Number(digits.slice(2, 4));
        if (!Number.isNaN(mins) && mins > 59) {
          digits = digits.slice(0, 3);
        }
      }
    }

    let formatted = '';
    if (digits.length === 0) {
      formatted = '';
    } else if (digits.length === 1) {
      formatted = digits;
    } else if (digits.length === 2) {
      formatted = isDeletion ? digits : digits + ':';
    } else if (digits.length === 3) {
      formatted = digits.slice(0, 2) + ':' + digits.slice(2);
    } else {
      formatted = digits.slice(0, 2) + ':' + digits.slice(2, 4);
    }

    setNewTimeInput(formatted);
  }

  function removeDoseTimeAt(idx) {
    const updated = doseTimes.filter((_, i) => i !== idx);
    setDoseTimes(updated);
    validateField('dose_times', updated);
  }

  function toggleRepeatDay(day) {
    const found = repeatDays.includes(day);
    const updated = found ? repeatDays.filter((d) => d !== day) : [...repeatDays, day];
    setRepeatDays(updated);
    validateField('repeat_days', updated);
  }

  function handleStartDateChange(event, selectedDate) {
    if (event.type === 'dismissed') {
      setShowStartPicker(false);
      return;
    }

    if (selectedDate) {
      const iso = selectedDate.toISOString().slice(0, 10);
      setStartDate(iso);
      validateField('start_date', iso);
    }

    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }
  }

  function handleEndDateChange(event, selectedDate) {
    if (event.type === 'dismissed') {
      setShowEndPicker(false);
      return;
    }

    if (selectedDate) {
      const iso = selectedDate.toISOString().slice(0, 10);
      setEndDate(iso);
      validateField('end_date', iso);
    }

    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }
  }

  function confirmStartDate() {
    setShowStartPicker(false);
  }

  function confirmEndDate() {
    setShowEndPicker(false);
  }

  /**
   * Save handler
   */
  async function onSave() {
    const ok = validateAll();
    if (!ok) {
      Alert.alert('Validation', 'Please fix highlighted errors before saving.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        medication_name: medicationName.trim(),
        medication_type: medicationType,
        dosage_value: Number(dosageValue),
        instructions: instructions ? instructions.trim() : null,
        frequency_type: frequencyType.toLowerCase(),
        times_per_day: Number(timesPerDay),
        dose_times: doseTimes,
        start_date: startDate,
        end_date: endDate || null,
        repeat_days: repeatDays.length ? repeatDays : null,
        timezone,
      };

      console.log('Saving medication payload:', JSON.stringify(payload, null, 2));

      const saved = await MedicationService.createMedication(payload);

      console.log('Medication saved response:', saved);

      if (saved && saved.id) {
        Alert.alert('Success', 'Medication saved successfully!');
        navigation?.goBack?.();
      } else {
        console.error('Save returned no ID:', saved);
        Alert.alert('Error', 'Medication saved but no ID returned.');
        navigation?.goBack?.();
      }
    } catch (err) {
      console.error('AddMedicationScreen.onSave - Full error:', err);
      const errorMsg = err?.message || JSON.stringify(err) || 'Failed to save medication';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Render helpers
   */
  function renderError(key) {
    if (!errors) return null;
    const msg = errors[key];
    if (!msg) return null;
    return <Text style={styles.errorText}>{msg}</Text>;
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ backgroundColor: '#ffffff' }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#10B981" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Medication</Text>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Section 1: Medication Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medication Details</Text>

          <TextInput
            placeholder="Medication name"
            value={medicationName}
            onChangeText={setMedicationName}
            onBlur={() => validateField('medication_name', medicationName)}
            style={styles.input}
          />
          {renderError('medication_name')}

          <Text style={styles.label}>Medication type</Text>
          <View style={styles.chipsRow}>
            {MED_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, medicationType === t && styles.chipActive]}
                onPress={() => {
                  setMedicationType(t);
                  validateField('medication_type', t);
                }}
              >
                <Text style={medicationType === t ? styles.chipTextActive : styles.chipText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {renderError('medication_type')}

          <TextInput
            placeholder="Dosage value"
            value={dosageValue}
            onChangeText={setDosageValue}
            onBlur={() => validateField('dosage_value', dosageValue)}
            keyboardType="numeric"
            style={styles.input}
          />
          {renderError('dosage_value')}

          <TextInput
            placeholder="Instructions (optional)"
            value={instructions}
            onChangeText={setInstructions}
            onBlur={() => validateField('instructions', instructions)}
            style={[styles.input, { height: 80 }]}
            multiline
            maxLength={250}
          />
          {renderError('instructions')}
        </View>

        {/* Section 2: Schedule & Timing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule & Timing</Text>

          <Text style={styles.label}>Frequency</Text>
          <View style={styles.chipsRow}>
            {FREQUENCY_TYPES.map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.chip, frequencyType === f && styles.chipActive]}
                onPress={() => {
                  setFrequencyType(f);
                  validateField('frequency_type', f);
                }}
              >
                <Text style={frequencyType === f ? styles.chipTextActive : styles.chipText}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {renderError('frequency_type')}

          <Text style={styles.label}>Times per day</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => {
                const v = Math.max(1, Number(timesPerDay) - 1);
                setTimesPerDay(v);
                validateField('times_per_day', v);
              }}
            >
              <Text style={styles.stepperText}>-</Text>
            </TouchableOpacity>
            <Text style={{ width: 40, textAlign: 'center' }}>{String(timesPerDay)}</Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => {
                const v = Math.min(10, Number(timesPerDay) + 1);
                setTimesPerDay(v);
                validateField('times_per_day', v);
              }}
            >
              <Text style={styles.stepperText}>+</Text>
            </TouchableOpacity>
          </View>
          {renderError('times_per_day')}

          <Text style={styles.label}>Dose times (HH:MM)</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TextInput
              placeholder={DEFAULT_TIME_EXAMPLE}
              value={newTimeInput}
              onChangeText={formatTimeInput}
              keyboardType="number-pad"
              maxLength={5}
              returnKeyType="done"
              style={[styles.input, { flex: 1 }]}
            />
            <Button title="Add" onPress={addDoseTimeFromInput} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {doseTimes.map((t, i) => (
              <View key={t + i} style={styles.timePill}>
                <Text style={{ marginRight: 8 }}>{t}</Text>
                <TouchableOpacity onPress={() => removeDoseTimeAt(i)}>
                  <Text style={{ color: 'red' }}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          {renderError('dose_times')}
          {renderError('dose_times_count_mismatch')}

          <Text style={styles.label}>Start date</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowStartPicker(true)}
            accessibilityRole="button"
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>{startDate || todayISODate()}</Text>
              <Ionicons name="calendar" size={20} color="#6b7280" />
            </View>
          </TouchableOpacity>
          {renderError('start_date')}

          {showStartPicker && (
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={confirmStartDate}>
                  <Text style={styles.pickerHeaderButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={startDate ? new Date(startDate + 'T00:00:00Z') : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleStartDateChange}
                maximumDate={new Date()}
                textColor="#000"
              />
            </View>
          )}

          <Text style={styles.label}>End date (optional)</Text>
          <TouchableOpacity
            style={styles.input}
            onPress={() => setShowEndPicker(true)}
            accessibilityRole="button"
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>{endDate || '—'}</Text>
              <Ionicons name="calendar" size={20} color="#6b7280" />
            </View>
          </TouchableOpacity>
          {renderError('end_date')}

          {showEndPicker && (
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={confirmEndDate}>
                  <Text style={styles.pickerHeaderButton}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={endDate ? new Date(endDate + 'T00:00:00Z') : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleEndDateChange}
                minimumDate={startDate ? new Date(startDate + 'T00:00:00Z') : new Date()}
                textColor="#000"
              />
            </View>
          )}

          {(frequencyType === 'Weekly' || frequencyType === 'Custom') && (
            <>
              <Text style={styles.label}>Repeat days</Text>
              <View style={styles.chipsRow}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, repeatDays.includes(d) && styles.chipActive]}
                    onPress={() => toggleRepeatDay(d)}
                  >
                    <Text style={repeatDays.includes(d) ? styles.chipTextActive : styles.chipText}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {renderError('repeat_days')}
            </>
          )}
        </View>

        {/* CTA */}
        <View style={{ paddingHorizontal: 16 }}>
          <TouchableOpacity
            accessibilityRole="button"
            style={loading ? [styles.primaryButton, styles.primaryButtonDisabled] : styles.primaryButton}
            onPress={onSave}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>{loading ? 'Saving...' : 'Save Medication'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  backButton: {
    paddingRight: 8,
    zIndex: 3,
  },
  section: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 6, marginTop: 4 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { color: '#111827' },
  chipTextActive: { color: '#fff' },
  primaryButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  stepperBtn: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
  },
  stepperText: { fontWeight: '700' },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  errorText: { color: '#dc2626', fontSize: 12, marginBottom: 8 },
  pickerContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
    marginBottom: 8,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pickerHeaderButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
});