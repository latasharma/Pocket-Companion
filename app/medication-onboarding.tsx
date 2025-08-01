import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function MedicationOnboardingScreen() {
  const router = useRouter();
  const [medications, setMedications] = useState([]);
  const [newMedication, setNewMedication] = useState({
    name: '',
    dosage: '',
    time: '8:00 AM',
    frequency: 'daily'
  });

  const addMedication = () => {
    if (!newMedication.name || !newMedication.dosage) {
      Alert.alert('Missing Information', 'Please fill in medication name and dosage.');
      return;
    }

    const medication = {
      id: Date.now(),
      ...newMedication
    };

    setMedications([...medications, medication]);
    setNewMedication({
      name: '',
      dosage: '',
      time: '8:00 AM',
      frequency: 'daily'
    });
  };

  const saveMedicationsToDatabase = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      console.log('Saving medications for user:', user.id);
      console.log('Medications to save:', medications);

      // Save each medication to the database
      for (const medication of medications) {
        console.log('Saving medication:', medication);
        
        const { data, error } = await supabase
          .from('user_medications')
          .insert({
            user_id: user.id,
            name: medication.name,
            dosage: medication.dosage,
            time: medication.time,
            frequency: medication.frequency,
            created_at: new Date().toISOString()
          });

        if (error) {
          console.error('Error saving medication:', error);
          Alert.alert('Database Error', `Failed to save medication: ${error.message}`);
          return;
        }
        
        console.log('Medication saved successfully:', data);
      }

      Alert.alert(
        'Setup Complete!',
        'Your medication reminders have been configured. You can manage them anytime in Settings.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/chat')
          }
        ]
      );
    } catch (error) {
      console.error('Error saving medications:', error);
      Alert.alert('Error', `Failed to save medications: ${error.message}`);
    }
  };

  const finishOnboarding = () => {
    if (medications.length === 0) {
      Alert.alert(
        'No Medications Added',
        'You haven\'t added any medications yet. Would you like to add some or skip for now?',
        [
          {
            text: 'Skip for Now',
            onPress: () => router.replace('/chat')
          },
          {
            text: 'Add Medications',
            style: 'cancel'
          }
        ]
      );
      return;
    }

    saveMedicationsToDatabase();
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#f8fafc' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 40, paddingBottom: 40 }}>
        {/* Header with Back Button */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <TouchableOpacity
            onPress={() => router.replace('/reminder-choice')}
            style={{
              padding: 8,
              marginRight: 16,
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#10b981" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{
              color: '#1f2937',
              fontWeight: 'bold',
              fontSize: 18,
            }}>
              Medication Setup
            </Text>
          </View>
        </View>

        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Image
            source={require('../assets/poco-logo.png')}
            style={{ width: 60, height: 60, resizeMode: 'contain', marginBottom: 12 }}
          />
          <Text style={{
            color: '#1f2937',
            fontWeight: 'bold',
            fontSize: 20,
            textAlign: 'center',
            marginBottom: 4,
          }}>
            Welcome to PoCo
          </Text>
          <Text style={{
            fontSize: 14,
            color: '#6b7280',
            textAlign: 'center',
            marginBottom: 4,
          }}>
            Your AI Pocket Companion
          </Text>
        </View>

        <View style={{
          backgroundColor: '#ffffff',
          borderRadius: 12,
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Ionicons name="medical" size={48} color="#10b981" />
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#374151',
              marginBottom: 8,
              textAlign: 'center',
            }}>
              Medication Reminders
            </Text>
            <Text style={{
              color: '#6b7280',
              fontSize: 14,
              textAlign: 'center',
              marginBottom: 16,
            }}>
              Set up reminders to help you remember your medications
            </Text>
          </View>

          <View style={{ marginBottom: 20 }}>
            <View style={styles.featureItem}>
              <Ionicons name="alarm" size={24} color="#10b981" />
              <Text style={styles.featureText}>Timely reminders</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="shield-checkmark" size={24} color="#10b981" />
              <Text style={styles.featureText}>Private and secure</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="notifications" size={24} color="#10b981" />
              <Text style={styles.featureText}>Voice and visual alerts</Text>
            </View>
          </View>

          <View style={{ marginBottom: 20 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#374151',
              marginBottom: 12,
            }}>
              Add Your Medications
            </Text>

            <View style={{ marginBottom: 12 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#374151',
                marginBottom: 8,
              }}>
                Medication Name
              </Text>
              <TextInput
                value={newMedication.name}
                onChangeText={(text) => setNewMedication({...newMedication, name: text})}
                placeholder="Enter medication name"
                placeholderTextColor="#9ca3af"
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: '#1f2937',
                  backgroundColor: '#ffffff',
                }}
                autoCorrect={false}
                autoComplete="off"
                spellCheck={false}
                textContentType="none"
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#374151',
                marginBottom: 8,
              }}>
                Dosage
              </Text>
              <TextInput
                value={newMedication.dosage}
                onChangeText={(text) => setNewMedication({...newMedication, dosage: text})}
                placeholder="e.g., 1 tablet, 10mg"
                placeholderTextColor="#9ca3af"
                style={{
                  borderWidth: 1,
                  borderColor: '#d1d5db',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: '#1f2937',
                  backgroundColor: '#ffffff',
                }}
                autoCorrect={false}
                autoComplete="off"
                spellCheck={false}
                textContentType="none"
              />
            </View>

            <TouchableOpacity
              style={{
                backgroundColor: '#10b981',
                borderRadius: 8,
                paddingVertical: 12,
                alignItems: 'center',
                marginBottom: 16,
              }}
              onPress={addMedication}
            >
              <Text style={{
                color: '#ffffff',
                fontSize: 16,
                fontWeight: '600',
              }}>
                Add Medication
              </Text>
            </TouchableOpacity>
          </View>

          {medications.length > 0 && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#374151',
                marginBottom: 12,
              }}>
                Your Medications
              </Text>
              {medications.map((med) => (
                <View key={med.id} style={{
                  backgroundColor: '#f3f4f6',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#374151',
                  }}>
                    {med.name} - {med.dosage}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#f3f4f6',
                borderColor: '#d1d5db',
                borderWidth: 1,
                borderRadius: 8,
                paddingVertical: 12,
                alignItems: 'center',
              }}
              onPress={() => router.replace('/chat')}
            >
              <Text style={{
                color: '#374151',
                fontSize: 16,
                fontWeight: '600',
              }}>
                Skip for Now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#10b981',
                borderRadius: 8,
                paddingVertical: 12,
                alignItems: 'center',
              }}
              onPress={finishOnboarding}
            >
              <Text style={{
                color: '#ffffff',
                fontSize: 16,
                fontWeight: '600',
              }}>
                Complete Setup
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
  },
});
