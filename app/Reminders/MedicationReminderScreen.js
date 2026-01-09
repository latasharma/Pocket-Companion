import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MedicationReminderService } from './MedicationReminderService';

/**
 * MedicationReminderScreen
 * 
 * Implements Task 4.3: Medication Reminder Confirmation Flow.
 * Displays medication details and allows the user to Take, Snooze, or Skip.
 * Any action stops the escalation logic.
 */
export default function MedicationReminderScreen() {
  const router = useRouter();
  // Expecting params passed from the notification or navigation
  const { reminderId, medicationName, dosage, scheduledTime } = useLocalSearchParams();
  
  const [snoozeModalVisible, setSnoozeModalVisible] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleTaken = async () => {
    setProcessing(true);
    try {
      await MedicationReminderService.markAsTaken(reminderId);
      Alert.alert("Success", "Medication marked as taken.");
      router.back();
    } catch (error) {
      Alert.alert("Error", "Could not update status. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSkipped = async () => {
    Alert.alert(
      "Skip Medication",
      "Are you sure you want to skip this dose?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Skip", 
          style: "destructive", 
          onPress: async () => {
            setProcessing(true);
            try {
              await MedicationReminderService.markAsSkipped(reminderId);
              router.back();
            } catch (error) {
              Alert.alert("Error", "Could not update status.");
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleSnooze = async (minutes) => {
    setSnoozeModalVisible(false);
    setProcessing(true);
    try {
      await MedicationReminderService.snoozeReminder(reminderId, minutes, { medicationName, dosage });
      Alert.alert("Snoozed", `Reminder snoozed for ${minutes} minutes.`);
      router.back();
    } catch (error) {
      Alert.alert("Error", "Could not snooze reminder.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.headerTitle}>Its time for your medication</Text>
        
        <View style={styles.card}>
          <Text style={styles.medicationName}>{medicationName || "Medication Name"}</Text>
          <Text style={styles.details}>Dosage: {dosage || "As prescribed"}</Text>
          <Text style={styles.details}>Scheduled: {scheduledTime || "Now"}</Text>
        </View>

        <View style={styles.actionContainer}>
          {/* Taken Button - Primary Action */}
          <TouchableOpacity 
            style={[styles.button, styles.takenButton]} 
            onPress={handleTaken}
            disabled={processing}
          >
            <Text style={styles.buttonText}>Taken</Text>
          </TouchableOpacity>

          {/* Snooze Button - Secondary Action */}
          <TouchableOpacity 
            style={[styles.button, styles.snoozeButton]} 
            onPress={() => setSnoozeModalVisible(true)}
            disabled={processing}
          >
            <Text style={[styles.buttonText, styles.darkText]}>Snooze</Text>
          </TouchableOpacity>

          {/* Skip Button - Tertiary Action */}
          <TouchableOpacity 
            style={[styles.button, styles.skipButton]} 
            onPress={handleSkipped}
            disabled={processing}
          >
            <Text style={styles.buttonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Snooze Options Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={snoozeModalVisible}
        onRequestClose={() => setSnoozeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Snooze for...</Text>
            {[5, 10, 15, 30, 60].map((min) => (
              <TouchableOpacity 
                key={min} 
                style={styles.modalOption} 
                onPress={() => handleSnooze(min)}
              >
                <Text style={styles.modalOptionText}>{min} Minutes</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={[styles.modalOption, styles.modalCancel]} 
              onPress={() => setSnoozeModalVisible(false)}
            >
              <Text style={styles.modalOptionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 30,
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  medicationName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 10,
    textAlign: 'center',
  },
  details: {
    fontSize: 20,
    color: '#555',
    marginBottom: 5,
  },
  actionContainer: {
    width: '100%',
    gap: 15,
  },
  button: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  takenButton: {
    backgroundColor: '#27AE60', // Green
  },
  snoozeButton: {
    backgroundColor: '#F1C40F', // Yellow
  },
  skipButton: {
    backgroundColor: '#E74C3C', // Red
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '600',
    color: 'white',
  },
  darkText: {
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    alignItems: 'center',
  },
  modalCancel: {
    borderBottomWidth: 0,
    marginTop: 10,
  },
  modalOptionText: {
    fontSize: 20,
    color: '#007AFF',
  },
});