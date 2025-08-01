import * as React from 'react';
import { View, Image, TouchableOpacity, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

const REMINDER_OPTIONS = [
  'Doc appt',
  'Dental', 
  'Dog bath',
  'Coffee with friend'
];

export default function OtherRemindersScreen() {
  const router = useRouter();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 40, paddingBottom: 40 }}>
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
          What would you like to be reminded of?
        </Text>
        
        <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>
          Choose the types of reminders you'd like to set up.
        </Text>
        
        <View style={{ marginBottom: 20 }}>
          {REMINDER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option}
              style={{
                backgroundColor: '#f3f4f6',
                borderColor: '#d1d5db',
                borderWidth: 1,
                borderRadius: 8,
                paddingVertical: 16,
                paddingHorizontal: 16,
                marginBottom: 12,
                alignItems: 'center',
                opacity: 0.5,
              }}
              disabled={true}
            >
              <Text style={{
                color: '#9ca3af',
                fontSize: 16,
                fontWeight: '600',
              }}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 20, textAlign: 'center' }}>
          Coming soon! For now, let's get you started with your AI companion.
        </Text>

        <TouchableOpacity
          style={{
            backgroundColor: '#10b981',
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: 'center',
          }}
          onPress={() => router.replace('/chat')}
        >
          <Text style={{
            color: '#ffffff',
            fontSize: 16,
            fontWeight: '600',
          }}>
            Continue to Chat
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
