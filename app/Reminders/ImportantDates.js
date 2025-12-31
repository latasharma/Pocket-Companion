import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, AppState, FlatList, Modal, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { supabase } from '@/lib/supabase';
import { VoiceInputService } from '@/lib/voiceInputService';
import { cancelScheduledNotification, initializeNotificationService, scheduleNotification } from '../../lib/NotificationService';

export default function ImportantDatesScreen() {
  const router = useRouter();
  const background = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reminderType, setReminderType] = useState('24_hours');
  const [pickerDate, setPickerDate] = useState(new Date());

  const [importantDates, setImportantDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  // UI state
    const [showManualForm, setShowManualForm] = useState(false);
    const [showVoiceForm, setShowVoiceForm] = useState(false);
    const [showManualDialog, setShowManualDialog] = useState(false);
    const [showVoiceDialog, setShowVoiceDialog] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingField, setRecordingField] = useState(null); // 'title' | 'date' | null

  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);

  const reminderOptions = [
    { id: '1_week', label: '1 Week Before', icon: 'calendar' },
    { id: '24_hours', label: '24 Hours Before', icon: 'time' },
    { id: '5_minutes', label: '5 Minutes Before', icon: 'alarm' },
    { id: 'all', label: 'All of the above', icon: 'notifications' },
  ];

  useEffect(() => {
    initializeNotificationService();
    fetchImportantDates();
  }, []);

  useEffect(() => {
    if (importantDates.length === 0) return;

    importantDates.forEach((item) => {
      if (!item.date) return;
      
      const eventDate = new Date(item.date);
      
      // Check if date is valid
      if (isNaN(eventDate.getTime())) {
        console.warn(`Invalid date for item ${item.id}: ${item.date}`);
        return;
      }

      const type = item.reminder_type || '24_hours';
      const now = new Date();

      // Define time offsets
      const offsets = {
        '1_week': 7 * 24 * 60 * 60 * 1000,
        '24_hours': 24 * 60 * 60 * 1000,
        '5_minutes': 5 * 60 * 1000,
      };

      // Messages for each reminder type
      const messages = {
        '1_week': 'In 1 week',
        '24_hours': 'Tomorrow',
        '5_minutes': 'In 5 minutes',
      };

      const schedule = (reminderKey, offsetMs) => {
        const triggerDate = new Date(eventDate.getTime() - offsetMs);
        const notificationId = `important-date-${item.id}-${reminderKey}`;
        
        // Only schedule if the trigger date is in the future
        if (triggerDate > now) {
          console.log(
            `✅ Scheduling notification: "${item.title}" - ${messages[reminderKey]} (${triggerDate.toISOString()})`
          );
          
          scheduleNotification({
            id: notificationId,
            title: 'Important Date Reminder',
            body: `${messages[reminderKey]}: ${item.title}`,
            date: triggerDate,
            type: 'important_date',
            data: {
              dateId: item.id,
              dateTitle: item.title,
              originalDate: item.date,
              reminderType: reminderKey,
            },
          });
        } else {
          console.log(
            `⏭️  Skipping notification for "${item.title}" - ${reminderKey} (trigger date is in the past: ${triggerDate.toISOString()})`
          );
        }
      };

      // Schedule based on reminder type
      if (type === '1_week') {
        schedule('1_week', offsets['1_week']);
      } else if (type === '24_hours') {
        schedule('24_hours', offsets['24_hours']);
      } else if (type === '5_minutes') {
        schedule('5_minutes', offsets['5_minutes']);
      } else if (type === 'all') {
        // Schedule all three
        schedule('1_week', offsets['1_week']);
        schedule('24_hours', offsets['24_hours']);
        schedule('5_minutes', offsets['5_minutes']);
      }
    });
  }, [importantDates]);

  // 2. Add this useEffect to reschedule notifications when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  // 3. Add this handler function
  const handleAppStateChange = async (state) => {
    if (state === 'active') {
      console.log('App came to foreground - rescheduling notifications...');
      // Force re-fetch and reschedule
      await fetchImportantDates();
    }
  };

  async function fetchImportantDates() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('important_dates').select('*').order('id', { ascending: false });
      if (error) {
        console.warn('Supabase fetch importantDates error:', error);
        //Alert.alert('Error', 'Unable to fetch important dates from the database.');
      } else if (data) {
        setImportantDates(data);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }

  const handleBack = () => router.back();

  const startVoiceForField = async (field) => {
    try {
      const ok = await VoiceInputService.initialize();
      if (!ok) {
        Alert.alert('Permission required', 'Microphone permission is required to use voice input.');
        return;
      }

      setRecordingField(field);
      setIsRecording(true);

      // onResult will be called after stopRecording when transcription completes
      await VoiceInputService.startRecording(
        (text) => {
          const cleanedText = text.replace(/[.,?!;:]+$/, '');
          if (field === 'title') setTitle((t) => (t ? t + ' ' + cleanedText : cleanedText));
          else if (field === 'date') setDate((d) => (d ? d + ' ' + cleanedText : cleanedText));

          setIsRecording(false);
          setRecordingField(null);
        },
        (err) => {
          console.error('Voice error:', err);
          Alert.alert('Voice Error', 'Unable to transcribe voice input.');
          setIsRecording(false);
          setRecordingField(null);
        },
        (status) => {
          // optional: could show visual feedback
          // console.log('Recording status', status);
        }
      );
    } catch (err) {
      console.error('startVoiceForField error', err);
      Alert.alert('Error', 'Unable to start voice recording.');
      setIsRecording(false);
      setRecordingField(null);
    }
  };

  const stopVoice = async () => {
    try {
      if (VoiceInputService.isCurrentlyRecording()) {
        await VoiceInputService.stopRecording();
      } else {
        // If service isn't recording (e.g. starting up or error), force UI reset
        setIsRecording(false);
        setRecordingField(null);
      }
    } catch (err) {
      console.error('stopVoice error', err);
      Alert.alert('Error', 'Unable to stop voice recording.');
      setIsRecording(false);
      setRecordingField(null);
    }
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Date',
      'Are you sure you want to delete this important date?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('important_dates').delete().eq('id', id);
            if (!error) {
              // Cancel any scheduled notifications for this date
              await cancelScheduledNotification(`important-date-${id}-1_week`);
              await cancelScheduledNotification(`important-date-${id}-24_hours`);
              await cancelScheduledNotification(`important-date-${id}-5_minutes`);
              fetchImportantDates();
            } else {
              Alert.alert('Error', 'Failed to delete date');
            }
          },
        },
      ]
    );
  };

  const handleEdit = (item) => {
    setTitle(item.title);
    setPickerDate(new Date());
    
    if (item.date) {
      const d = new Date(item.date);
      if (!isNaN(d.getTime())) {
        setPickerDate(d);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const yyyy = d.getFullYear();
        setDate(`${mm}/${dd}/${yyyy}`);
      } else {
        setDate(item.date);
      }
    }

    setReminderType(item.reminder_type || '24_hours');
    setEditingId(item.id);
    setShowManualDialog(true);
    setShowVoiceForm(false);
    setShowManualForm(false);
  };

  const parseAndFormatDate = (dateInput) => {
    if (!dateInput || !dateInput.trim()) {
      return null;
    }

    let d;
    const input = dateInput.trim();

    // 1. Try MM/DD/YYYY format first (manual input)
    const mmDdYyyyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(input);
    if (mmDdYyyyMatch) {
      const [, month, day, year] = mmDdYyyyMatch;
      d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      if (!isNaN(d.getTime())) {
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${mm}/${dd}/${yyyy}`;
      }
    }

    // 2. Try YYYY-MM-DD format (ISO)
    const isoMatch = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(input);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      if (!isNaN(d.getTime())) {
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${mm}/${dd}/${yyyy}`;
      }
    }

    // 3. Handle voice input formats and natural language dates
    let cleanDate = input
      // Remove ordinal suffixes (st, nd, rd, th)
      .replace(/(\d+)(st|nd|rd|th)/gi, '$1')
      // Fix Indonesian month names
      .replace(/Desember/gi, 'December')
      .replace(/Januari/gi, 'January')
      .replace(/Februari/gi, 'February')
      .replace(/Maret/gi, 'March')
      .replace(/Mei/gi, 'May')
      .replace(/Juni/gi, 'June')
      .replace(/Juli/gi, 'July')
      .replace(/Agustus/gi, 'August')
      .replace(/Oktober/gi, 'October')
      .replace(/Nopember/gi, 'November')
      // Fix common typos
      .replace(/Septemebr/gi, 'September')
      .replace(/Septembr/gi, 'September');

    d = new Date(cleanDate);

    // If parsing failed, try to extract numbers and guess the format
    if (isNaN(d.getTime())) {
      const numbers = input.match(/\d+/g);
      if (numbers && numbers.length >= 3) {
        // Assume the format is likely MM/DD/YYYY or DD/MM/YYYY or YYYY/MM/DD
        // Try creating a date with different combinations
        const num1 = parseInt(numbers[0], 10);
        const num2 = parseInt(numbers[1], 10);
        const num3 = parseInt(numbers[2], 10);

        // If first number is 4 digits, it's likely the year
        if (num1 > 31) {
          d = new Date(num1, num2 - 1, num3);
        }
        // If last number is 4 digits, it's likely the year
        else if (num3 > 31) {
          // Try MM/DD/YYYY first
          d = new Date(num3, num1 - 1, num2);
          // If month is invalid, try DD/MM/YYYY
          if (d.getMonth() !== num1 - 1) {
            d = new Date(num3, num2 - 1, num1);
          }
        }
        // If second number is 4 digits, it's likely the year
        else if (num2 > 31) {
          d = new Date(num2, num1 - 1, num3);
        }
      }
    }

    // If still invalid, try Date constructor one more time with the cleaned input
    if (isNaN(d.getTime())) {
      d = new Date(cleanDate);
    }

    // If date is still invalid, return today's date as fallback
    if (isNaN(d.getTime())) {
      d = new Date();
    }

    // Format as MM/DD/YYYY
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();

    return `${mm}/${dd}/${yyyy}`;
  };

  const handleSave = async () => {
    if (!title.trim() || !date.trim()) {
      Alert.alert('Missing fields', 'Please enter both a title and a date.');
      return;
    }

    // Parse and format the date - will always return a valid date
    const formattedDate = parseAndFormatDate(date);

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const payload = {
        user_id: user.id,
        title: title.trim(),
        date: formattedDate, // Always in MM/DD/YYYY format
        reminder_type: reminderType,
      };

      console.log('Saving important date:', payload);

      let error;
      if (editingId) {
        const { error: updateError } = await supabase
          .from('important_dates')
          .update(payload)
          .eq('id', editingId);
        error = updateError;
      } else {
        payload.created_at = new Date().toISOString();
        const { error: insertError } = await supabase
          .from('important_dates')
          .insert([payload]);
        error = insertError;
      }

      if (error) {
        console.error('Supabase insert error', error);
        Alert.alert('Error', 'Unable to save the date.');
        return;
      }

      if (editingId) {
        // Cancel existing notifications before rescheduling
        await cancelScheduledNotification(`important-date-${editingId}-1_week`);
        await cancelScheduledNotification(`important-date-${editingId}-24_hours`);
        await cancelScheduledNotification(`important-date-${editingId}-5_minutes`);
      }

      // Reset form
      setTitle('');
      setDate('');
      setReminderType('24_hours');
      setEditingId(null);
      setShowManualForm(false);
      setShowVoiceForm(false);
      setShowManualDialog(false);
      setShowVoiceDialog(false);
      
      fetchImportantDates();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setPickerDate(selectedDate);
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      const yyyy = selectedDate.getFullYear();
      setDate(`${mm}/${dd}/${yyyy}`);
    }
  };


  function renderItem({ item }) {
    const formatDate = (d) => {
      if (!d) return '';
      // handle common YYYY-MM-DD or YYYY/MM/DD formats without relying on Date parsing
      const isoMatch = /^(\d{4})[-/](\d{2})[-/](\d{2})/.exec(d);
      if (isoMatch) {
        return `${isoMatch[2]}/${isoMatch[3]}/${isoMatch[1]}`;
      }

      // fallback to Date parsing for other formats
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) {
        const dd = String(parsed.getDate()).padStart(2, '0');
        const mm = String(parsed.getMonth() + 1).padStart(2, '0');
        const yyyy = parsed.getFullYear();
        return `${mm}/${dd}/${yyyy}`;
      }

      // if all else fails, return the original string
      return d;
    };

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemContent}>
          <ThemedText style={styles.itemTitle}>{item.title}</ThemedText>
          <ThemedText style={styles.itemMeta}>{formatDate(item.date)}</ThemedText>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconButton} accessibilityLabel="Edit">
            <Ionicons name="pencil" size={20} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconButton} accessibilityLabel="Delete">
            <Ionicons name="trash" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]}> 
      <ThemedView style={styles.container}>
        <View style={styles.appBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} accessibilityLabel="Back">
            <Ionicons name='arrow-back' size={24} color="#10b981" />
          </TouchableOpacity>
          <ThemedText type="title" style={styles.title}>Important Dates</ThemedText>
          <View style={styles.appBarRight} />
        </View>

        <View style={styles.listCard}>
          <FlatList
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            data={importantDates}
            keyExtractor={(i) => String(i.id)}
            renderItem={renderItem}
            ListHeaderComponent={() => (
              <>
                <View style={styles.topActions}>
                  <TouchableOpacity style={[styles.topActionButton, { backgroundColor: '#10b981' }]} onPress={() => {
                    setShowVoiceDialog(true);
                    setShowManualDialog(false);
                    setShowManualForm(false);
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="mic" size={18} color="#fff" style={{ marginRight: 8 }} />
                      <ThemedText type="defaultSemiBold" style={[styles.topActionButtonText, { color: '#fff' }]}>Voice</ThemedText>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.topActionButton, { backgroundColor: '#10b981', marginTop: 8 }]} onPress={() => {
                    setShowManualDialog(true);
                    setTitle('');
                    setDate('');
                    setReminderType('24_hours');
                    setEditingId(null);
                    setPickerDate(new Date());
                    setShowVoiceForm(false);
                    setShowManualForm(false);
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="pencil" size={18} color="#fff" style={{ marginRight: 8 }} />
                      <ThemedText type="defaultSemiBold" style={[styles.topActionButtonText, { color: '#fff' }]}>Manual</ThemedText>
                    </View>
                  </TouchableOpacity>
                </View>

                <ThemedText type="subtitle" style={[styles.sectionTitle, { color: textColor }]}>Added Important Dates</ThemedText>

              </>
            )}
            ListEmptyComponent={() => (
              loading ? (
                <ThemedText style={styles.placeholderText}>Loading...</ThemedText>
              ) : (
                <View style={styles.placeholderBox}>
                  <ThemedText style={styles.placeholderTitle}>No important dates yet</ThemedText>
                  <ThemedText style={styles.placeholderSubtitle}>You can add an important date using voice or manually</ThemedText>
                </View>
              )
            )}
            style={styles.list}
          />
        </View>

        {/* Voice / Manual forms (rendered outside the scrollable list to avoid nested VirtualizedLists) */}
        {showManualForm && (
          <View style={styles.formCard}>
            <ThemedText style={styles.formLabel}>Title</ThemedText>
            <TextInput value={title} onChangeText={setTitle} placeholder="e.g., Anniversary" style={[styles.input, { color: textColor }]} />

            <ThemedText style={styles.formLabel}>Date</ThemedText>
            <TextInput value={date} onChangeText={setDate} placeholder="MM/DD/YYYY" style={[styles.input, { color: textColor }]} />
          </View>
        )}

        {showVoiceDialog && (
          <Modal visible={showVoiceDialog} animationType="slide" transparent={true} onRequestClose={() => setShowVoiceDialog(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <ThemedText style={styles.modalTitle}>Add Important Date (Voice)</ThemedText>

                <ThemedText style={styles.label}>Title</ThemedText>
                <View style={styles.row}>
                  <TextInput value={title} onChangeText={setTitle} placeholder="e.g., Mom's Birthday" style={[styles.modalInput, { color: textColor, flex: 1 }]} />
                  <TouchableOpacity
                    style={[styles.micButton, isRecording && recordingField === 'title' ? styles.micRecording : null]}
                    onPress={() => (isRecording && recordingField === 'title' ? stopVoice() : startVoiceForField('title'))}
                  >
                    <Ionicons name={isRecording && recordingField === 'title' ? "stop" : "mic"} size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <ThemedText style={styles.label}>Date</ThemedText>
                <View style={styles.row}>
                  <TouchableOpacity
                    style={[styles.modalInput, { flex: 1 }]}
                    onPress={() => {
                      setShowDatePicker(!showDatePicker);
                    }}
                  >
                    <Text style={{ color: date ? textColor : '#9ca3af', fontSize: 16 }}>
                      {date || 'MM/DD/YYYY'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.micButton, isRecording && recordingField === 'date' ? styles.micRecording : null]}
                    onPress={() => (isRecording && recordingField === 'date' ? stopVoice() : startVoiceForField('date'))}
                  >
                    <Ionicons name={isRecording && recordingField === 'date' ? "stop" : "mic"} size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <ThemedText style={styles.label}>Remind me</ThemedText>
                <View style={styles.reminderGrid}>
                  {reminderOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.reminderOption,
                        reminderType === opt.id && styles.reminderOptionSelected
                      ]}
                      onPress={() => setReminderType(opt.id)}
                    >
                      <Ionicons name={opt.icon} size={24} color={reminderType === opt.id ? '#fff' : '#6b7280'} />
                      <Text style={[styles.reminderOptionText, reminderType === opt.id && styles.reminderOptionTextSelected]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={[styles.saveButton, { backgroundColor: "#10b981" }]} onPress={handleSave} accessibilityLabel="Save The Date">
                  <ThemedText type="defaultSemiBold" style={[styles.saveText, { color: '#fff' }]}>{saving ? 'Saving…' : 'Save The Date'}</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowVoiceDialog(false)} accessibilityLabel="Cancel">
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Date/Time Pickers */}
            {Platform.OS === 'ios' && showDatePicker && (
              <Modal
                transparent={true}
                animationType="slide"
                visible={showDatePicker}
                onRequestClose={() => {
                  setShowDatePicker(false);
                }}
              >
                <View style={styles.pickerModalOverlay}>
                  <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                      <TouchableOpacity onPress={() => {
                        setShowDatePicker(false);
                      }}>
                        <Text style={styles.pickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    {showDatePicker && (
                      <DateTimePicker
                        value={pickerDate}
                        mode="date"
                        display="spinner"
                        onChange={onDateChange}
                        style={{ backgroundColor: 'white' }}
                        minimumDate={minDate}
                      />
                    )}
                  </View>
                </View>
              </Modal>
            )}

            {Platform.OS === 'android' && showDatePicker && (
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={minDate}
              />
            )}
          </Modal>
        )}

        {showManualDialog && (
          <Modal visible={showManualDialog} animationType="slide" transparent={true} onRequestClose={() => setShowManualDialog(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <ThemedText style={styles.modalTitle}>{editingId ? 'Edit Important Date' : 'Add Important Date'}</ThemedText>

                <ThemedText style={styles.label}>Title</ThemedText>
                <TextInput value={title} onChangeText={setTitle} placeholder="e.g., Anniversary" style={[styles.modalInput, { color: textColor }]} />

                <ThemedText style={styles.label}>Date</ThemedText>
                <TouchableOpacity 
                  style={styles.modalInput} 
                  onPress={() => {
                    setShowDatePicker(!showDatePicker);
                  }}
                >
                  <Text style={{ color: date ? textColor : '#9ca3af', fontSize: 16 }}>
                    {date || 'MM/DD/YYYY'}
                  </Text>
                </TouchableOpacity>

                <ThemedText style={styles.label}>Remind me</ThemedText>
                <View style={styles.reminderGrid}>
                  {reminderOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.reminderOption,
                        reminderType === opt.id && styles.reminderOptionSelected
                      ]}
                      onPress={() => setReminderType(opt.id)}
                    >
                      <Ionicons name={opt.icon} size={24} color={reminderType === opt.id ? '#fff' : '#6b7280'} />
                      <Text style={[styles.reminderOptionText, reminderType === opt.id && styles.reminderOptionTextSelected]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={[styles.saveButton, { backgroundColor: "#10b981" }]} onPress={handleSave} accessibilityLabel="Save The Date">
                  <ThemedText type="defaultSemiBold" style={[styles.saveText, { color: '#fff' }]}>{saving ? 'Saving…' : (editingId ? 'Update Date' : 'Save The Date')}</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowManualDialog(false)} accessibilityLabel="Cancel">
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Date/Time Pickers */}
            {Platform.OS === 'ios' && showDatePicker && (
              <Modal
                transparent={true}
                animationType="slide"
                visible={showDatePicker}
                onRequestClose={() => {
                  setShowDatePicker(false);
                }}
              >
                <View style={styles.pickerModalOverlay}>
                  <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                      <TouchableOpacity onPress={() => {
                        setShowDatePicker(false);
                      }}>
                        <Text style={styles.pickerDoneText}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    {showDatePicker && (
                      <DateTimePicker
                        value={pickerDate}
                        mode="date"
                        display="spinner"
                        onChange={onDateChange}
                        style={{ backgroundColor: 'white' }}
                        minimumDate={minDate}
                      />
                    )}
                  </View>
                </View>
              </Modal>
            )}

            {Platform.OS === 'android' && showDatePicker && (
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={minDate}
              />
            )}
          </Modal>
        )}

        <View style={{ height: 24 }} />


      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  appBar: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  backButton: { padding: 8 },
  appBarRight: { width: 32 },
  title: { 
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  sectionTitle: { marginBottom: 10 },
  list: { marginBottom: 8 },
  listCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10 },
  itemCard: { 
    backgroundColor: '#fafafa', 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  itemContent: { flex: 1 },
  itemActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { padding: 4 },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  itemMeta: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  placeholderBox: { backgroundColor: '#fff', borderRadius: 12, padding: 18, alignItems: 'center' },
  placeholderTitle: { fontSize: 18, fontWeight: '600', color: '#6b7280', marginBottom: 6 },
  placeholderSubtitle: { fontSize: 14, color: '#9ca3af' },
  placeholderText: { color: '#6b7280' },
  formCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 10 },
  formLabel: { marginBottom: 6, fontSize: 16, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 16, flex: 1, backgroundColor: '#fff' },
  modalInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 16, backgroundColor: '#fff', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  micButton: { marginBottom: 10, marginLeft: 8, backgroundColor: '#10b981', padding: 10, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  micRecording: { backgroundColor: '#ef4444' },
  bottomActions: { position: 'absolute', left: 0, right: 0, bottom: 80, flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16 },
  bigButton: { flex: 1, marginHorizontal: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  bigButtonText: { fontSize: 16, fontWeight: '600' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 16, paddingHorizontal: 20 },
  saveButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  saveText: { fontSize: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 16,
  },
  modalButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  topActions: { flexDirection: 'column', alignItems: 'stretch', marginBottom: 16 },
  topActionButton: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center', width: '100%' },
  topActionButtonText: { fontSize: 16, fontWeight: '600' },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pickerDoneText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  reminderGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  reminderOption: {
    width: '48%',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  reminderOptionSelected: {
    backgroundColor: '#10b981',
    borderColor: '#059669',
  },
  reminderOptionText: {
    marginTop: 4,
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    textAlign: 'center',
  },
  reminderOptionTextSelected: {
    color: '#fff',
  },
});
