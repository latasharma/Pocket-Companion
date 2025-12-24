import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function ShowReminderOptionsScreen() {
  const router = useRouter();

  const handleBack = () => router.back();
  const goToMedications = () => router.push('/Reminders/Medications');
  const goToAppointments = () => router.push('/Reminders/Appointments');
  const goToImportantDates = () => router.push('/Reminders/ImportantDates');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        {/* App bar - styled to match /app/chat.js header */}
        <View style={styles.appBar}>
          <TouchableOpacity onPress={handleBack} accessibilityLabel="Back" style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#10B981" />
          </TouchableOpacity>

          <ThemedText type="title" style={styles.title}>Reminder</ThemedText>

          <View style={styles.appBarRight} />
        </View>

        <View style={styles.content}>
          <ThemedText type="subtitle" style={styles.introText}>
            Choose a reminder type
          </ThemedText>

          <View style={styles.optionsGrid}>
            <TouchableOpacity
              style={styles.option}
              onPress={goToMedications}
              accessibilityRole="button"
              accessibilityLabel="Medication reminders"
            >
              <View style={styles.iconCircle}>
                <Text style={styles.emoji}>💊</Text>
              </View>
              <ThemedText type="defaultSemiBold" style={styles.optionLabel}>Medication</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={goToAppointments}
              accessibilityRole="button"
              accessibilityLabel="Appointment reminders"
            >
              <View style={styles.iconCircle}>
                <Text style={styles.emoji}>👩‍⚕️</Text>
              </View>
              <ThemedText type="defaultSemiBold" style={styles.optionLabel}>Appointments</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={goToImportantDates}
              accessibilityRole="button"
              accessibilityLabel="Important date reminders"
            >
              <View style={styles.iconCircle}>
                <Text style={styles.emoji}>🎂</Text>
              </View>
              <ThemedText type="defaultSemiBold" style={styles.optionLabel}>Important Dates</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Match app-wide background used in chat screen
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },

  // App bar styled to mirror /app/chat.js header styles
  appBar: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: { padding: 8 },
  appBarRight: { width: 32 },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },

  content: { flex: 1, marginTop: 12 },
  introText: { marginBottom: 16, color: '#6b7280', fontSize: 16 },

  // Options layout - large, easy-to-tap quick chips
  optionsGrid: { flexDirection: 'column', justifyContent: 'flex-start' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  emoji: { fontSize: 34, lineHeight: 40 },
  optionLabel: { fontSize: 18, color: '#1f2937' },
});
