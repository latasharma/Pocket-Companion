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
import MedicationService from '../../lib/medicationService';

/**
 * Enhanced ReminderListScreen
 * - Fetches medications from Supabase
 * - Displays list of medications
 * - Provides "Add" button to add new medications
 * - Supports swipe-left actions to reveal Delete
 *
 * File: [`app/Reminders/ReminderListScreen.js`](app/Reminders/ReminderListScreen.js:1)
 */

export default function ReminderListScreen({ navigation }) {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(false);
  const refreshRef = useRef(null);

  /**
   * Fetch all medications from Supabase
   */
  async function loadMedications() {
    setLoading(true);
    try {
      console.log('Loading medications...');
      const data = await MedicationService.fetchMedications();
      console.log('Medications fetched:', data);
      setMedications(data || []);
    } catch (err) {
      console.error('Error loading medications:', err);
      Alert.alert('Error', 'Could not load medications.');
      setMedications([]);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Refresh medications when screen comes into focus
   */
  useEffect(() => {
    const unsub = navigation?.addListener?.('focus', () => {
      loadMedications();
    });
    loadMedications();
    return unsub;
  }, [navigation]);

  /**
   * Navigate to Add Medication screen
   */
  function onAdd() {
    router.push('/Reminders/AddMedicationScreen');
  }

  /**
   * Navigate to Edit Medication screen
   */
  function onEdit(medication) {
    router.push({
      pathname: '/Reminders/EditMedicationScreen',
      params: { medicationId: medication.id },
    });
  }

  /**
   * Delete medication with confirmation
   */
  async function onDelete(medication) {
    Alert.alert(
      'Delete Medication',
      `Are you sure you want to delete ${medication.medication_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await MedicationService.softDeleteMedication(medication.id);
              loadMedications(); // Refresh the list
              Alert.alert('Success', 'Medication deleted successfully');
            } catch (err) {
              console.error('Delete failed:', err);
              Alert.alert('Error', 'Could not delete medication.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }

  /**
   * Render right swipe actions (Edit, Delete)
   */
  function renderRightActions(medication) {
    // return () => (
    //   <View style={styles.rightActionContainer}>
    //     <TouchableOpacity
    //       style={[styles.actionButton, styles.editButton]}
    //       onPress={() => onEdit(medication)}
    //       activeOpacity={0.8}
    //     >
    //       <Ionicons name="create" size={18} color="#ffffff" />
    //       <Text style={styles.actionText}>Edit</Text>
    //     </TouchableOpacity>

    //     <TouchableOpacity
    //       style={[styles.actionButton, styles.deleteButton]}
    //       onPress={() => onDelete(medication)}
    //       activeOpacity={0.8}
    //     >
    //       <Ionicons name="trash" size={18} color="#ffffff" />
    //       <Text style={styles.actionText}>Delete</Text>
    //     </TouchableOpacity>
    //   </View>
    // );
  }

  /**
   * Format time for display
   */
  function formatDoseTimes(doseTimes) {
    if (!doseTimes || doseTimes.length === 0) return 'No times';
    return doseTimes.join(', ');
  }

  /**
   * Render individual medication item
   */
  function renderItem({ item }) {
    return (
      <Swipeable renderRightActions={renderRightActions(item)} overshootRight={false}>
        <TouchableOpacity
          style={styles.item}
          onPress={() => {
            // Navigate to detail screen if needed
            // router.push({ pathname: '/Reminders/MedicationDetail', params: { medicationId: item.id } });
          }}
        >
          <View style={styles.itemContent}>
            {/* Medication Name and Type */}
            <View style={styles.itemHeader}>
              <Text style={styles.title}>{item.medication_name}</Text>
              <Text style={styles.medicationType}>{item.medication_type}</Text>
            </View>

            {/* Dosage Information */}
            <Text style={styles.dosage}>
              Dosage: {item.dosage_value}
            </Text>

            {/* Frequency and Times */}
            <Text style={styles.frequency}>
              {item.frequency_type === 'once' ? 'Once' : item.frequency_type.charAt(0).toUpperCase() + item.frequency_type.slice(1)} ({item.times_per_day}x)
            </Text>

            {/* Dose Times */}
            <Text style={styles.doseTimes}>
              Times: {formatDoseTimes(item.dose_times)}
            </Text>

            {/* Start and End Dates */}
            <Text style={styles.dates}>
              {new Date(item.start_date).toLocaleDateString()} 
              {item.end_date ? ` - ${new Date(item.end_date).toLocaleDateString()}` : ' - Ongoing'}
            </Text>
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
          <Text style={styles.headerTitle}>Medications</Text>
          <TouchableOpacity style={styles.addButton} onPress={onAdd}>
            <Ionicons name="add" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <FlatList
        data={medications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshing={loading}
        onRefresh={loadMedications}
        contentContainerStyle={medications.length === 0 ? { flex: 1, justifyContent: 'center' } : {}}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="medkit" size={48} color="#d1d5db" />
            <Text style={styles.empty}>No medications yet.</Text>
            <Text style={styles.emptySubtext}>Tap + to add your first medication</Text>
          </View>
        }
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
    overflow: 'hidden',
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  medicationType: {
    fontSize: 12,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  dosage: {
    fontSize: 13,
    color: '#374151',
    marginTop: 4,
  },
  frequency: {
    fontSize: 13,
    color: '#374151',
    marginTop: 4,
  },
  doseTimes: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  dates: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
    fontStyle: 'italic',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  empty: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },

  /* Swipe actions */
  rightActionContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    marginRight: -16,
  },
  actionButton: {
    width: 88,
    height: '100%',
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
  actionText: {
    color: '#fff',
    marginTop: 6,
    fontWeight: '600',
  },
});