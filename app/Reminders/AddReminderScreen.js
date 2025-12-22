import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Switch, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Accessibility, hitSlopFor } from '../../constants/Accessibility';
import ReminderScheduler from '../../lib/reminderScheduler';
import RoutineAnchors from '../../lib/routineAnchors';
import * as SupabaseLib from '../../lib/supabase';
import { VoiceInputService } from '../../lib/voiceInputService';

const supabase = SupabaseLib.supabase || SupabaseLib.default || SupabaseLib;
const DRAFT_KEY = 'poco:reminder_draft';

// Small helper for ISO timestamps
const nowISO = () => new Date().toISOString();

/**
 * Add Reminder Screen
 * - Page Route: `/Reminders/AddReminderScreen.js`
 * - Header with back button and title "Add Reminder"
 * - Main content: "What" label, large text input with microphone button, three quick chips
 *
 * File: [`app/Reminders/AddReminderScreen.js`](app/Reminders/AddReminderScreen.js:1)
 */

export default function AddReminderScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [what, setWhat] = useState('');
  const [selectedChip, setSelectedChip] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [recordingStatus, setRecordingStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Keyboard accessory state
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Routine selector state
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [specificTimeEnabled, setSpecificTimeEnabled] = useState(false);
  const [specificTime, setSpecificTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Loaded routine anchor times (Breakfast/Lunch/Dinner/Bedtime) - used to display defaults on tiles
  const [anchors, setAnchors] = useState(null);

  // Helper to display HH:MM from stored HH:MM:SS
  function displayAnchorTime(hms) {
    if (!hms || typeof hms !== 'string') return '--:--';
    const parts = hms.split(':');
    if (parts.length < 2) return hms;
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const a = await RoutineAnchors.getAnchors();
        if (mounted) setAnchors(a || null);
      } catch (e) {
        console.warn('Failed to load routine anchors', e);
        if (mounted) setAnchors(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Details (optional) state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [medPhoto, setMedPhoto] = useState(null);
  const [medColor, setMedColor] = useState(null); // 'red' | 'white' | 'blue'
  const [appointmentLocation, setAppointmentLocation] = useState('');
  const [needRide, setNeedRide] = useState(false);

  useEffect(() => {
    // Cleanup voice resources when unmounting
    return () => {
      VoiceInputService.cleanup().catch(() => {});
    };
  }, []);

  // Keyboard listeners to show accessory bar
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => {
      setKeyboardVisible(true);
      const h = e?.endCoordinates?.height || 0;
      setKeyboardHeight(h);
    };
    const onHide = () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);


  function onBack() {
    router.back();
  }

  async function onMicPress() {
    try {
      // If already recording, stop and return (stop will trigger transcription pipeline)
      if (VoiceInputService.isCurrentlyRecording() || isRecording) {
        await VoiceInputService.stopRecording();
        setIsRecording(false);
        return;
      }

      setVoiceError(null);

      const ok = await VoiceInputService.initialize();
      if (!ok) {
        setVoiceError('Microphone permission not granted');
        Alert.alert('Voice Input', 'Microphone permission not granted.');
        return;
      }

      setIsRecording(true);

      // Start recording and provide callbacks
      await VoiceInputService.startRecording(
        // onResult - receives transcribed text
        (transcribedText) => {
          if (transcribedText && typeof transcribedText === 'string') {
            setWhat((prev) => (prev && prev.trim().length > 0 ? `${prev} ${transcribedText}` : transcribedText));
          }
          setIsRecording(false);
        },
        // onError
        (err) => {
          const msg = err?.message || String(err);
          setVoiceError(msg);
          Alert.alert('Voice Input Error', msg);
          setIsRecording(false);
        },
        // onStatus
        (status) => {
          setRecordingStatus(status);
        }
      );
    } catch (err) {
      console.error('onMicPress error:', err);
      const msg = err?.message || String(err);
      setVoiceError(msg);
      Alert.alert('Voice Input', msg);
      setIsRecording(false);
    }
  }

  async function onTakePhoto() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission || !permission.granted) {
        Alert.alert('Camera Permission', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      // handle different result shapes across expo-image-picker versions
      let uri = null;
      if (result?.assets && result.assets.length > 0) uri = result.assets[0].uri;
      if (!uri && result?.uri) uri = result.uri;
      if (uri) setMedPhoto(uri);
    } catch (err) {
      console.error('onTakePhoto error', err);
      Alert.alert('Photo', 'Unable to take photo.');
    }
  }

  function onSelectChip(value) {
    setSelectedChip(value);
  }

  // Persist a small draft to AsyncStorage when user navigates away unsaved - follows the pattern used by ReminderFormScreen
  useEffect(() => {
    const unsub = navigation?.addListener?.('beforeRemove', async () => {
      if (saved) return;
      const hasContent = (what && what.trim().length > 0) || (medPhoto && medPhoto.length > 0);
      if (!hasContent) return;

      const draft = {
        title: what,
        description: '',
        reminderTime: specificTimeEnabled ? specificTime.toISOString() : null,
        category: selectedChip || null,
        attachments: medPhoto ? [medPhoto] : [],
        medColor,
        rideNeeded: needRide,
        updated_at: nowISO(),
      };

      try {
        await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        console.log('AddReminder draft saved');
      } catch (e) {
        console.warn('Failed to save draft', e);
      }

      // Also persist a best-effort draft record to Supabase so it appears on the dashboard
      try {
        // Find an existing draft record (metadata.draft = true) so we update instead of creating duplicates
        const { data: existing, error: fetchErr } = await supabase
          .from('reminders')
          .select('*')
          .contains('metadata', { draft: true })
          .eq('is_deleted', false)
          .order('updated_at', { ascending: false })
          .maybeSingle();

        const now = nowISO();
        const supPayload = {
          title: draft.title || null,
          description: draft.description || '',
          category: draft.category || 'draft',
          reminder_time: draft.reminderTime || null,
          metadata: { ...(draft.metadata || {}), draft: true, source: 'autosave', attachments: draft.attachments || [] },
          status: 'draft',
          is_deleted: false,
          created_at: existing && existing.created_at ? existing.created_at : now,
          updated_at: now,
        };

        if (existing && existing.id) {
          await supabase.from('reminders').update(supPayload).eq('id', existing.id);
        } else {
          await supabase.from('reminders').insert([supPayload]);
        }
      } catch (e) {
        console.warn('Failed to save draft to supabase', e);
      }
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [what, medPhoto, specificTime, specificTimeEnabled, selectedChip, medColor, needRide, saved]);

  async function onSave() {
    // Accepting optional details never block save per acceptance criteria
    if (!what || !what.trim()) {
      Alert.alert('Validation', 'Please enter what this reminder is for.');
      return;
    }

    setLoading(true);

    try {
      // Helper: parse simple weekday words like "monday", "fri", "Friday"
      function parseWeekdayInput(text) {
        if (!text) return null;
        const weekdayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        const s = String(text).trim().toLowerCase();
        for (const name of weekdayNames) {
          if (s === name || s === name.slice(0,3)) return name;
        }
        return null;
      }

      function nextWeekdayDate(weekdayName) {
        const idx = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(weekdayName);
        if (idx < 0) return null;
        const now = new Date();
        const today = now.getDay();
        let delta = (idx - today + 7) % 7;
        if (delta === 0) delta = 7; // "this coming Friday" means next occurrence if today is Friday assume next week
        const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + delta);
        return next;
      }

      async function pickNextAnchorWhenNoTime() {
        try {
          const anchors = await RoutineAnchors.getAnchors();
          // Find the next anchor (Breakfast/Lunch/Dinner/Bedtime) whose time today is after now.
          const order = ['Breakfast','Lunch','Dinner','Bedtime'];
          const now = new Date();
          for (const key of order) {
            const timeStr = anchors[key]; // HH:MM:SS
            const parts = timeStr.split(':').map((p) => Number(p));
            const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parts[0], parts[1], parts[2] || 0, 0);
            if (candidate.getTime() > now.getTime()) {
              return { iso: candidate.toISOString(), anchor: key };
            }
          }
          // otherwise pick tomorrow's breakfast
          const b = anchors['Breakfast'].split(':').map((p) => Number(p));
          const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, b[0], b[1], b[2]||0, 0);
          return { iso: tomorrow.toISOString(), anchor: 'Breakfast' };
        } catch (e) {
          return { iso: new Date().toISOString(), anchor: null };
        }
      }

      // Build base payload with sensible defaults influenced by category
      const payload = {
        title: what.trim(),
        description: '',
        category: selectedChip || 'other',
        notification_types: ['push'],
        notify_before_minutes: 0,
        metadata: {
          attachments: medPhoto ? [medPhoto] : [],
          medication_color: medColor || null,
          location: appointmentLocation || null,
          needs_ride: needRide || false,
        },
        // provide both keys used by different subsystems
        repeat_frequency: selectedChip === 'medication' ? 'daily' : 'none',
        frequency_type: selectedChip === 'medication' ? 'daily' : null,
      };

      // Category-specific defaults and behavior
      if (selectedChip === 'medication') {
        // Defaults per spec: Repeat daily, gentle chime sound, auto-snooze hint
        payload.repeat_frequency = 'daily';
        payload.frequency_type = 'daily';
        payload.metadata.notification_sound = 'gentle_chime';
        payload.metadata._poco_tier_hint = 'T1';
        // Auto-snooze hint - scheduler picks this up where implemented
        payload.metadata.auto_snooze_minutes = 15;
      }

      if (selectedChip === 'appointment') {
        // Remind 2 hours before and also store a 1 day buffer in metadata
        payload.notify_before_minutes = 120;
        payload.metadata.reminder_buffers = [1440, 120]; // 1 day and 2 hours (in minutes)
        payload.metadata._poco_tier_hint = 'T2';
      }

      if (selectedChip === 'event') {
        // Event/Other uses "Next Slot" rule when no explicit time provided
        payload.metadata._poco_tier_hint = 'T3';
      }

      // Determine reminder_time with additional heuristics per category
      let chosenReminderTimeISO = null;

      // 1) If specific time explicitly chosen by user
      if (specificTimeEnabled && specificTime) {
        chosenReminderTimeISO = specificTime.toISOString();
      }

      // 2) If user typed a weekday-like word and category is appointment, assume coming weekday
      if (!chosenReminderTimeISO && selectedChip === 'appointment') {
        const wd = parseWeekdayInput(what.trim());
        if (wd) {
          const next = nextWeekdayDate(wd);
          if (next) {
            // default to 09:00 local time for appointments unless a routine is chosen
            next.setHours(9,0,0,0);
            chosenReminderTimeISO = next.toISOString();
            // show the assumed parsed time to user via a small alert (non-blocking)
            setTimeout(() => {
              Alert.alert('Parsed date', `Assuming this coming ${wd.charAt(0).toUpperCase()+wd.slice(1)} at 09:00.`);
            }, 200);
          }
        }
      }

      // 3) If a routine tile selected, use routine token convention
      // Store a lowercase routine token in reminder_time (e.g. 'routine:breakfast') and the
      // canonical anchor name in routine_anchor (e.g. 'Breakfast') so downstream modules
      // (routineAnchors, snoozePatterns) can operate with the expected values.
      if (!chosenReminderTimeISO && selectedRoutine) {
        const canonicalMap = {
          breakfast: 'Breakfast',
          lunch: 'Lunch',
          dinner: 'Dinner',
          bedtime: 'Bedtime',
        };
        const token = String(selectedRoutine).toLowerCase();
        const canonical = canonicalMap[token] || (token.charAt(0).toUpperCase() + token.slice(1));
        payload.reminder_time = `routine:${token}`;
        payload.routine_anchor = canonical;
      }

      // 4) Event/Other: If no time provided, pick next routine anchor
      if (!chosenReminderTimeISO && selectedChip === 'event' && !selectedRoutine && !specificTimeEnabled) {
        const picked = await pickNextAnchorWhenNoTime();
        chosenReminderTimeISO = picked.iso;
        // store helpful metadata about which anchor was used
        if (picked.anchor) payload.routine_anchor = picked.anchor;
      }

      // 5) Fallback: if still no explicit ISO chosen, use now
      if (!chosenReminderTimeISO && !payload.reminder_time) {
        chosenReminderTimeISO = new Date().toISOString();
      }

      // If we have an explicit ISO time, set it on payload
      if (chosenReminderTimeISO) {
        payload.reminder_time = chosenReminderTimeISO;
      }

      // For appointments perform a conflict check: see if another appointment exists at same time
      if (selectedChip === 'appointment' && payload.reminder_time) {
        try {
          const { data: existing, error: fetchErr } = await supabase
            .from('reminders')
            .select('*')
            .eq('reminder_time', payload.reminder_time)
            .eq('is_deleted', false)
            .limit(1)
            .maybeSingle();

          if (!fetchErr && existing && existing.id) {
            // we have a conflict — prompt the user to decide
            const existingTitle = existing.title || 'another appointment';
            // Present a synchronous choice to move the new one by 30 minutes or keep both
            const answer = await new Promise((resolve) => {
              Alert.alert(
                'Conflict detected',
                `You already have '${existingTitle}' at this time. Should we move this new appointment by 30 minutes?`,
                [
                  { text: 'Cancel', style: 'cancel', onPress: () => resolve('cancel') },
                  { text: 'Keep both', onPress: () => resolve('keep') },
                  { text: 'Move new', onPress: () => resolve('move') },
                ],
                { cancelable: true }
              );
            });

            if (answer === 'cancel') {
              setLoading(false);
              return;
            }

            if (answer === 'move') {
              // bump the chosen time by 30 minutes
              const d = new Date(payload.reminder_time);
              d.setMinutes(d.getMinutes() + 30);
              payload.reminder_time = d.toISOString();
            }
            // if 'keep', continue saving as-is
          }
        } catch (e) {
          console.warn('Appointment conflict check failed', e);
        }
      }

      // Persist to Supabase
      const insert = { ...payload, created_at: nowISO(), updated_at: nowISO() };
      const { data, error } = await supabase.from('reminders').insert([insert]).select().single();
      if (error) {
        throw error;
      }

      // Schedule local notification for this reminder (best-effort)
      try {
        await ReminderScheduler.scheduleReminder(data);
        // For appointment buffers, schedule an extra reminder 1 day before if requested
        if (selectedChip === 'appointment' && Array.isArray(payload.metadata.reminder_buffers)) {
          try {
            const bufferMins = payload.metadata.reminder_buffers[0]; // 1440
            const base = new Date(data.reminder_time);
            const notifyAt = new Date(base.getTime() - bufferMins * 60000);
            // create a lightweight follow-up notification (without creating another DB row)
            await ReminderScheduler.scheduleReminder({ ...data, reminder_time: notifyAt.toISOString() }, { overrideDate: notifyAt.toISOString() });
          } catch (e) {
            console.warn('Failed to schedule appointment buffer reminder', e);
          }
        }
      } catch (e) {
        console.warn('Failed to schedule local notification', e);
      }

      // Remove draft if any and mark saved
      try {
        await AsyncStorage.removeItem(DRAFT_KEY);
      } catch (e) {
        console.warn('Failed to remove draft', e);
      }

      setSaved(true);
      Alert.alert('Saved', 'Reminder saved successfully.');
      router.push('/Reminders/NotificationScreen');
    } catch (err) {
      console.error('onSave error', err);
      Alert.alert('Error', 'Could not save reminder.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ backgroundColor: Accessibility.OFF_WHITE_BACKGROUND }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack} hitSlop={hitSlopFor()} accessibilityLabel="Back">
            <Ionicons name="arrow-back" size={24} color="#10B981" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Reminder</Text>
          <TouchableOpacity onPress={onSave} style={styles.saveButton} accessibilityLabel="Save reminder">
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.top + 56}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()} accessible={false}>
          <View style={[
            styles.content,
            { paddingBottom: keyboardVisible && keyboardHeight > 0 ? Math.max(20, keyboardHeight - insets.bottom) : 20 },
          ]}>
          <Text style={styles.label}>What</Text>
          <View style={styles.inputRow}>
            <TextInput
              value={what}
              onChangeText={setWhat}
              placeholder="What is this for?"
              placeholderTextColor="#6b7280"
              style={styles.textInput}
              multiline
              numberOfLines={3}
              accessibilityLabel="What is this for"
              autoCorrect={false}
              spellCheck={false}
            />

            <TouchableOpacity
              style={[styles.micButton, isRecording && { borderColor: '#ef4444', backgroundColor: '#fff6f6' }]}
              onPress={onMicPress}
              hitSlop={hitSlopFor()}
              accessibilityLabel={isRecording ? 'Stop recording' : 'Record reminder via voice'}
              accessibilityRole="button"
            >
              {isRecording ? (
                <Ionicons name="stop" size={28} color="#ef4444" />
              ) : (
                <Ionicons name="mic-outline" size={28} color="#10b981" />
              )}
            </TouchableOpacity>
          </View>

          {isRecording && recordingStatus && (
            <View style={{ paddingHorizontal: 2, paddingTop: 8 }}>
              <Text style={{ color: '#ef4444' }}>Recording...</Text>
            </View>
          )}

          <View style={styles.chipsRow}>
            <TouchableOpacity
              style={[styles.chip, selectedChip === 'medication' && styles.chipSelected]}
              onPress={() => onSelectChip('medication')}
              accessibilityLabel="Medication"
            >
              <Ionicons name="medkit-outline" size={28} color={selectedChip === 'medication' ? '#ffffff' : '#10b981'} />
              <Text style={[styles.chipLabel, selectedChip === 'medication' && styles.chipLabelSelected]}>Medication</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, selectedChip === 'appointment' && styles.chipSelected]}
              onPress={() => onSelectChip('appointment')}
              accessibilityLabel="Appointment"
            >
              <Ionicons name="people-outline" size={28} color={selectedChip === 'appointment' ? '#ffffff' : '#10b981'} />
              <Text style={[styles.chipLabel, selectedChip === 'appointment' && styles.chipLabelSelected]}>Appointment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, selectedChip === 'event' && styles.chipSelected]}
              onPress={() => onSelectChip('event')}
              accessibilityLabel="Event or other"
            >
              <Ionicons name="calendar-outline" size={28} color={selectedChip === 'event' ? '#ffffff' : '#10b981'} />
              <Text style={[styles.chipLabel, selectedChip === 'event' && styles.chipLabelSelected]}>Event / Other</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.smartUI}>
            {selectedChip === 'medication' && <Text style={styles.smartText}>Medication selected — you will be prompted for dosage and frequency later.</Text>}
            {selectedChip === 'appointment' && <Text style={styles.smartText}>Appointment selected — you will be prompted for location and contact details later.</Text>}
            {selectedChip === 'event' && <Text style={styles.smartText}>Event selected — you will be prompted for date/time and notes later.</Text>}
          </View>

          {/* Routine selector */}
          <View style={styles.routineContainer}>
            <TouchableOpacity style={[styles.routineTile, selectedRoutine === 'breakfast' && styles.routineTileSelected]} onPress={() => setSelectedRoutine('breakfast')} accessibilityLabel="Breakfast">
              <Text style={[styles.routineLabel, selectedRoutine === 'breakfast' && styles.routineLabelSelected]}>🌅</Text>
              <Text style={[styles.routineText, selectedRoutine === 'breakfast' && styles.routineTextSelected]}>Breakfast</Text>
              <Text style={styles.routineTime}>{displayAnchorTime(anchors?.Breakfast)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.routineTile, selectedRoutine === 'lunch' && styles.routineTileSelected]} onPress={() => setSelectedRoutine('lunch')} accessibilityLabel="Lunch">
              <Text style={[styles.routineLabel, selectedRoutine === 'lunch' && styles.routineLabelSelected]}>☀️</Text>
              <Text style={[styles.routineText, selectedRoutine === 'lunch' && styles.routineTextSelected]}>Lunch</Text>
              <Text style={styles.routineTime}>{displayAnchorTime(anchors?.Lunch)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.routineTile, selectedRoutine === 'dinner' && styles.routineTileSelected]} onPress={() => setSelectedRoutine('dinner')} accessibilityLabel="Dinner">
              <Text style={[styles.routineLabel, selectedRoutine === 'dinner' && styles.routineLabelSelected]}>🌙</Text>
              <Text style={[styles.routineText, selectedRoutine === 'dinner' && styles.routineTextSelected]}>Dinner</Text>
              <Text style={styles.routineTime}>{displayAnchorTime(anchors?.Dinner)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.routineTile, selectedRoutine === 'bedtime' && styles.routineTileSelected]} onPress={() => setSelectedRoutine('bedtime')} accessibilityLabel="Bedtime">
              <Text style={[styles.routineLabel, selectedRoutine === 'bedtime' && styles.routineLabelSelected]}>🛏️</Text>
              <Text style={[styles.routineText, selectedRoutine === 'bedtime' && styles.routineTextSelected]}>Bedtime</Text>
              <Text style={styles.routineTime}>{displayAnchorTime(anchors?.Bedtime)}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => {
              setSpecificTimeEnabled(prev => !prev);
              if (Platform.OS === 'android') {
                setShowTimePicker(prev => !prev);
              }
            }} style={{ marginTop: 12 }}>
            <Text style={styles.toggleLink}>{specificTimeEnabled ? 'Unset specific time' : 'Set specific time'}</Text>
          </TouchableOpacity>

          {specificTimeEnabled && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.timeText}>Selected time: {specificTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              {showTimePicker && (
                <DateTimePicker
                  value={specificTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, newDate) => {
                    // for android, event.type === 'set' when user confirms
                    if (Platform.OS === 'android') {
                      setShowTimePicker(false);
                      if (event?.type === 'set' && newDate) {
                        setSpecificTime(newDate);
                      }
                      return;
                    }
                    if (newDate) {
                      setSpecificTime(newDate);
                    }
                  }}
                  minuteInterval={1}
                />
              )}
              {Platform.OS === 'ios' ? null : !showTimePicker && (
                <TouchableOpacity onPress={() => setShowTimePicker(true)} style={{ marginTop: 8 }}>
                  <Text style={styles.toggleLink}>Choose time</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Details (Optional) - implemented per docs: collapsible section that never blocks Save */}
          {/* Hide the optional details card when Event / Other is selected (docs: "When Event / Other is selected just hide this whole \"Optional details\" card.") */}
          {selectedChip !== 'event' && (
            <>
              <TouchableOpacity
                style={styles.detailsHeader}
                onPress={() => setDetailsOpen((prev) => !prev)}
                accessibilityRole="button"
              >
                <Text style={styles.detailsTitle}>Add Photo or Details (Optional)</Text>
                <Ionicons name={detailsOpen ? 'chevron-up' : 'chevron-down'} size={22} color="#374151" />
              </TouchableOpacity>

              {detailsOpen && (
                <View style={styles.detailsCard}>
                  {/* Medication details: camera capture + store photo reference; color swatches. */}
                  {selectedChip === 'medication' && (
                    <>
                      <Text style={styles.subLabel}>Medication</Text>

                      {/* Camera capture — store the returned URI in medPhoto (reference only, never required to save) */}
                      <TouchableOpacity
                        style={styles.photoButton}
                        onPress={onTakePhoto}
                        accessibilityLabel="Take a photo of the pill or bottle"
                      >
                        <Ionicons name="camera" size={20} color="#fff" />
                        <Text style={styles.photoButtonText}>Take a photo of the pill / bottle</Text>
                      </TouchableOpacity>

                      {/* Preview the captured photo when available */}
                      {medPhoto ? (
                        <Image source={{ uri: medPhoto }} style={styles.photoPreview} />
                      ) : null}

                      <Text style={[styles.subLabel, { marginTop: 12 }]}>Color</Text>
                      <View style={styles.colorSwatches}>
                        <TouchableOpacity
                          style={[styles.colorSwatch, { backgroundColor: '#ef4444' }, medColor === 'red' && styles.colorSwatchSelected]}
                          onPress={() => setMedColor('red')}
                          accessibilityLabel="Red"
                        />
                        <TouchableOpacity
                          style={[styles.colorSwatch, { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb' }, medColor === 'white' && styles.colorSwatchSelected]}
                          onPress={() => setMedColor('white')}
                          accessibilityLabel="White"
                        />
                        <TouchableOpacity
                          style={[styles.colorSwatch, { backgroundColor: '#2563eb' }, medColor === 'blue' && styles.colorSwatchSelected]}
                          onPress={() => setMedColor('blue')}
                          accessibilityLabel="Blue"
                        />
                      </View>
                    </>
                  )}

                  {/* Appointment details: free-text location; “Do you need a ride?” checkbox. */}
                  {selectedChip === 'appointment' && (
                    <>
                      <Text style={styles.subLabel}>Appointment</Text>
                      <TextInput
                        value={appointmentLocation}
                        onChangeText={setAppointmentLocation}
                        placeholder="Location (e.g., Dr. Smith's office)"
                        placeholderTextColor="#6b7280"
                        style={[styles.textInput, { minHeight: 44, marginTop: 8 }]}
                      />
                      <View style={styles.row}>
                        <Text style={{ flex: 1, fontSize: 16, color: '#111827' }}>Do you need a ride?</Text>
                        <Switch value={needRide} onValueChange={setNeedRide} />
                      </View>
                    </>
                  )}

                  {/* When no chip is selected show a friendly hint */}
                  {!selectedChip && (
                    <Text style={{ color: '#6b7280' }}>Select a context (Medication or Appointment) to see extra optional fields.</Text>
                  )}
                </View>
              )}
            </>
          )}

          {/* Voice errors shown inline but do not block saving */}
          {voiceError ? <Text style={{ color: '#dc2626', marginTop: 12 }}>{voiceError}</Text> : null}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* Keyboard accessory bar with Done button */}
      {keyboardVisible && (
        <View
          style={[
            styles.keyboardAccessory,
            {
              // Position the accessory above the keyboard. Use the keyboard height when available
              // (placing the accessory that many px above the bottom), otherwise fall back to the safe area inset.
              bottom: keyboardHeight > 0 ? keyboardHeight : insets.bottom,
            },
          ]}
        >
          <TouchableOpacity onPress={() => Keyboard.dismiss()} style={styles.doneButton} accessibilityLabel="Dismiss keyboard">
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Accessibility.OFF_WHITE_BACKGROUND },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: Accessibility.DARK_TEXT, textAlign: 'center', flex: 1 },
  saveButton: { padding: 8 },
  saveText: { color: '#10b981', fontWeight: '600' },

  content: { padding: 20 },
  label: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-start' },
  textInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    fontSize: 18,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  micButton: { marginLeft: 12, justifyContent: 'center', alignItems: 'center', width: 56, height: 56, backgroundColor: '#ffffff', borderRadius: 28, borderWidth: 1, borderColor: '#e5e7eb' },

  chipsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  chip: { flex: 1, backgroundColor: '#ffffff', paddingVertical: 16, paddingHorizontal: 12, marginHorizontal: 6, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  chipSelected: { backgroundColor: '#10b981', borderColor: '#10b981' },
  chipLabel: { marginTop: 8, fontSize: 14, color: '#10b981', fontWeight: '500', textAlign: 'center' },
  chipLabelSelected: { color: '#ffffff' },

  smartUI: { marginTop: 18 },
  smartText: { color: '#6b7280', fontSize: 14 },

  // Routine selector styles
  routineContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  routineTile: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, marginHorizontal: 6, borderRadius: 12, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb' },
  routineTileSelected: { backgroundColor: '#10b981', borderColor: '#10b981' },
  routineLabel: { fontSize: 24 },
  routineLabelSelected: { color: '#ffffff' },
  routineText: { marginTop: 6, fontSize: 14, color: '#10b981', fontWeight: '500' },
  routineTextSelected: { color: '#ffffff' },
  routineTime: { fontSize: 12, color: '#6b7280', marginTop: 4 },

  toggleLink: { color: '#2563eb', fontSize: 16, fontWeight: '600' },
  timeText: { color: '#374151', marginTop: 4 },

  // Details styles - adjusted to ensure controls do not overflow card
  detailsHeader: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailsTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  // detailsCard uses stretch and hidden overflow so inner controls stay inside the card bounds
  detailsCard: { backgroundColor: '#ffffff', padding: 12, borderRadius: 8, marginTop: 8, borderWidth: 1, borderColor: '#e5e7eb', alignSelf: 'stretch', overflow: 'hidden' },
  // Photo button constrained to its content and won't expand beyond card
  photoButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', padding: 10, borderRadius: 8, alignSelf: 'flex-start', flexShrink: 0 },
  photoButtonText: { color: '#fff', marginLeft: 8, fontWeight: '600' },
  // Preview constrained so it doesn't overflow; use max width to be safe on small screens
  photoPreview: { width: 120, height: 80, marginTop: 8, borderRadius: 8, resizeMode: 'cover' },
  // allow swatches to wrap on small widths
  colorSwatches: { flexDirection: 'row', marginTop: 8, flexWrap: 'wrap' },
  colorSwatch: { width: 36, height: 36, borderRadius: 18, marginRight: 8, borderWidth: 1, borderColor: '#e5e7eb' },
  colorSwatchSelected: { borderColor: '#111827', borderWidth: 2 },
  subLabel: { fontSize: 16, color: '#111827', fontWeight: '600' },
  // row supports wrapping and will keep controls inside card
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', marginBottom: 12 },

  // Keyboard accessory styles
  keyboardAccessory: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 12,
    zIndex: 999,
    elevation: 20,
  },
  doneButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  doneText: { color: '#fff', fontWeight: '600' },
});
