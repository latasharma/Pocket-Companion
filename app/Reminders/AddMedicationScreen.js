/**
 * File: [`app/Reminders/AddMedicationScreen.js`](app/Reminders/AddMedicationScreen.js:1)
 *
 * Purpose:
 * - Mobile Add Medication screen implementing Manual entry (Take Picture visible but disabled).
 * - Client-side validation on blur and on Save (per provided spec).
 * - Saves medication via lib/medicationService.createMedication and relies on that service to schedule notifications.
 *
 * Notes:
 * - This is a mobile-first, single-column scaffold that focuses on correctness of validation and Supabase wiring.
 * - For time/date pickers you can replace the simple text inputs with platform native pickers later.
 */

import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
const DOSAGE_UNITS = ['mg', 'ml', 'drops', 'units'];
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
 * Validation messages per spec
 */
const ERROR_MESSAGES = {
  medication_name: 'Please enter a valid medication name',
  medication_type: 'Please select a medication type',
  dosage_value: 'Dosage must be greater than 0',
  dosage_unit: 'Please select a dosage unit',
  instructions: 'Instructions cannot exceed 250 characters',
  frequency_type: 'Please select how often the medication is taken',
  times_per_day: 'Times per day must be between 1 and 10',
  dose_times: 'Please add at least one reminder time',
  start_date: 'Start date cannot be in the past',
  end_date: 'End date cannot be before start date',
  repeat_days: 'Please select at least one day',
  timezone: 'Timezone is required',
  notification_type: 'Please select at least one notification type',
  pre_reminder_time: 'Pre-reminder time must be valid',
  snooze_interval: 'Please select a snooze interval',
  total_quantity: 'Total quantity must be greater than 0',
  dose_consumption: 'Dose consumption must be greater than 0',
  refill_threshold: 'Refill threshold must be less than total quantity',
  prescribed_by: 'Doctor name is too long',
  hospital_or_clinic: 'Clinic name is too long',
  prescription_notes: 'Notes cannot exceed 300 characters',
  dose_times_count_mismatch: 'Number of reminder times must match times per day',
  reminder_enabled_no_times: 'Add reminder time to enable reminders',
};

