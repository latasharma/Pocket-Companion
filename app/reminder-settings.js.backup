import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { medicationService } from '../lib/medicationService';
import { supabase } from '../lib/supabase';

export default function ReminderSettingsScreen() {
  const [alarmSound, setAlarmSound] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [phoneCall, setPhoneCall] = useState(false);
  const [vibration, setVibration] = useState(true);
  const [repeatReminders, setRepeatReminders] = useState(true);
  
  // Enhanced medication features
  const [drugInteractionCheck, setDrugInteractionCheck] = useState(true);
  const [adherenceTracking, setAdherenceTracking] = useState(true);
  const [smartReminders, setSmartReminders] = useState(true);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [interactionResult, setInteractionResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [medications, setMedications] = useState([]);
  const [adherenceReport, setAdherenceReport] = useState(null);

  const handleBack = () => {
    router.back();
  };

  const handleSaveSettings = () => {
    Alert.alert('Success', 'Reminder settings saved successfully!');
  };

  // Load user and medications
  useEffect(() => {
    loadUserAndMedications();
  }, []);

  const loadUserAndMedications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const userMedications = await medicationService.getMedications(user.id);
        setMedications(userMedications);
        
        if (adherenceTracking) {
          const report = await medicationService.getAdherenceReport(user.id);
          setAdherenceReport(report);
        }
      }
    } catch (error) {
      console.error('Error loading user and medications:', error);
    }
  };

  // Check drug interactions
  const handleCheckInteractions = async () => {
    if (medications.length < 2) {
      Alert.alert('Info', 'You need at least 2 medications to check for interactions.');
      return;
    }

    setLoading(true);
    try {
      const result = await medicationService.checkMedicationInteractions(medications);
      setInteractionResult(result);
      setShowInteractionModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to check drug interactions.');
    } finally {
      setLoading(false);
    }
  };

  // Generate smart reminder
  const handleGenerateSmartReminder = async () => {
    if (medications.length === 0) {
      Alert.alert('Info', 'No medications found. Please add medications first.');
      return;
    }

    setLoading(true);
    try {
      const medication = medications[0]; // Use first medication for demo
      const message = await medicationService.generateReminderMessage(user.id, medication);
      Alert.alert('Smart Reminder', message);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate smart reminder.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#10b981" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reminder Settings</Text>
        <TouchableOpacity onPress={handleSaveSettings} style={styles.saveButton}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Methods</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="volume-high" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Alarm Sound</Text>
                  <Text style={styles.settingSubtitle}>Play sound when reminder triggers</Text>
                </View>
              </View>
              <Switch
                value={alarmSound}
                onValueChange={setAlarmSound}
                trackColor={{ false: '#e5e7eb', true: '#10b981' }}
                thumbColor={alarmSound ? '#ffffff' : '#f3f4f6'}
              />
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Push Notifications</Text>
                  <Text style={styles.settingSubtitle}>Send notification to your device</Text>
                </View>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#e5e7eb', true: '#10b981' }}
                thumbColor={notifications ? '#ffffff' : '#f3f4f6'}
              />
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="call" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Phone Call</Text>
                  <Text style={styles.settingSubtitle}>Make a phone call for urgent reminders</Text>
                </View>
              </View>
              <Switch
                value={phoneCall}
                onValueChange={setPhoneCall}
                trackColor={{ false: '#e5e7eb', true: '#10b981' }}
                thumbColor={phoneCall ? '#ffffff' : '#f3f4f6'}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Settings</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="phone-portrait" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Vibration</Text>
                  <Text style={styles.settingSubtitle}>Vibrate device when reminder triggers</Text>
                </View>
              </View>
              <Switch
                value={vibration}
                onValueChange={setVibration}
                trackColor={{ false: '#e5e7eb', true: '#10b981' }}
                thumbColor={vibration ? '#ffffff' : '#f3f4f6'}
              />
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="repeat" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Repeat Reminders</Text>
                  <Text style={styles.settingSubtitle}>Send multiple reminders if not acknowledged</Text>
                </View>
              </View>
              <Switch
                value={repeatReminders}
                onValueChange={setRepeatReminders}
                trackColor={{ false: '#e5e7eb', true: '#10b981' }}
                thumbColor={repeatReminders ? '#ffffff' : '#f3f4f6'}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminder Timing</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="time" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Default Reminder Time</Text>
                  <Text style={styles.settingSubtitle}>15 minutes before scheduled time</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="calendar" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Reminder Frequency</Text>
                  <Text style={styles.settingSubtitle}>Daily, Weekly, or Custom</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Enhanced Medication Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Enhanced Features</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="shield-checkmark" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Drug Interaction Check</Text>
                  <Text style={styles.settingSubtitle}>AI-powered medication safety</Text>
                </View>
              </View>
              <Switch
                value={drugInteractionCheck}
                onValueChange={setDrugInteractionCheck}
                trackColor={{ false: '#e5e7eb', true: '#10b981' }}
                thumbColor={drugInteractionCheck ? '#ffffff' : '#f3f4f6'}
              />
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="analytics" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Adherence Tracking</Text>
                  <Text style={styles.settingSubtitle}>Monitor medication compliance</Text>
                </View>
              </View>
              <Switch
                value={adherenceTracking}
                onValueChange={setAdherenceTracking}
                trackColor={{ false: '#e5e7eb', true: '#10b981' }}
                thumbColor={adherenceTracking ? '#ffffff' : '#f3f4f6'}
              />
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="bulb" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Smart Reminders</Text>
                  <Text style={styles.settingSubtitle}>AI-generated personalized messages</Text>
                </View>
              </View>
              <Switch
                value={smartReminders}
                onValueChange={setSmartReminders}
                trackColor={{ false: '#e5e7eb', true: '#10b981' }}
                thumbColor={smartReminders ? '#ffffff' : '#f3f4f6'}
              />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleCheckInteractions}
              disabled={loading}
            >
              <Ionicons name="shield-checkmark" size={24} color="#ffffff" />
              <Text style={styles.actionButtonText}>
                {loading ? 'Checking...' : 'Check Drug Interactions'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleGenerateSmartReminder}
              disabled={loading}
            >
              <Ionicons name="bulb" size={24} color="#ffffff" />
              <Text style={styles.actionButtonText}>
                {loading ? 'Generating...' : 'Generate Smart Reminder'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Adherence Report */}
        {adherenceReport && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adherence Report</Text>
            <View style={styles.settingsCard}>
              <View style={styles.reportItem}>
                <Text style={styles.reportLabel}>Adherence Rate</Text>
                <Text style={styles.reportValue}>{adherenceReport.adherenceRate}%</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.reportItem}>
                <Text style={styles.reportLabel}>Medications Taken</Text>
                <Text style={styles.reportValue}>{adherenceReport.taken}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.reportItem}>
                <Text style={styles.reportLabel}>Missed Doses</Text>
                <Text style={styles.reportValue}>{adherenceReport.missed}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Drug Interaction Modal */}
      <Modal
        visible={showInteractionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowInteractionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Drug Interaction Analysis</Text>
              <TouchableOpacity onPress={() => setShowInteractionModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalText}>{interactionResult}</Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => setShowInteractionModal(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
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
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#10b981',
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 20,
  },
  bottomSpacing: {
    height: 40,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginHorizontal: 20,
    marginVertical: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  reportItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  reportLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  reportValue: {
    fontSize: 18,
    color: '#10b981',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalBody: {
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    margin: 20,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
