import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Collapsible } from '../../components/Collapsible';
import { Accessibility, hitSlopFor } from '../../constants/Accessibility';
import DefaultsEngine from '../../lib/defaultsEngine';
import NotificationService from '../../lib/notificationService';
import * as SupabaseLib from '../../lib/supabase';
import { VoiceInputService } from '../../lib/voiceInputService';
const supabase = SupabaseLib.supabase || SupabaseLib.default || SupabaseLib;
const DRAFT_KEY = 'poco:reminder_draft';

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

/* schedule a local notification using the new cross-platform wrapper (Story 4.1) */
async function scheduleLocalNotification(reminder) {
  if (!reminder || !reminder.id) {
    console.warn('scheduleLocalNotification: invalid reminder');
    return null;
  }
  try {
    // Use the centralized NotificationService which handles repeating vs one-time scheduling.
    const scheduledId = await NotificationService.scheduleNotification(reminder);
    if (!scheduledId) {
      console.info('scheduleLocalNotification: scheduling returned null for', reminder.id);
    }
    return scheduledId;
  } catch (err) {
    console.warn('scheduleLocalNotification failed', err);
    return null;
  }
}

export default function ReminderFormScreen({ route, navigation }) {
  const editingId = route?.params?.reminderId;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reminderTime, setReminderTime] = useState(new Date().toISOString());
  const [category, setCategory] = useState('appointments');
  const [notificationTypes, setNotificationTypes] = useState(['push']);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Optional Details state (Story 2.6)
  const [attachments, setAttachments] = useState([]); // { uri }
  const [medColor, setMedColor] = useState(null); // hex string
  const [rideNeeded, setRideNeeded] = useState(false);
  const [location, setLocation] = useState('');

  // Voice input state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState(null);

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

  async function loadDraftFromStorage() {
    // Do not auto-load draft when editing an existing reminder
    if (editingId) return;
    try {
      const raw = await AsyncStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      setTitle(draft.title || '');
      setDescription(draft.description || '');
      setReminderTime(draft.reminderTime || new Date().toISOString());
      setCategory(draft.category || 'appointments');
      setNotificationTypes(draft.notificationTypes || ['push']);
      setAttachments(draft.attachments || []);
      setMedColor(draft.medColor || null);
      setRideNeeded(!!draft.rideNeeded);
      setLocation(draft.location || '');
      setStep(draft.step || 0);
      setUseSpecificTime(!!draft.useSpecificTime);
    } catch (e) {
      console.warn('loadDraftFromStorage failed', e);
    }
  }

  useEffect(() => {
    loadIfEdit();
    // If caller explicitly asked to load the draft (e.g., via Set Time), populate the form
    if (route?.params?.loadDraft) {
      loadDraftFromStorage();
    }

    // Save a draft if the user navigates away with unsaved input.
    const unsub = navigation?.addListener?.('beforeRemove', async () => {
      // If already saved, nothing to do
      if (saved) return;

      // Determine if there's meaningful content to persist
      const hasContent =
        (title && title.trim().length > 0) ||
        (description && description.trim().length > 0) ||
        (attachments && Array.isArray(attachments) && attachments.length > 0);

      if (!hasContent) return;

      const draft = {
        title,
        description,
        reminderTime,
        category,
        notificationTypes,
        attachments,
        medColor,
        rideNeeded,
        location,
        step,
        useSpecificTime,
        updated_at: new Date().toISOString(),
      };

      try {
        await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        console.log('Draft auto-saved');
      } catch (err) {
        console.warn('Failed to save draft', err);
      }
    });

    return () => {
      VoiceInputService.cleanup().catch(() => {});
      if (typeof unsub === 'function') unsub();
    };
  }, [title, description, reminderTime, category, notificationTypes, attachments, medColor, rideNeeded, location, step, useSpecificTime, saved]);

  async function onSave() {
    if (!title?.trim()) {
      Alert.alert('Validation', 'Title is required');
      return;
    }
    setLoading(true);
    try {
      // Raw payload from UI
      const rawPayload = {
        title: title.trim(),
        description: description.trim(),
        reminder_time: reminderTime,
        category,
        notification_types: notificationTypes,
        // UI uses repeat_frequency as legacy field; keep for traceability
        repeat_frequency: 'none',
        notify_before_minutes: 0,
        // Store optional details under metadata so they never block saving (Story 2.6)
        metadata: {
          attachments: (attachments || []).map((a) => a.uri || a).filter(Boolean),
          medication_color: medColor || null,
          location: location || null,
          needs_ride: !!rideNeeded,
        },
      };
 
      // Use DefaultsEngine to resolve schedule / repeat / notification defaults
      const normalized = await DefaultsEngine.resolveDefaults(rawPayload);
 
      // Appointment conflict detection (Story 3.4)
      // If this is an appointment with a specific time, check for overlapping appointments
      const sched = normalized.schedule || {};
      if ((normalized.category === 'appointments' || category === 'appointments') && sched.type === 'specific' && sched.time) {
        try {
          const apptDate = new Date(sched.time);
          if (!isNaN(apptDate.getTime())) {
            // Define overlap window (30 minutes before and after appointment time)
            const windowMinutes = 30;
            const lower = new Date(apptDate.getTime() - windowMinutes * 60000).toISOString();
            const upper = new Date(apptDate.getTime() + windowMinutes * 60000).toISOString();
 
            // Query existing appointment reminders in the time window, excluding the current edited id (if any)
            let query = supabase
              .from('reminders')
              .select('*')
              .eq('category', 'appointments')
              .gte('reminder_time', lower)
              .lte('reminder_time', upper)
              .eq('is_deleted', false);
 
            if (editingId) {
              query = query.neq('id', editingId);
            }
 
            const { data: conflicts, error: conflictErr } = await query;
            if (conflictErr) {
              console.warn('Conflict detection query failed', conflictErr);
            } else if (Array.isArray(conflicts) && conflicts.length > 0) {
              // Gentle prompt: allow user to Adjust / Save Anyway / Cancel
              const msg = `This appointment overlaps with ${conflicts.length} existing appointment(s). You can adjust the time, cancel, or save anyway.`;
              // Alert.alert is callback-based; wrap in a Promise so we can await the user's decision.
              const decision = await new Promise((resolve) => {
                Alert.alert('Possible conflict', msg, [
                  {
                    text: 'Adjust time',
                    onPress: () => resolve('adjust'),
                  },
                  {
                    text: 'Save anyway',
                    onPress: () => resolve('save'),
                    style: 'destructive',
                  },
                  {
                    text: 'Cancel',
                    onPress: () => resolve('cancel'),
                    style: 'cancel',
                  },
                ], { cancelable: true });
              });
 
              if (decision === 'adjust') {
                // Bring user back to the When step with specific time enabled
                setStep(2);
                setUseSpecificTime(true);
                // Ensure the time input reflects the normalized scheduled time so user can edit it
                setReminderTime(sched.time);
                setLoading(false);
                return;
              } else if (decision === 'cancel') {
                setLoading(false);
                return;
              }
              // If decision === 'save', continue to persist as before.
            }
          }
        } catch (e) {
          console.warn('Appointment conflict detection failed', e);
          // best-effort: allow save to proceed
        }
      }
 
      // Map normalized result to DB-friendly payload
      const dbPayload = {
        title: normalized.title || rawPayload.title,
        description: normalized.description || rawPayload.description,
        category: normalized.category || rawPayload.category,
        notification_types: normalized.notification_types || rawPayload.notification_types,
        notify_before_minutes: normalized.notify_before_minutes || rawPayload.notify_before_minutes || 0,
        metadata: normalized.metadata || rawPayload.metadata,
        // Repeat/frequency
        repeat_frequency: (normalized.repeat && normalized.repeat.frequency_type) || 'none',
      };
 
      // Schedule fields:
      // - If schedule.type === 'specific' we persist reminder_time as ISO datetime
      // - If schedule.type === 'routine' persist routine token and set routine_anchor column
      // - If unspecified (should be resolved by DefaultsEngine to a specific time via Next Slot Rule),
      //   we attempt to persist reminder_time when available.
      if (sched.type === 'specific' && sched.time) {
        dbPayload.reminder_time = sched.time;
      } else if (sched.type === 'routine' && sched.anchor) {
        // Keep both the token and a dedicated routine_anchor column for rescheduling logic
        dbPayload.reminder_time = `routine:${sched.anchor.toLowerCase()}`;
        dbPayload.routine_anchor = sched.anchor;
      } else if (sched.type === 'unspecified' && sched.raw) {
        // store raw fallback
        dbPayload.reminder_time = sched.raw;
      } else if (sched.resolved_by === 'next_slot_rule' && sched.time) {
        dbPayload.reminder_time = sched.time;
        if (sched.resolved_anchor) dbPayload.routine_anchor = sched.resolved_anchor;
      } else {
        // final fallback: use raw UI field if present
        dbPayload.reminder_time = rawPayload.reminder_time || new Date().toISOString();
      }
 
      let saved;
      if (editingId) {
        saved = await ReminderService.update(editingId, dbPayload);
      } else {
        saved = await ReminderService.create(dbPayload);
      }
 
      // If this is a freshly-created appointment, create default buffer reminders (e.g., 2 hours and 1 day before)
      try {
        const isAppointment = (normalized && normalized.category === 'appointments') || dbPayload.category === 'appointments';
        const buffers = normalized && normalized.metadata && Array.isArray(normalized.metadata.buffers)
          ? normalized.metadata.buffers
          : (dbPayload.metadata && Array.isArray(dbPayload.metadata.buffers) ? dbPayload.metadata.buffers : null);
 
        if (!editingId && isAppointment && buffers && saved && saved.id) {
          const apptIso = dbPayload.reminder_time;
          if (apptIso) {
            for (const minutesBeforeRaw of buffers) {
              const minutesBefore = Number(minutesBeforeRaw);
              if (!Number.isFinite(minutesBefore) || minutesBefore <= 0) continue;
              try {
                const apptDate = new Date(apptIso);
                if (isNaN(apptDate.getTime())) continue;
                const bufferDate = new Date(apptDate.getTime() - minutesBefore * 60000);
                // Avoid creating buffer reminders in the past
                if (bufferDate.getTime() <= Date.now()) continue;
 
                const bufferPayload = {
                  title: saved.title ? `${saved.title} — Reminder` : 'Appointment Reminder',
                  description: saved.description || '',
                  category: 'appointments',
                  notification_types: saved.notification_types || ['push'],
                  notify_before_minutes: 0,
                  metadata: {
                    ...((saved.metadata && typeof saved.metadata === 'object') ? saved.metadata : {}),
                    buffer_for: saved.id,
                    buffer_minutes: minutesBefore,
                    is_buffer: true,
                  },
                  repeat_frequency: 'none',
                  reminder_time: bufferDate.toISOString(),
                };
 
                try {
                  const createdBuf = await ReminderService.create(bufferPayload);
                  // Schedule local notification for the buffer (best-effort)
                  if (createdBuf) {
                    await scheduleLocalNotification(createdBuf);
                  }
                } catch (createErr) {
                  console.warn('Failed to create buffer reminder', createErr);
                }
              } catch (innerErr) {
                console.warn('Error creating buffer reminder for minutesBefore=', minutesBeforeRaw, innerErr);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Buffer creation flow failed', e);
      }
  
      // Schedule local notification for the original reminder (hook into ReminderScheduler later)
      await scheduleLocalNotification(saved);

      // Remove any saved draft (we've persisted the real reminder)
      try {
        await AsyncStorage.removeItem(DRAFT_KEY);
      } catch (e) {
        console.warn('Failed to remove draft after save', e);
      }
      setSaved(true);

      navigation?.goBack?.();
    } catch (err) {
      console.error('onSave', err);
      Alert.alert('Error', 'Could not save reminder.');
    } finally {
      setLoading(false);
    }
  }

  async function onVoiceInput() {
    try {
      setVoiceError(null);

      if (!isRecording) {
        // Initialize permissions and audio session
        const ok = await VoiceInputService.initialize();
        if (!ok) {
          setVoiceError('Microphone permission not granted');
          Alert.alert('Voice Input', 'Microphone permission not granted.');
          return;
        }

        setIsRecording(true);

        // Start recording and provide callbacks
        VoiceInputService.startRecording(
          // onResult: transcription text
          (transcribedText) => {
            if (!transcribedText) return;
            setTitle((prev) => {
              const trimmed = transcribedText.trim();
              if (!trimmed) return prev || '';
              if (prev && prev.trim().length > 0) {
                return `${prev} ${trimmed}`;
              }
              return trimmed;
            });
          },
          // onError
          (err) => {
            console.error('VoiceInputService error:', err);
            const msg = err?.message || String(err);
            setVoiceError(msg);
            Alert.alert('Voice Input Error', msg);
            setIsRecording(false);
          },
          // onStatus (optional)
          (status) => {
            // If the service reports recording finished, update UI state defensively
            if (status?.isRecording === false && isRecording) {
              setIsRecording(false);
            }
          }
        );
      } else {
        // Stop recording and let service process/transcribe
        await VoiceInputService.stopRecording();
        setIsRecording(false);
      }
    } catch (err) {
      console.error('onVoiceInput error', err);
      Alert.alert('Voice Input', 'An error occurred while capturing voice.');
      setIsRecording(false);
    }
  }

  async function pickFromLibrary() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow photo library access in settings.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
      });
      if (!result.cancelled) {
        setAttachments((prev) => [...prev, { uri: result.uri }]);
      }
    } catch (err) {
      console.error('pickFromLibrary error', err);
      Alert.alert('Attachment', 'Could not pick image.');
    }
  }

  async function takePhoto() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow camera access in settings.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
      });
      if (!result.cancelled) {
        setAttachments((prev) => [...prev, { uri: result.uri }]);
      }
    } catch (err) {
      console.error('takePhoto error', err);
      Alert.alert('Attachment', 'Could not take photo.');
    }
  }

  async function onAddAttachment() {
    // Provide simple choice: Camera or Library
    Alert.alert('Add Photo', 'Choose source', [
      { text: 'Camera', onPress: takePhoto },
      { text: 'Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // Card-based progressive disclosure flow (Story 2.3)
  const [step, setStep] = useState(0);
  const [useSpecificTime, setUseSpecificTime] = useState(false);
  const steps = ['What', 'Category', 'When', 'Details'];
  
  function nextStep() {
    setStep((s) => Math.min(s + 1, steps.length - 1));
  }
  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{editingId ? 'Edit Reminder' : 'New Reminder'}</Text>

      <View style={styles.cardContainer}>
        {/* Step indicator */}
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle}>{steps[step]}</Text>
          <Text style={styles.stepCounter}>{`${step + 1} / ${steps.length}`}</Text>
        </View>

        {/* Card content */}
        <View style={styles.card}>
          {step === 0 && (
            // "What" card - primary forgiving input
            <View>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="What is this for?"
                style={[styles.input, { fontSize: 18, fontWeight: '600' }]}
                maxLength={100}
              />
              <View style={{ height: 8 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={onVoiceInput}
                  style={[
                    styles.micButton,
                    isRecording ? styles.micButtonRecording : null
                  ]}
                  accessibilityLabel={isRecording ? 'Stop voice capture' : 'Start voice capture'}
                  hitSlop={hitSlopFor(42)}
                >
                  <Ionicons name={isRecording ? 'stop' : 'mic'} size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.smallHint}>Tip: You can save now and add details later.</Text>
              </View>
            </View>
          )}

          {step === 1 && (
            // "Category" card - chips with icons and inline behavior
            <View>
              <Text style={styles.label}>Category</Text>
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                {[
                  { key: 'important_dates', label: 'Important dates', icon: 'calendar' },
                  { key: 'medications', label: 'Medication', icon: 'medkit' },
                  { key: 'appointments', label: 'Appointment', icon: 'time' },
                  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
                ].map((c) => (
                  <TouchableOpacity
                    key={c.key}
                    onPress={() => {
                      // selecting a category updates state and will change subsequent cards inline
                      setCategory(c.key);
                      // Reset specific-time toggle whenever category changes
                      setUseSpecificTime(false);
                    }}
                    style={[styles.pill, c.key === category && styles.pillActive]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name={c.icon} size={16} color={c.key === category ? '#fff' : '#374151'} />
                      <Text style={c.key === category ? styles.pillTextActive : styles.pillText}>{c.label}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.smallHint}>Tip: Choosing a category updates the When/Details options below.</Text>
            </View>
          )}

          {step === 2 && (
            // "When" card - conditional UI based on selected category (inline changes per Story 2.4 / 2.5)
            <View>
              <Text style={styles.label}>When</Text>
  
              {category === 'important_dates' ? (
                // Important dates keep a simple date input
                <>
                  <Text style={styles.smallHint}>Important date — set a calendar date</Text>
                  <TextInput
                    value={reminderTime}
                    onChangeText={setReminderTime}
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                  />
                </>
              ) : (
                // For other categories we default to routine tiles. Appointments get a "Set specific time" toggle.
                <>
                  <Text style={styles.smallHint}>
                    {category === 'appointments'
                      ? 'Appointment — pick a routine anchor or set a specific date & time'
                      : category === 'medications'
                      ? 'Medication — choose a routine anchor or provide a time'
                      : 'Default — choose a routine anchor or specific time'}
                  </Text>
  
                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    {['Breakfast', 'Lunch', 'Dinner', 'Bedtime'].map((a) => (
                      <TouchableOpacity
                        key={a}
                        onPress={() => {
                          // mark the reminderTime with a routine token; scheduling engine can translate this token later.
                          setReminderTime(`routine:${a.toLowerCase()}`);
                          setUseSpecificTime(false);
                        }}
                        style={[styles.pill, reminderTime === `routine:${a.toLowerCase()}` && styles.pillActive]}
                      >
                        <Text style={reminderTime === `routine:${a.toLowerCase()}` ? styles.pillTextActive : styles.pillText}>{a}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
  
                  {/* Appointment-specific toggle to enable specific time entry */}
                  {category === 'appointments' && (
                    <TouchableOpacity onPress={() => setUseSpecificTime((v) => !v)} style={{ marginBottom: 8 }}>
                      <Text style={{ color: '#4f46e5', fontWeight: '600' }}>{useSpecificTime ? 'Use routine anchor' : 'Set specific time'}</Text>
                    </TouchableOpacity>
                  )}
  
                  {useSpecificTime ? (
                    // Specific time entry (ISO) shown when toggled on for appointments (or when user switches)
                    <>
                      <TextInput
                        value={reminderTime && !reminderTime.startsWith('routine:') ? reminderTime : ''}
                        onChangeText={setReminderTime}
                        style={styles.input}
                        placeholder={category === 'appointments' ? 'YYYY-MM-DDTHH:MM:SSZ' : 'HH:MM or ISO time (optional)'}
                      />
                      <View style={{ height: 8 }} />
                      <TouchableOpacity onPress={() => { setReminderTime(new Date().toISOString()); }} style={styles.quickBtn}>
                        <Text style={styles.quickBtnText}>Use now</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    // Routine-selected view still allows optional manual time entry (non-specific)
                    <>
                      <TextInput
                        value={reminderTime && !reminderTime.startsWith('routine:') ? reminderTime : ''}
                        onChangeText={setReminderTime}
                        style={styles.input}
                        placeholder="HH:MM or ISO time (optional)"
                      />
  
                      {category === 'medications' && (
                        <>
                          <View style={{ height: 8 }} />
                          <TouchableOpacity onPress={() => setStep(3)} style={styles.quickBtn}>
                            <Text style={styles.quickBtnText}>Add medication details</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </View>
          )}

          {step === 3 && (
            // "Details" card - optional collapsible area
            <View>
              {/* Collapsible optional details (Story 2.6) */}
              <Collapsible title="Add Photo or Details (Optional)">
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Optional details (notes, location, instructions)"
                  style={[styles.input, { height: 100 }]}
                  multiline
                  maxLength={500}
                />

                {/* Attachments preview + controls */}
                <View style={{ height: 8 }} />
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TouchableOpacity onPress={onAddAttachment} style={styles.attachButton} hitSlop={hitSlopFor()}>
                    <Text style={styles.attachButtonText}>Add Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onVoiceInput} style={styles.attachButtonSecondary} hitSlop={hitSlopFor()}>
                    <Text style={{ color: '#374151', fontWeight: '600' }}>Voice</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {attachments.map((a, i) => (
                    <View key={a.uri + i} style={styles.attachmentThumb}>
                      <Image source={{ uri: a.uri }} style={{ width: 64, height: 64, borderRadius: 8 }} />
                      <TouchableOpacity onPress={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}>
                        <Text style={{ color: '#ef4444', marginTop: 4, textAlign: 'center' }}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {/* Category-specific optional fields */}
                {category === 'medications' && (
                  <>
                    <Text style={[styles.label, { marginTop: 6 }]}>Medication color (optional)</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      {['#F97316', '#EF4444', '#60A5FA', '#A78BFA', '#10B981'].map((c) => (
                        <TouchableOpacity
                          key={c}
                          onPress={() => setMedColor(c)}
                          style={[
                            { width: 36, height: 36, borderRadius: 18, backgroundColor: c, borderWidth: medColor === c ? 3 : 1, borderColor: medColor === c ? '#111827' : '#e5e7eb' },
                          ]}
                        />
                      ))}
                    </View>
                  </>
                )}

                {category === 'appointments' && (
                  <>
                    <Text style={[styles.label, { marginTop: 8 }]}>Location (optional)</Text>
                    <TextInput
                      value={location}
                      onChangeText={setLocation}
                      placeholder="Where is the appointment?"
                      style={styles.input}
                    />

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                      <TouchableOpacity onPress={() => setRideNeeded((v) => !v)} style={{ marginRight: 8 }}>
                        <View style={{
                          width: 22, height: 22, borderRadius: 4, backgroundColor: rideNeeded ? '#10b981' : '#fff', borderWidth: 1, borderColor: '#d1d5db',
                          alignItems: 'center', justifyContent: 'center'
                        }}>
                          {rideNeeded && <View style={{ width: 12, height: 12, backgroundColor: '#fff' }} />}
                        </View>
                      </TouchableOpacity>
                      <Text style={{ color: '#374151' }}>Do you need a ride?</Text>
                    </View>
                  </>
                )}
              </Collapsible>
            </View>
          )}
        </View>

        {/* Navigation footer */}
        <View style={styles.cardFooter}>
          <TouchableOpacity onPress={prevStep} disabled={step === 0} style={styles.navButton}>
            <Text style={[styles.navButtonText, step === 0 && { opacity: 0.4 }]}>Back</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {/* Save is always visible and enabled (forgiving design) */}
            <TouchableOpacity
              accessibilityRole="button"
              style={loading ? [styles.primaryButton, styles.primaryButtonDisabled] : styles.primaryButton}
              onPress={onSave}
              disabled={loading}
              hitSlop={hitSlopFor()}
            >
              <Text style={styles.primaryButtonText}>{loading ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={nextStep} disabled={step === steps.length - 1} style={styles.navButton}>
              <Text style={[styles.navButtonText, step === steps.length - 1 && { opacity: 0.4 }]}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: Accessibility.OFF_WHITE_BACKGROUND },
  header: { fontSize: 22, fontWeight: '700', color: Accessibility.DARK_TEXT },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#fff'
  },
  label: { fontSize: 12, color: '#666', marginBottom: 4 },
  smallHint: { color: '#6b7280', fontSize: 13 },
 
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
  micButton: {
    width: Accessibility.BUTTON_MIN_SIZE,
    height: Accessibility.BUTTON_MIN_SIZE,
    borderRadius: Math.ceil(Accessibility.BUTTON_MIN_SIZE / 2),
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButtonRecording: {
    backgroundColor: '#ef4444',
  },
 
  /* Card flow styles */
  cardContainer: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  stepTitle: { fontSize: 16, fontWeight: '700' },
  stepCounter: { fontSize: 12, color: '#9ca3af' },
 
  card: {
    minHeight: 120,
    paddingVertical: 8,
  },
 
  cardFooter: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
 
  navButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  navButtonText: { color: '#2563eb', fontWeight: '600' },
 
  quickBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#eef2ff',
    borderRadius: 8
  },
  quickBtnText: { color: '#4f46e5', fontWeight: '600' },
 
  primaryButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: Accessibility.BUTTON_MIN_SIZE,
    minHeight: Accessibility.BUTTON_MIN_SIZE,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
 
  snoozeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  snoozeText: { fontWeight: '600' },
});