export default function AddMedicationScreen({ navigation }) {
  // Entry selector
  const [entryMethod, setEntryMethod] = useState('manual'); // 'manual' | 'image' (image is disabled/coming soon)

  // Section 1: Medication Details
  const [medicationName, setMedicationName] = useState('');
  const [medicationType, setMedicationType] = useState('');
  const [dosageValue, setDosageValue] = useState(''); // keep as string for input
  // dosageUnit removed — field commented out in UI / DB schema
  const [instructions, setInstructions] = useState('');

  // Section 2: Schedule & Timing
  const [frequencyType, setFrequencyType] = useState('Once');
  const [timesPerDay, setTimesPerDay] = useState(1);
  const [doseTimes, setDoseTimes] = useState([DEFAULT_TIME_EXAMPLE]); // array of "HH:MM"
  const [newTimeInput, setNewTimeInput] = useState('');
  const [startDate, setStartDate] = useState(todayISODate());
  const [endDate, setEndDate] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  const [repeatDays, setRepeatDays] = useState([]); // e.g., ['Mon','Tue']
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );

  // Section 3: Reminder Settings
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [notificationType, setNotificationType] = useState(['push']); // array
  const [preReminderTime, setPreReminderTime] = useState('5'); // minutes as string
  const [snoozeEnabled, setSnoozeEnabled] = useState(false);
  const [snoozeInterval, setSnoozeInterval] = useState('5'); // minutes as string
  const [missedDoseAlert, setMissedDoseAlert] = useState(false);

  // Optional section: inventory & doctor
  const [totalQuantity, setTotalQuantity] = useState('');
  const [doseConsumption, setDoseConsumption] = useState('');
  const [refillThreshold, setRefillThreshold] = useState('');
  const [refillReminderEnabled, setRefillReminderEnabled] = useState(false);

  const [prescribedBy, setPrescribedBy] = useState('');
  const [hospitalOrClinic, setHospitalOrClinic] = useState('');
  const [prescriptionNotes, setPrescriptionNotes] = useState('');

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Derived validation state: whether Save button should be enabled
  const isFormValid = useMemo(() => {
    // Required fields basic checks
    if (!medicationName || medicationName.trim().length < 2) return false;
    if (!medicationType) return false;
    const dv = Number(dosageValue);
    if (!dosageValue || isNaN(dv) || dv <= 0) return false;
    // dosageUnit intentionally omitted from validation (field removed from UI)
    if (!frequencyType) return false;
    if (!timesPerDay || timesPerDay < 1 || timesPerDay > 10) return false;
    if (!doseTimes || doseTimes.length < 1) return false;
    if (!startDate) return false;
    // startDate not in past
    if (new Date(startDate + 'T00:00:00').getTime() < new Date(todayISODate() + 'T00:00:00').getTime()) return false;
    if (endDate) {
      if (new Date(endDate + 'T00:00:00').getTime() < new Date(startDate + 'T00:00:00').getTime()) return false;
    }
    if ((frequencyType === 'Weekly' || frequencyType === 'Custom') && (!repeatDays || repeatDays.length === 0))
      return false;
    if (!timezone) return false;
    if (!notificationType || notificationType.length === 0) return false;
    const pr = preReminderTime ? Number(preReminderTime) : 0;
    if (preReminderTime && (isNaN(pr) || pr < 0)) return false;
    if (snoozeEnabled) {
      const si = Number(snoozeInterval);
      if (!snoozeInterval || isNaN(si) || si <= 0) return false;
    }
    // cross-field: dose_times count must equal times_per_day
    if (doseTimes.length !== Number(timesPerDay)) return false;
    // inventory checks if refill enabled
    if (refillReminderEnabled) {
      const tq = Number(totalQuantity);
      if (!totalQuantity || isNaN(tq) || tq <= 0) return false;
    }
    return true;
  }, [
    medicationName,
    medicationType,
    dosageValue,
    frequencyType,
    timesPerDay,
    doseTimes,
    startDate,
    endDate,
    repeatDays,
    timezone,
    notificationType,
    preReminderTime,
    snoozeEnabled,
    snoozeInterval,
    refillReminderEnabled,
    totalQuantity,
  ]);

  /**
   * Field-level validators (called on blur and on save)
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
      /* dosage_unit validator removed (field commented out in UI) */
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
          // ensure each time is valid HH:MM
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
      case 'timezone':
        if (!value) msg = ERROR_MESSAGES.timezone;
        break;
      case 'notification_type':
        if (!value || value.length === 0) msg = ERROR_MESSAGES.notification_type;
        break;
      case 'pre_reminder_time':
        if (value) {
          const n = Number(value);
          if (isNaN(n) || n < 0) msg = ERROR_MESSAGES.pre_reminder_time;
        }
        break;
      case 'snooze_interval':
        if (snoozeEnabled) {
          const n = Number(value);
          if (!value || isNaN(n) || n <= 0) msg = ERROR_MESSAGES.snooze_interval;
        }
        break;
      case 'total_quantity':
        if (value) {
          const n = Number(value);
          if (isNaN(n) || n <= 0) msg = ERROR_MESSAGES.total_quantity;
        }
        break;
      case 'dose_consumption':
        if (value) {
          const n = Number(value);
          if (isNaN(n) || n <= 0) msg = ERROR_MESSAGES.dose_consumption;
        }
        break;
      case 'refill_threshold':
        if (value && totalQuantity) {
          const rt = Number(value);
          const tq = Number(totalQuantity);
          if (isNaN(rt) || rt >= tq) msg = ERROR_MESSAGES.refill_threshold;
        }
        break;
      case 'prescribed_by':
        if (value && value.length > 100) msg = ERROR_MESSAGES.prescribed_by;
        break;
      case 'hospital_or_clinic':
        if (value && value.length > 150) msg = ERROR_MESSAGES.hospital_or_clinic;
        break;
      case 'prescription_notes':
        if (value && value.length > 300) msg = ERROR_MESSAGES.prescription_notes;
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
      // ['dosage_unit', dosageUnit], // removed — field not present in UI/DB
      ['instructions', instructions],
      ['frequency_type', frequencyType],
      ['times_per_day', timesPerDay],
      ['dose_times', doseTimes],
      ['start_date', startDate],
      ['end_date', endDate],
      ['repeat_days', repeatDays],
      ['timezone', timezone],
      ['notification_type', notificationType],
      ['pre_reminder_time', preReminderTime],
      ['snooze_interval', snoozeInterval],
      ['total_quantity', totalQuantity],
      ['dose_consumption', doseConsumption],
      ['refill_threshold', refillThreshold],
      ['prescribed_by', prescribedBy],
      ['hospital_or_clinic', hospitalOrClinic],
      ['prescription_notes', prescriptionNotes],
    ];
    let anyError = false;
    for (const [k, v] of checks) {
      const err = validateField(k, v);
      if (err) anyError = true;
    }

    // Cross-field validations
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

    if (reminderEnabled && (!doseTimes || doseTimes.length === 0)) {
      setErrors((prev) => ({ ...prev, reminder_enabled_no_times: ERROR_MESSAGES.reminder_enabled_no_times }));
      anyError = true;
    } else {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.reminder_enabled_no_times;
        return copy;
      });
    }

    return !anyError;
  }

  /**
   * UI operations for time list and repeat days
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

  /**
   * Robust HH:MM formatter for numeric keypad input.
   * - Accepts only digits (max 4 -> HHMM).
   * - Rejects hours > 23 and minute patterns > 59 as the user types.
   * - Handles deletions so backspace and the keyboard clear key work.
   * - Ensures colon is not forcibly re-inserted during deletion so user can remove digits naturally.
   */
  function formatTimeInput(text) {
    // If user cleared the field entirely, accept and return immediately
    if (!text) {
      setNewTimeInput('');
      return;
    }

    // derive digit-only incoming and previous digit state
    const incomingDigits = (text || '').replace(/\D/g, '').slice(0, 4);
    const previousFormatted = newTimeInput || '';
    const previousDigits = previousFormatted.replace(/\D/g, '');
    const isDeletion = incomingDigits.length < previousDigits.length || (text.length < previousFormatted.length);

    let digits = incomingDigits;

    // Validate hours when at least two digits present
    if (digits.length >= 2) {
      const hour = Number(digits.slice(0, 2));
      if (!Number.isNaN(hour) && hour > 23) {
        // invalid hour -> drop last entered digit
        digits = digits.slice(0, 1);
      }
    }

    // Validate minute first digit (must be 0-5) and full minutes when available
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

    // Format with colon. When deletion detected, avoid forcing the colon so user can backspace naturally.
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

  function toggleNotificationType(type) {
    const found = notificationType.includes(type);
    const updated = found ? notificationType.filter((t) => t !== type) : [...notificationType, type];
    setNotificationType(updated);
    validateField('notification_type', updated);
  }

  function handleStartDateChange(event, selectedDate) {
  if (event.type === 'dismissed') {
    // User cancelled on Android
    setShowStartPicker(false);
    return;
  }
  
  if (selectedDate) {
    const iso = selectedDate.toISOString().slice(0, 10);
    setStartDate(iso);
    validateField('start_date', iso);
  }
  
  // On Android, picker closes automatically; on iOS, keep it open until user confirms
  if (Platform.OS === 'android') {
    setShowStartPicker(false);
  }
}

function handleEndDateChange(event, selectedDate) {
  if (event.type === 'dismissed') {
    // User cancelled on Android
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

// For iOS, add a confirm button handler:
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
      // Scroll to first error could be done on native UI; show a toast-level message here
      Alert.alert('Validation', 'Please fix highlighted errors before saving.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        entry_method: entryMethod,
        medication_name: medicationName.trim(),
        medication_type: medicationType,
        dosage_value: Number(dosageValue),
        // dosage_unit removed from payload to match current DB/UI
        instructions: instructions ? instructions.trim() : null,

        frequency_type: frequencyType.toLowerCase(),
        times_per_day: Number(timesPerDay),
        dose_times: doseTimes,
        start_date: startDate,
        end_date: endDate || null,
        repeat_days: repeatDays.length ? repeatDays : null,
        timezone,

        reminder_enabled: !!reminderEnabled,
        notification_type: notificationType,
        pre_reminder_time: preReminderTime ? Number(preReminderTime) : null,
        snooze_enabled: !!snoozeEnabled,
        snooze_interval: snoozeEnabled ? Number(snoozeInterval) : null,
        missed_dose_alert: !!missedDoseAlert,

        total_quantity: totalQuantity ? Number(totalQuantity) : null,
        dose_consumption: doseConsumption ? Number(doseConsumption) : null,
        refill_threshold: refillThreshold ? Number(refillThreshold) : null,
        refill_reminder_enabled: !!refillReminderEnabled,

        prescribed_by: prescribedBy ? prescribedBy.trim() : null,
        hospital_or_clinic: hospitalOrClinic ? hospitalOrClinic.trim() : null,
        prescription_notes: prescriptionNotes ? prescriptionNotes.trim() : null,
      };

      const saved = await MedicationService.createMedication(payload);
      if (saved && saved.id) {
        // success
        navigation?.goBack?.();
      } else {
        Alert.alert('Error', 'Could not save medication.');
      }
    } catch (err) {
      console.error('AddMedicationScreen.onSave', err);
      Alert.alert('Error', err?.message || 'Failed to save medication');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Small render helpers
   */
  function renderError(key) {
    if (!errors) return null;
    const msg = errors[key];
    if (!msg) return null;
    return <Text style={styles.errorText}>{msg}</Text>;
  }

  useEffect(() => {
    // validate some fields on initial mount
    validateField('timezone', timezone);
  }, []);

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
      {/* Entry method selector */}
      <View style={styles.segmentRow}>
        <TouchableOpacity
          accessibilityRole="button"
          style={entryMethod === 'manual' ? styles.primaryButton : styles.outlinedButton}
          onPress={() => setEntryMethod('manual')}
        >
          <Text style={entryMethod === 'manual' ? styles.primaryButtonText : styles.outlinedButtonText}>
            Manual
          </Text>
        </TouchableOpacity>
 
        {/* <TouchableOpacity
          accessibilityRole="button"
          style={[styles.outlinedButton, styles.segmentDisabled]}
          disabled
        >
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.outlinedButtonText}>Take Picture</Text>
            <Text style={styles.comingSoon}>Coming Soon</Text>
          </View>
        </TouchableOpacity> */}
      </View>

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

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            placeholder="Dosage value"
            value={dosageValue}
            onChangeText={setDosageValue}
            onBlur={() => validateField('dosage_value', dosageValue)}
            keyboardType="numeric"
            style={[styles.input, { flex: 1 }]}
          />
        </View>

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
        {renderError('reminder_enabled_no_times')}

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
        {/* End Date Picker */}
        <Text style={styles.label}>End date (optional)</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowEndPicker(true)}
          accessibilityRole="button"
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>{endDate || '–'}</Text>
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

        {/* <Text style={styles.label}>Timezone</Text>
        <TextInput
          placeholder="Timezone"
          value={timezone}
          onChangeText={setTimezone}
          onBlur={() => validateField('timezone', timezone)}
          style={styles.input}
        />
        {renderError('timezone')} */}
      </View>

      {/* Section 3: Reminder Settings */}
      <View style={styles.section}>
        {/* <Text style={styles.sectionTitle}>Reminder Settings</Text> */}

        {/* <View style={styles.rowBetween}>
          <Text>Enable reminders</Text>
          <TouchableOpacity
            style={[styles.toggleBtn, reminderEnabled && styles.toggleBtnActive]}
            onPress={() => {
              setReminderEnabled(!reminderEnabled);
              // re-validate
              if (!reminderEnabled) validateField('reminder_enabled', true);
            }}
          >
            <Text style={reminderEnabled ? styles.toggleTextActive : styles.toggleText}>
              {reminderEnabled ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View> */}

        {/* <Text style={[styles.label, { marginTop: 8 }]}>Notification types</Text> */}
        {/* <View style={styles.chipsRow}>
          {['push', 'email', 'in_app', 'voice',].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, notificationType.includes(t) && styles.chipActive]}
              onPress={() => toggleNotificationType(t)}
            >
              <Text style={notificationType.includes(t) ? styles.chipTextActive : styles.chipText}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {renderError('notification_type')}

        <Text style={styles.label}>Pre-reminder time (minutes)</Text>
        <TextInput
          placeholder="5"
          value={preReminderTime}
          keyboardType="numeric"
          onChangeText={setPreReminderTime}
          onBlur={() => validateField('pre_reminder_time', preReminderTime)}
          style={styles.input}
        />
        {renderError('pre_reminder_time')} */}

        {/* <View style={[styles.rowBetween, { marginTop: 8 }]}>
          <Text>Snooze</Text>
          <TouchableOpacity
            style={[styles.toggleBtn, snoozeEnabled && styles.toggleBtnActive]}
            onPress={() => {
              setSnoozeEnabled(!snoozeEnabled);
              if (!snoozeEnabled) validateField('snooze_interval', snoozeInterval);
            }}
          >
            <Text style={snoozeEnabled ? styles.toggleTextActive : styles.toggleText}>{snoozeEnabled ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>
        </View> */}

        {/* {snoozeEnabled && (
          <>
            <Text style={styles.label}>Snooze interval (minutes)</Text>
            <TextInput
              placeholder="5"
              value={snoozeInterval}
              keyboardType="numeric"
              onChangeText={setSnoozeInterval}
              onBlur={() => validateField('snooze_interval', snoozeInterval)}
              style={styles.input}
            />
            {renderError('snooze_interval')}
          </>
        )} */}

        {/* <View style={[styles.rowBetween, { marginTop: 8 }]}>
          <Text>Missed dose alert</Text>
          <TouchableOpacity
            style={[styles.toggleBtn, missedDoseAlert && styles.toggleBtnActive]}
            onPress={() => setMissedDoseAlert(!missedDoseAlert)}
          >
            <Text style={missedDoseAlert ? styles.toggleTextActive : styles.toggleText}>{missedDoseAlert ? 'ON' : 'OFF'}</Text>
          </TouchableOpacity>
        </View> */}
      </View>

      {/* Optional: Inventory & Refill */}
      {/* <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inventory & Refill (optional)</Text>

        <TextInput
          placeholder="Total quantity"
          value={totalQuantity}
          onChangeText={setTotalQuantity}
          onBlur={() => validateField('total_quantity', totalQuantity)}
          style={styles.input}
          keyboardType="numeric"
        />
        {renderError('total_quantity')}

        <TextInput
          placeholder="Dose consumption (per dose)"
          value={doseConsumption}
          onChangeText={setDoseConsumption}
          onBlur={() => validateField('dose_consumption', doseConsumption)}
          style={styles.input}
          keyboardType="numeric"
        />
        {renderError('dose_consumption')}

        <TextInput
          placeholder="Refill threshold"
          value={refillThreshold}
          onChangeText={setRefillThreshold}
          onBlur={() => validateField('refill_threshold', refillThreshold)}
          style={styles.input}
          keyboardType="numeric"
        />
        {renderError('refill_threshold')}

        <View style={[styles.rowBetween, { marginTop: 8 }]}>
          <Text>Refill reminders</Text>
          <TouchableOpacity
            style={[styles.toggleBtn, refillReminderEnabled && styles.toggleBtnActive]}
            onPress={() => setRefillReminderEnabled(!refillReminderEnabled)}
          >
            <Text style={refillReminderEnabled ? styles.toggleTextActive : styles.toggleText}>
              {refillReminderEnabled ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
        </View>
      </View> */}

      {/* Optional: Doctor / Prescription */}
      {/* <View style={styles.section}>
        <Text style={styles.sectionTitle}>Doctor / Prescription (optional)</Text>

        <TextInput
          placeholder="Prescribed by"
          value={prescribedBy}
          onChangeText={setPrescribedBy}
          onBlur={() => validateField('prescribed_by', prescribedBy)}
          style={styles.input}
        />
        {renderError('prescribed_by')}

        <TextInput
          placeholder="Hospital / Clinic"
          value={hospitalOrClinic}
          onChangeText={setHospitalOrClinic}
          onBlur={() => validateField('hospital_or_clinic', hospitalOrClinic)}
          style={styles.input}
        />
        {renderError('hospital_or_clinic')}

        <TextInput
          placeholder="Prescription notes"
          value={prescriptionNotes}
          onChangeText={setPrescriptionNotes}
          onBlur={() => validateField('prescription_notes', prescriptionNotes)}
          style={[styles.input, { height: 80 }]}
          multiline
        />
        {renderError('prescription_notes')}
      </View> */}

      {/* CTA */}
      <View style={{ paddingHorizontal: 16 }}>
        <TouchableOpacity
          accessibilityRole="button"
          style={loading ? [styles.primaryButton, styles.primaryButtonDisabled] : styles.primaryButton}
          onPress={onSave}
          //disabled={loading || !isFormValid}
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
  segmentRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 12, marginBottom: 12, justifyContent: 'space-between', alignItems: 'center' },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    alignItems: 'center',
    minWidth: 140,
  },
  segmentActive: { backgroundColor: '#2563eb' },
  segmentText: { color: '#111827', fontWeight: '600' },
  segmentTextActive: { color: '#fff', fontWeight: '700' },
  segmentDisabled: { backgroundColor: '#f9fafb', opacity: 0.9 },
  segmentTextDisabled: { color: '#9ca3af', fontWeight: '600' },
  comingSoon: { fontSize: 10, color: '#9ca3af' },

  // Button theme (aligned with app/profile.js)
  primaryButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Disabled variant for primary buttons (keeps layout but reduces emphasis)
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  outlinedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#10b981',
    minWidth: 140,
  },
  outlinedButtonText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
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
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  toggleBtnActive: { backgroundColor: '#10b981' },
  toggleText: { color: '#111827', fontWeight: '600' },
  toggleTextActive: { color: '#fff', fontWeight: '700' },
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

  pickerHeaderButton:{
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
});