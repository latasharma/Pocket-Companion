import * as React from 'react';
import { View, Image, TouchableOpacity, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ReminderChoiceScreen() {
  const router = useRouter();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 40, paddingBottom: 40 }}>
      {/* Header with Back Button */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
        <TouchableOpacity
          onPress={() => router.back()}
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
            Reminder Setup
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
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: '#374151',
          marginBottom: 16,
        }}>
          What type of reminders?
        </Text>

        <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>
          Choose the type of reminders you'd like to set up.
        </Text>

        <View style={{ marginBottom: 20 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#10b981',
              borderColor: '#10b981',
              borderWidth: 1,
              borderRadius: 8,
              paddingVertical: 16,
              paddingHorizontal: 16,
              marginBottom: 12,
              alignItems: 'center',
            }}
            onPress={() => router.replace('/medication-onboarding')}
          >
            <Text style={{
              color: '#ffffff',
              fontSize: 16,
              fontWeight: '600',
            }}>
              Medication Reminders
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: '#10b981',
              borderColor: '#10b981',
              borderWidth: 1,
              borderRadius: 8,
              paddingVertical: 16,
              paddingHorizontal: 16,
              alignItems: 'center',
            }}
            onPress={() => router.replace('/other-reminders')}
          >
            <Text style={{
              color: '#ffffff',
              fontSize: 16,
              fontWeight: '600',
            }}>
              Other Reminders
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
