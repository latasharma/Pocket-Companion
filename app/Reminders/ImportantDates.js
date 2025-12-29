import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Platform, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { supabase } from '@/lib/supabase';
import { VoiceInputService } from '@/lib/voiceInputService';
import { requestNotificationPermission, scheduleNotification } from '../../lib/NotificationService';

export default function ImportantDatesScreen() {
  const router = useRouter();
  const background = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    requestNotificationPermission();
    fetchImportantDates();
  }, []);

  useEffect(() => {
    importantDates.forEach((item) => {
      if (!item.date) return;
      
      const eventDate = new Date(item.date);
      
      // Check if date is valid
      if (isNaN(eventDate.getTime())) return;

      // Safety: skip past dates
      if (eventDate < new Date()) {
        return;
      }
      
      console.log('Scheduling notification for', item.title, 'at', eventDate.toString());

      scheduleNotification({
        id: `important-date-${item.id}`,
        title: 'Important Date',
        body: item.title,
        date: eventDate,
        type: 'important_date',
      });
    });
  }, [importantDates]);

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
          if (field === 'title') setTitle((t) => (t ? t + ' ' + text : text));
          else if (field === 'date') setDate((d) => (d ? d + ' ' + text : text));

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
      if (!VoiceInputService.isCurrentlyRecording()) return;
      await VoiceInputService.stopRecording();
      // onSpeechResult handler passed earlier will update the field and clear recording state
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
            if (!error) fetchImportantDates();
            else Alert.alert('Error', 'Failed to delete date');
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

        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        setTime(`${hours}:${minutes} ${ampm}`);
      } else {
        setDate(item.date);
        setTime('');
      }
    }
    setEditingId(item.id);
    setShowManualDialog(true);
    setShowVoiceForm(false);
    setShowManualForm(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !date.trim()) {
      Alert.alert('Missing fields', 'Please enter both a title and a date.');
      return;
    }

    let finalDate = date.trim();
    if (time.trim()) {
      finalDate = `${date.trim()} ${time.trim()}`;
    } else {
      // Default to 9:00 AM if no time is selected
      finalDate = `${date.trim()} 09:00 AM`;
    }
    const d = new Date(finalDate);
    if (!isNaN(d.getTime())) {
      finalDate = d.toISOString();
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const payload = {
        user_id: user.id,
        title: title.trim(),
        date: finalDate,
      };

      let error;
      if (editingId) {
        const { error: updateError } = await supabase.from('important_dates').update(payload).eq('id', editingId);
        error = updateError;
      } else {
        payload.created_at = new Date().toISOString();
        const { error: insertError } = await supabase.from('important_dates').insert([payload]);
        error = insertError;
      }

      if (error) {
        console.error('Supabase insert error', error);
        Alert.alert('Error', 'Unable to save the date.');
        return;
      }

      setTitle('');
      setDate('');
      setTime('');
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

  const onTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      let hours = selectedDate.getHours();
      const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      setTime(`${hours}:${minutes} ${ampm}`);
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
                      <ThemedText type="defaultSemiBold" style={[styles.topActionButtonText, { color: '#fff' }]}>Add Voice</ThemedText>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.topActionButton, { backgroundColor: '#10b981', marginTop: 8 }]} onPress={() => {
                    setShowManualDialog(true);
                    setTitle('');
                    setDate('');
                    setTime('');
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
                    <Ionicons name="mic" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <ThemedText style={styles.label}>Date</ThemedText>
                <View style={styles.row}>
                  <TextInput value={date} onChangeText={setDate} placeholder="MM/DD/YYYY" style={[styles.modalInput, { color: textColor, flex: 1 }]} />
                  <TouchableOpacity
                    style={[styles.micButton, isRecording && recordingField === 'date' ? styles.micRecording : null]}
                    onPress={() => (isRecording && recordingField === 'date' ? stopVoice() : startVoiceForField('date'))}
                  >
                    <Ionicons name="mic" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={[styles.saveButton, { backgroundColor: "#10b981" }]} onPress={handleSave} accessibilityLabel="Save The Date">
                  <ThemedText type="defaultSemiBold" style={[styles.saveText, { color: '#fff' }]}>{saving ? 'Saving…' : 'Save The Date'}</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowVoiceDialog(false)} accessibilityLabel="Cancel">
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
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
                    setShowTimePicker(false);
                    setShowDatePicker(!showDatePicker);
                  }}
                >
                  <Text style={{ color: date ? textColor : '#9ca3af', fontSize: 16 }}>
                    {date || 'MM/DD/YYYY'}
                  </Text>
                </TouchableOpacity>

                <ThemedText style={styles.label}>Time</ThemedText>
                <TouchableOpacity 
                  style={styles.modalInput} 
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowTimePicker(!showTimePicker);
                  }}
                >
                  <Text style={{ color: time ? textColor : '#9ca3af', fontSize: 16 }}>
                    {time || 'HH:MM AM/PM'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.saveButton, { backgroundColor: "#10b981" }]} onPress={handleSave} accessibilityLabel="Save The Date">
                  <ThemedText type="defaultSemiBold" style={[styles.saveText, { color: '#fff' }]}>{saving ? 'Saving…' : (editingId ? 'Update Date' : 'Save The Date')}</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowManualDialog(false)} accessibilityLabel="Cancel">
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Date/Time Pickers */}
            {Platform.OS === 'ios' && (showDatePicker || showTimePicker) && (
              <Modal
                transparent={true}
                animationType="slide"
                visible={showDatePicker || showTimePicker}
                onRequestClose={() => {
                  setShowDatePicker(false);
                  setShowTimePicker(false);
                }}
              >
                <View style={styles.pickerModalOverlay}>
                  <View style={styles.pickerContainer}>
                    <View style={styles.pickerHeader}>
                      <TouchableOpacity onPress={() => {
                        setShowDatePicker(false);
                        setShowTimePicker(false);
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
                    {showTimePicker && (
                      <DateTimePicker
                        value={(() => {
                          if (!time) return new Date();
                          const d = new Date();
                          try {
                            const [t, modifier] = time.split(' ');
                            let [hoursStr, minutes] = t.split(':');
                            let hours = parseInt(hoursStr, 10);
                            if (hours === 12) hours = 0;
                            if (modifier === 'PM') hours += 12;
                            d.setHours(hours, parseInt(minutes, 10));
                          } catch (e) { return new Date(); }
                          return d;
                        })()}
                        mode="time"
                        display="spinner"
                        onChange={onTimeChange}
                        style={{ backgroundColor: 'white' }}
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
            {Platform.OS === 'android' && showTimePicker && (
              <DateTimePicker
                value={(() => {
                  if (!time) return new Date();
                  const d = new Date();
                  try {
                    const [t, modifier] = time.split(' ');
                    let [hoursStr, minutes] = t.split(':');
                    let hours = parseInt(hoursStr, 10);
                    if (hours === 12) hours = 0;
                    if (modifier === 'PM') hours += 12;
                    d.setHours(hours, parseInt(minutes, 10));
                  } catch (e) { return new Date(); }
                  return d;
                })()}
                mode="time"
                display="default"
                onChange={onTimeChange}
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
  micButton: { marginBottom: 10, marginLeft: 8, backgroundColor: '#ef4444', padding: 10, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  micRecording: { backgroundColor: '#f59e0b' },
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
});
