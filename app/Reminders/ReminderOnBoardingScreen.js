import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Accessibility, hitSlopFor } from '../../constants/Accessibility';
import { supabase } from '../../lib/supabase';

const DRAFT_KEY = 'poco:reminder_draft';

/**
 * Reminder Command Center
 * - Page Route: `/Reminders/ReminderOnBoardingScreen.js`
 * - Implements the design in docs/Remainder-Task.md (Point 1)
 *   - Weather at top (uses user's location + open-metro)
 *   - "Now / Next" card: the single most important upcoming reminder
 *   - "Later Today": scrollable list of remaining reminders for today
 *   - Massive floating Add button bottom-right
 *
 * File: [`app/Reminders/ReminderOnBoardingScreen.js`](app/Reminders/ReminderOnBoardingScreen.js:1)
 */

export default function ReminderOnBoardingScreen({ navigation }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [doneToday, setDoneToday] = useState([]);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    const unsub = navigation?.addListener?.('focus', () => {
      loadReminders();
      fetchWeatherForLocation();
      loadDoneToday();
      loadDraft();
    });
    // initial load
    loadReminders();
    fetchWeatherForLocation();
    loadDoneToday();
    loadDraft();
    return unsub;
  }, [navigation]);

  async function loadDraft() {
    try {
      // Try to fetch a server-side draft first (best-effort)
      const { data: serverDraft, error: serverErr } = await supabase
        .from('medication_reminders')
        .select('*')
        .contains('metadata', { draft: true })
        .eq('is_deleted', false)
        .order('updated_at', { ascending: false })
        .maybeSingle();

      if (serverErr) {
        console.warn('loadDraft: supabase error', serverErr);
      }

      if (serverDraft && serverDraft.id) {
        setDraft(serverDraft);
        return;
      }

      // Fallback to local AsyncStorage draft
      const raw = await AsyncStorage.getItem(DRAFT_KEY);
      if (!raw) {
        setDraft(null);
        return;
      }
      const parsed = JSON.parse(raw);
      // Attach a local-only marker so UI can handle it similarly
      setDraft({ ...parsed, _localOnly: true });
    } catch (err) {
      console.warn('loadDraft failed', err);
      setDraft(null);
    }
  }

  async function deleteDraft() {
    try {
      // Remove local draft
      try {
        await AsyncStorage.removeItem(DRAFT_KEY);
      } catch (e) {
        console.warn('Failed to remove local draft', e);
      }

      // If server-side draft exists, mark it deleted so it no longer appears
      if (draft && draft.id && !draft._localOnly) {
        try {
          await supabase.from('medication_reminders').update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', draft.id);
        } catch (e) {
          console.warn('Failed to delete server draft', e);
        }
      }

      setDraft(null);
    } catch (err) {
      console.warn('deleteDraft failed', err);
      Alert.alert('Error', 'Could not delete draft.');
    }
  }

  async function loadReminders() {
    setLoading(true);
    try {
      // Select explicit columns so callers get a stable shape matching the client model
      const { data, error } = await supabase
        .from('medication_reminders')
        .select(
          `id, user_id, title, description, reminder_time, category, notification_types, notify_before_minutes, metadata, repeat_frequency, frequency_type, routine_anchor, status, is_deleted, deleted_at, created_at, updated_at`
        )
        .eq('is_deleted', false)
        .order('reminder_time', { ascending: true });

      if (error) {
        console.warn('ReminderOnBoardingScreen: supabase error', error);
        Alert.alert('Error', 'Could not load reminders.');
        setReminders([]);
      } else {
        // Ensure reminder_time remains an ISO string when present
        const normalized = Array.isArray(data)
          ? data.map((r) => ({
              ...r,
              reminder_time: r.reminder_time ? new Date(r.reminder_time).toISOString() : null,
            }))
          : [];
        setReminders(normalized);
      }
    } catch (err) {
      console.error('loadReminders failed', err);
      Alert.alert('Error', 'Could not load reminders.');
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchWeatherForLocation() {
    setWeatherLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setWeather(null);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
      const { latitude, longitude } = loc.coords;

      // open-meteo (no API key required)
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`;
      const res = await fetch(url);
      const json = await res.json();
      if (json && json.current_weather) {
        setWeather(json.current_weather);
      } else {
        setWeather(null);
      }
    } catch (err) {
      console.warn('fetchWeatherForLocation failed', err);
      setWeather(null);
    } finally {
      setWeatherLoading(false);
    }
  }

  function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  }

  // Load today's completed reminders (Done Today)
  async function loadDoneToday() {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const { data, error } = await supabase
        .from('medication_reminders')
        .select('*')
        .eq('is_deleted', false)
        .eq('status', 'taken')
        .gte('completed_at', start.toISOString())
        .lt('completed_at', end.toISOString())
        .order('completed_at', { ascending: false });

      if (error) {
        console.warn('loadDoneToday: supabase error', error);
        setDoneToday([]);
      } else {
        setDoneToday(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('loadDoneToday failed', err);
      setDoneToday([]);
    }
  }

  function getNowNextAndLater(remindersList = []) {
    const now = new Date();
    const withDates = remindersList
      .map((r) => ({ ...r, _date: r.reminder_time ? new Date(r.reminder_time) : null }))
      .filter((r) => r._date);

    // upcoming: the first reminder whose time >= now
    const upcoming = withDates.find((r) => r._date >= now) || null;

    // later today: reminders that are later today after now and not the upcoming
    const laterToday = withDates.filter((r) => {
      if (!r._date) return false;
      if (!isSameDay(r._date, now)) return false;
      if (r.id && upcoming && r.id === upcoming.id) return false;
      return r._date > now;
    });

    return { upcoming, laterToday };
  }

  const { upcoming, laterToday } = getNowNextAndLater(reminders);

  function formatTime(dateStr) {
    if (!dateStr) return 'No time set';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function onAdd() {
    router.push('/Reminders/AddReminderScreen');
  }

  function renderLaterItem({ item }) {
    return (
      <TouchableOpacity style={styles.laterItem} activeOpacity={0.85} onPress={() => router.push(`/Reminders/ReminderDetailScreen?id=${item.id}`)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.laterTitle}>{item.title || item.name || 'Untitled reminder'}</Text>
          <Text style={styles.laterSubtitle}>{item.category ? item.category : 'General'}</Text>
        </View>
        <Text style={styles.laterTime}>{formatTime(item.reminder_time)}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ backgroundColor: Accessibility.OFF_WHITE_BACKGROUND }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={hitSlopFor()}>
            <Ionicons name="arrow-back" size={24} color="#10B981" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reminders</Text>
          <View style={{ width: Accessibility.BUTTON_MIN_SIZE }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={null}>
        {/* Floating draft note (if any) - per docs: show a small card at top when user has an incomplete input */}
        {draft && (
          <View style={styles.floatingNoteCard}>
            <Text style={styles.floatingNoteTitle}>{draft.title ? `You started a note about '${String(draft.title)}'` : 'You started a reminder'}</Text>
            <Text style={styles.floatingNoteText}>Do you want to set a time?</Text>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <TouchableOpacity
                style={styles.setTimeBtn}
                onPress={() => router.push({ pathname: '/Reminders/ReminderFormScreen', params: { loadDraft: true } })}
              >
                <Text style={styles.setTimeBtnText}>Set Time</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteDraftBtn}
                onPress={async () => {
                  Alert.alert('Delete Draft', 'Delete this incomplete reminder?', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: async () => {
                        await deleteDraft();
                      }
                    }
                  ]);
                }}
              >
                <Text style={styles.deleteDraftText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Weather */}
        <View style={styles.section}>
          {weatherLoading ? (
            <ActivityIndicator size="small" color="#10b981" />
          ) : weather ? (
            <View style={styles.weatherCard}>
              <View>
                <Text style={styles.weatherTemp}>{Math.round(weather.temperature)}°C</Text>
                <Text style={styles.weatherDesc}>Current</Text>
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.weatherInfo}>Wind: {weather.windspeed} km/h</Text>
                <Text style={styles.weatherInfo}>Direction: {weather.winddirection}°</Text>
              </View>
            </View>
          ) : (
            <View style={styles.weatherPlaceholder}>
              <Ionicons name="partly-sunny" size={28} color="#60a5fa" />
              <Text style={styles.weatherPlaceholderText}>Weather not available</Text>
            </View>
          )}
        </View>

        {/* Now / Next */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Now / Next</Text>
          {loading ? (
            <ActivityIndicator size="large" color="#10b981" />
          ) : upcoming ? (
            <TouchableOpacity style={styles.upcomingCard} activeOpacity={0.9} onPress={() => router.push(`/Reminders/ReminderDetailScreen?id=${upcoming.id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.upcomingTitle}>{upcoming.title || upcoming.name || 'Untitled reminder'}</Text>
                <Text style={styles.upcomingCategory}>{upcoming.category ? upcoming.category : 'General'}</Text>
                <Text style={styles.upcomingTime}>{new Date(upcoming.reminder_time).toLocaleString()}</Text>
              </View>
              <Ionicons name="notifications" size={28} color="#10b981" />
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyNowContainer}>
              <Text style={styles.emptyNowText}>No upcoming reminders.</Text>
            </View>
          )}
        </View>

        {/* Later Today */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Later Today</Text>
          {laterToday && laterToday.length > 0 ? (
            <FlatList data={laterToday} keyExtractor={(it) => String(it.id)} renderItem={renderLaterItem} scrollEnabled={false} />
          ) : (
            <View style={styles.emptyLaterContainer}>
              <Text style={styles.emptyLaterText}>No more reminders for today.</Text>
            </View>
          )}
        </View>

        {/* Done Today */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Done Today</Text>
          {doneToday && doneToday.length > 0 ? (
            doneToday.map((d) => (
              <View key={d.id} style={styles.doneItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.doneTitle}>{d.title || d.name || d.description || 'Reminder'}</Text>
                  <Text style={styles.doneTime}>{d.completed_at ? new Date(d.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyLaterContainer}>
              <Text style={styles.emptyLaterText}>No completed items yet.</Text>
            </View>
          )}
        </View>

      </ScrollView>

      <TouchableOpacity accessibilityLabel="Add reminder" accessibilityRole="button" style={styles.fab} onPress={onAdd} hitSlop={hitSlopFor()} activeOpacity={0.9}>
        <Ionicons name="add" size={22} color="#ffffff" />
        <Text style={styles.fabLabel}>Add</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Accessibility.OFF_WHITE_BACKGROUND },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Accessibility.DARK_TEXT, textAlign: 'center', flex: 1 },

  scrollContent: { padding: 16, paddingBottom: 120 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, color: '#374151' },

  weatherCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e6eef8',
  },
  weatherTemp: { fontSize: 28, fontWeight: '700', color: '#0f172a' },
  weatherDesc: { fontSize: 14, color: '#6b7280' },
  weatherInfo: { fontSize: 12, color: '#6b7280' },
  weatherPlaceholder: { backgroundColor: '#fff', padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  weatherPlaceholderText: { marginLeft: 12, color: '#6b7280' },

  upcomingCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e6f6ea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  upcomingTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  upcomingCategory: { fontSize: 14, color: '#6b7280', marginTop: 6 },
  upcomingTime: { fontSize: 13, color: '#065f46', marginTop: 8, fontWeight: '600' },

  emptyNowContainer: { backgroundColor: '#fff', padding: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emptyNowText: { color: '#6b7280' },

  laterItem: { backgroundColor: '#fff', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#eef2ff' },
  laterTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  laterSubtitle: { fontSize: 13, color: '#6b7280' },
  laterTime: { fontSize: 13, color: '#374151', marginLeft: 12 },

  doneItem: { backgroundColor: '#fff', padding: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#e6f6ea' },
  doneTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  doneTime: { fontSize: 13, color: '#6b7280' },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    height: Accessibility.BUTTON_MIN_SIZE * 1.3,
    borderRadius: Math.ceil((Accessibility.BUTTON_MIN_SIZE * 1.3) / 2),
    alignSelf: 'flex-end',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  fabLabel: { marginLeft: 10, color: '#ffffff', fontWeight: '700', fontSize: 16 },

  /* Floating draft note styles */
  floatingNoteCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fbd38d',
  },
  floatingNoteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 6,
  },
  floatingNoteText: {
    fontSize: 13,
    color: '#92400e',
  },
  setTimeBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginTop: 6,
  },
  setTimeBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  deleteDraftBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  deleteDraftText: {
    color: '#fff',
    fontWeight: '600',
  },
});
