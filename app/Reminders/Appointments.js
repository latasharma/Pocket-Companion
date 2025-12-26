import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import RNCalendarEvents from 'react-native-calendar-events';
import { supabase } from '../../lib/supabase';

// Simple Appointments screen implementing the requirements from docs/reminder-redesign.md (section 5)
export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Manual entry fields
  const [title, setTitle] = useState('');
  const [datetime, setDatetime] = useState('');
  const [location, setLocation] = useState('');
  // Modal visibility for manual entry
  const [showManualDialog, setShowManualDialog] = useState(false);

  const handleBack = () => router.back();

  const uiFontFamily = Platform.select({ ios: 'AtkinsonHyperlegible', android: 'AtkinsonHyperlegible', default: undefined });

  useEffect(() => {
    fetchAppointments();
  }, []);

  async function fetchAppointments() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('appointments').select('*').order('id', { ascending: false });
      if (error) {
        console.warn('Supabase fetch appointments error:', error);
        //Alert.alert('Error', 'Unable to fetch appointments from the database.');
      } else if (data) {
        setAppointments(data);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveAppointment() {
    if (!title || !datetime) {
      Alert.alert('Missing fields', 'Please enter at least a title and date/time.');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    
    try {
      const payload = {
        user_id: user.id,
        title,
        datetime,
        location,
        created_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from('appointments').insert([payload]).select();
      if (error) {
        console.warn('Supabase insert error', error);
        Alert.alert('Error', 'Unable to save appointment.');
        return;
      }
      // refresh list and clear form
      setTitle('');
      setDatetime('');
      setLocation('');
      setShowManualDialog(false);
      fetchAppointments();
    } catch (err) {
      console.warn(err);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  }


  function getEventType(event) {
    const title = (event.title || '').toLowerCase();
    const calendarName = (event.calendar?.title || '').toLowerCase();

    // 🎂 Birthday
    if (
      event.allDay &&
      (calendarName.includes('birthday') || title.includes('birthday'))
    ) {
      return 'Birthday';
    }

    // 🏖 All-day / Holiday
    if (event.allDay) {
      return 'All Day';
    }

    // 🧑‍💼 Meeting / Call
    if (
      title.includes('meeting') ||
      title.includes('call') ||
      title.includes('sync') ||
      title.includes('standup')
    ) {
      return 'Meeting';
    }

    // 🏥 Appointment
    if (
      title.includes('doctor') ||
      title.includes('clinic') ||
      title.includes('hospital')
    ) {
      return 'Appointment';
    }

    // 📅 Default
    return 'Event';
  }



  // Try to fetch events from device calendar using expo-calendar if available.
  // This attempts to request permissions, fetch calendars and events and fill the form with the first found event.
  async function importFromCalendar() {
    try {
      // 1. Request permission
      const permission = await RNCalendarEvents.requestPermissions();

      if (permission !== 'authorized') {
        Alert.alert(
          'Permission denied',
          'Calendar permission is required to import appointments.'
        );
        return;
      }

      // 2. Define time range
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 6);

      // 3. Fetch events
      const events = await RNCalendarEvents.fetchAllEvents(
        startDate.toISOString(),
        endDate.toISOString()
      );

      if (!events.length) {
        Alert.alert('No events found');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      // 4. Map to Supabase schema
      // 4. Map to Supabase schema and deduplicate by external_event_id to avoid upsert conflicts
      const uniqueEvents = [];
      const seen = new Set();
      for (const ev of events) {
        // Prefer external event id when available; otherwise use a combination of title+startDate
        const key = ev.id ?? `${ev.title ?? ''}::${ev.startDate ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueEvents.push(ev);
      }

      const payload = uniqueEvents.map((event) => ({
        user_id: user.id,
        title: event.title || 'Untitled Event',
        datetime: event.startDate,
        location: event.location || null,
        source: 'calendar',
        external_event_id: event.id,
        event_type: getEventType(event),
        created_at: new Date().toISOString()
      }));

      // 5. Insert (use upsert to avoid duplicates)
      // Make sure we don't send multiple rows with the same (user_id, external_event_id) key —
      // that causes Postgres to attempt to update the same row multiple times in one command.
      const { error } = await supabase
        .from('appointments')
        .upsert(payload, {
          onConflict: 'user_id,external_event_id'
        });

      if (error) {
        console.error(error);
        Alert.alert('Error importing events');
        return;
      }

      Alert.alert('Success', `${payload.length} events imported`);
      fetchAppointments();

    } catch (err) {
      console.error(err);
      Alert.alert('Calendar error', 'Failed to read calendar events.');
    }
  }


  function formatDateString(datetime) {
    if (!datetime) return '';
    const d = new Date(datetime);
    if (isNaN(d.getTime())) return datetime; // fallback to original string if parsing fails
    const pad = (n) => (n < 10 ? '0' + n : String(n));
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
  }

  function getEventUI(type) {
    switch (type) {
      case 'Birthday':
        return { icon: 'gift-outline', color: '#ec4899' };

      case 'Meeting':
        return { icon: 'people-outline', color: '#3b82f6' };

      case 'Appointment':
        return { icon: 'medkit-outline', color: '#10b981' };

      case 'All Day':
        return { icon: 'sunny-outline', color: '#f59e0b' };

      default:
        return { icon: 'calendar-outline', color: '#6b7280' };
    }
  }

  function renderAppointmentItem({ item }) {
    const formattedDate = formatDateString(item.datetime);
    const { icon, color } = getEventUI(item.event_type);

    return (
      <View style={styles.appointmentCard}>
        <View style={styles.row}>
          {/* Icon + Title tightly grouped */}
          <View style={styles.titleWithIcon}>
            <Ionicons
              name={icon}
              size={18}
              color={color}
              style={styles.eventIcon}
            />
            <Text style={styles.appointmentTitle}>
              {item.title}
            </Text>
          </View>

          {/* Event type badge */}
          {item.event_type && (
            <View style={[styles.badge, { backgroundColor: `${color}20` }]}>
              <Text style={[styles.badgeText, { color }]}>
                {item.event_type}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.appointmentMeta}>{formattedDate}</Text>
        {item.location ? (
          <Text style={styles.appointmentMeta}>{item.location}</Text>
        ) : null}
      </View>
    );
  }


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} accessibilityLabel="Back">
            <Ionicons name='arrow-back' size={24} color="#10b981" />
          </TouchableOpacity>
          <ThemedText type="title" style={[styles.headerTitle, { fontFamily: uiFontFamily }]}>Appointments</ThemedText>
        </View>

        <View style={styles.content}>
          {/* Top actions: Access Calendar / Email and Manual (moved above Added Appointments) */}
          <View style={styles.topActions}>
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#10b981' }]} onPress={importFromCalendar}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="calendar" size={18} color="#fff" style={{ marginRight: 8 }} />
                <ThemedText type="defaultSemiBold" style={[styles.saveButtonText, { color: '#fff' }]}>Access Calendar</ThemedText>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: '#10b981' }]}
              onPress={() => {
                setShowManualDialog(true);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="pencil" size={18} color="#fff" style={{ marginRight: 8 }} />
                <ThemedText type="defaultSemiBold" style={[styles.saveButtonText, { color: '#fff' }]}>Manual</ThemedText>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Added Appointments</Text>

          {loading ? (
            <Text style={styles.placeholder}>Loading...</Text>
          ) : appointments && appointments.length > 0 ? (
            <FlatList
              data={appointments}
              keyExtractor={(i) => String(i.id)}
              renderItem={renderAppointmentItem}
              contentContainerStyle={styles.listContent}
              style={styles.list}
            />
          ) : (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderTitle}>No appointments yet</Text>
              <Text style={styles.placeholder}>You don’t have any saved appointments. Use the buttons below to add one.</Text>
            </View>
          )}

          {/* Manual entry is now presented in a modal dialog for better UX */}
          <Modal visible={showManualDialog} animationType="slide" transparent={true} onRequestClose={() => setShowManualDialog(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add Appointment</Text>

                <Text style={styles.label}>Title</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g., Doctor Visit" />

                <Text style={styles.label}>Date & Time</Text>
                <TextInput style={styles.input} value={datetime} onChangeText={setDatetime} placeholder="MM/DD/YYYY" />

                <Text style={styles.label}>Location</Text>
                <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g., Clinic" />

                <TouchableOpacity style={[styles.saveButton, { backgroundColor: "#10b981" }]} onPress={saveAppointment} accessibilityLabel="Save Appointment">
                  <ThemedText type="defaultSemiBold" style={[styles.saveButtonText, { color: '#fff' }]}>Save Appointment</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.cancelButton]} onPress={() => setShowManualDialog(false)} accessibilityLabel="Cancel">
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>

        {/* Bottom actions removed (buttons moved above). */}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 30,
    color: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    paddingTop: 12,
    paddingBottom: 160,
  },
  topActions: {
    flexDirection: 'column',
    alignItems: 'stretch',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  list: {
    marginBottom: 12,
  },
  listContent: {
    paddingTop: 0,
    paddingBottom: 160,
  },
  appointmentCard: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  appointmentMeta: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  placeholderContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  placeholder: {
    fontSize: 14,
    color: '#888',
  },
  form: {
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#2f95dc',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  bottomActions: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  bigButton: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  manualButton: {
    backgroundColor: '#fff',
  },
  bigButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles for manual entry
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
    shadowRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0, // prevents text overflow issues
  },

  eventIcon: {
    marginRight: 6, // tight spacing next to title
  },

  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
