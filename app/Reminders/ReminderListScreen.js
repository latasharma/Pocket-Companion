import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SupabaseLib from '../../lib/supabase';
const supabase = SupabaseLib.supabase || SupabaseLib.default || SupabaseLib;

/**
 * Enhanced ReminderListScreen
 * - Uses app-styled AppBar
 * - Shows hardcoded reminders for testing
 * - Provides "Add" button
 * - Supports swipe-left actions to reveal Edit/Delete (using Swipeable)
 *
 * File: [`app/Reminders/ReminderListScreen.js`](app/Reminders/ReminderListScreen.js:1)
 */

const nowISO = () => new Date().toISOString();

const hardcodedReminders = [
  {
    id: 'hc-1',
    title: 'Doctor Appointment',
    description: 'Consultation with Dr. Smith',
    reminder_time: new Date(Date.now() + 3600 * 1000).toISOString(),
    category: 'appointments',
  },
  {
    id: 'hc-2',
    title: 'Take Vitamin D',
    description: 'Morning supplement',
    reminder_time: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    category: 'medications',
  },
];

const ReminderService = {
  async fetchAll() {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('is_deleted', false)
        .order('reminder_time', { ascending: true });

      if (error) {
        // If supabase not available or RLS blocks, return empty and rely on hardcoded
        console.warn('ReminderService.fetchAll: supabase error', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('ReminderService.fetchAll failed, returning empty', err);
      return [];
    }
  },
};

export default function ReminderListScreen({ navigation }) {
  const [reminders, setReminders] = useState(hardcodedReminders);
  const [loading, setLoading] = useState(false);
  const refreshRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      const data = await ReminderService.fetchAll();
      // If real data exists, show it; otherwise keep hardcoded for testing
      setReminders(data.length ? data : hardcodedReminders);
    } catch (err) {
      Alert.alert('Error', 'Could not load reminders.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsub = navigation?.addListener?.('focus', load);
    load();
    return unsub;
  }, [navigation]);

  function onAdd() {
    // Navigate to the standalone ReminderForm screen
    // Use expo-router's router so the path points directly to the file: app/Reminders/ReminderFormScreen.js
    //router.push('/Reminders/ReminderFormScreen');
    router.push('/Reminders/AddMedicationScreen');
  }
 
  function onEdit(reminder) {
    // Navigate to the form with reminderId as a param using router.push
    // expo-router accepts query params encoded into the path
    router.push({
      pathname: '/Reminders/ReminderFormScreen',
      params: { reminderId: reminder.id },
    });
  }

  async function onDelete(reminder) {
    // For hardcoded items just remove locally; for real ones call API
    if (reminder.id?.startsWith('hc-')) {
      setReminders((prev) => prev.filter((r) => r.id !== reminder.id));
      return;
    }

    try {
      await supabase.from('reminders').update({ is_deleted: true }).eq('id', reminder.id);
      // refetch
      load();
    } catch (err) {
      console.warn('delete failed', err);
      Alert.alert('Error', 'Could not delete reminder.');
    }
  }

  function renderRightActions(reminder) {
    // Simple, non-animated side-by-side action buttons.
    // Avoid transforms so buttons stay flush and visible across devices.
    return () => {
      // return (
      //   <View style={styles.rightActionContainer}>
      //     <TouchableOpacity
      //       style={[styles.actionButton, styles.editButton]}
      //       onPress={() => onEdit(reminder)}
      //       activeOpacity={0.8}
      //     >
      //       <Ionicons name="create" size={18} color="#ffffff" />
      //       <Text style={styles.actionText}>Edit</Text>
      //     </TouchableOpacity>

      //     <TouchableOpacity
      //       style={[styles.actionButton, styles.deleteButton]}
      //       onPress={() =>
      //         Alert.alert('Delete', 'Delete this reminder?', [
      //           { text: 'Cancel', style: 'cancel' },
      //           { text: 'Delete', style: 'destructive', onPress: () => onDelete(reminder) },
      //         ])
      //       }
      //       activeOpacity={0.8}
      //     >
      //       <Ionicons name="trash" size={18} color="#ffffff" />
      //       <Text style={styles.actionText}>Delete</Text>
      //     </TouchableOpacity>
      //   </View>
      // );
    };
  }

  function renderItem({ item }) {
    return (
      <Swipeable renderRightActions={renderRightActions(item)} overshootRight={false}>
        <TouchableOpacity
          style={styles.item}
          onPress={() => navigation?.navigate?.('ReminderDetail', { reminderId: item.id })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.itemMeta}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.time}>{new Date(item.reminder_time).toLocaleString()}</Text>
            </View>
            <Text style={styles.category}>{item.category}</Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ backgroundColor: '#ffffff' }}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#10B981" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reminders</Text>
          <TouchableOpacity style={styles.addButton} onPress={onAdd}>
            <Ionicons name="add" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <FlatList
        data={reminders}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={reminders.length === 0 ? { flex: 1, justifyContent: 'center' } : {}}
        ListEmptyComponent={<Text style={styles.empty}>No reminders yet.</Text>}
      />
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    flex: 1,
  },
  addButton: {
    backgroundColor: '#10b981',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    overflow: 'hidden', // clip item content so action buttons align flush
  },
  itemMeta: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: '#111827' },
  time: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  category: { fontSize: 12, color: '#9ca3af', marginLeft: 8 },
  empty: { marginTop: 24, textAlign: 'center', color: '#666' },

  /* Swipe actions: positioned so buttons are visible and responsive */
  rightActionContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    marginRight: -16, /* pull actions flush to item edge (matches item padding) */
  },
  actionButton: {
    width: 88, /* fixed width ensures side-by-side visibility */
    height: '100%', /* full height for good tap target */
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  editButton: {
    backgroundColor: '#10b981',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  actionText: { color: '#fff', marginTop: 6, fontWeight: '600' },
});