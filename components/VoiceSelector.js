import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// ElevenLabs Voice IDs for different voices
const VOICE_OPTIONS = {
  female: {
    id: '21m00Tcm4TlvDq8ikWAM', // Rachel - Female
    name: 'Rachel',
    description: 'Warm, friendly female voice',
    preview: 'Hello! I\'m Rachel, your AI companion.'
  },
  male: {
    id: 'pNInz6obpgDQGcFmaJgB', // Adam - Male
    name: 'Adam', 
    description: 'Calm, reassuring male voice',
    preview: 'Hi there! I\'m Adam, here to help you.'
  }
};

export default function VoiceSelector({ onVoiceChange }) {
  const [selectedVoice, setSelectedVoice] = useState('female');
  const [isEnabled, setIsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadVoiceSettings();
  }, []);

  const loadVoiceSettings = async () => {
    try {
      const savedVoice = await AsyncStorage.getItem('selectedVoice');
      const voiceEnabled = await AsyncStorage.getItem('voiceEnabled');
      
      if (savedVoice) {
        setSelectedVoice(savedVoice);
      }
      
      if (voiceEnabled !== null) {
        setIsEnabled(voiceEnabled === 'true');
      }
    } catch (error) {
      console.error('Error loading voice settings:', error);
    }
  };

  const saveVoiceSettings = async (voice, enabled) => {
    try {
      await AsyncStorage.setItem('selectedVoice', voice);
      await AsyncStorage.setItem('voiceEnabled', enabled.toString());
      
      // Update environment variable for ElevenLabs
      process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID = VOICE_OPTIONS[voice].id;
      
      if (onVoiceChange) {
        onVoiceChange(voice, enabled);
      }
    } catch (error) {
      console.error('Error saving voice settings:', error);
    }
  };

                const handleVoiceSelect = async (voice) => {
                setIsLoading(true);
                setSelectedVoice(voice);

                try {
                  await saveVoiceSettings(voice, isEnabled);
                  
                  // Update VoiceService immediately
                  if (onVoiceChange) {
                    await onVoiceChange(voice, isEnabled);
                  }

                  // Show preview
                  Alert.alert(
                    'Voice Changed',
                    `You've selected ${VOICE_OPTIONS[voice].name}. ${VOICE_OPTIONS[voice].preview}`,
                    [{ text: 'OK' }]
                  );
                } catch (error) {
                  console.error('Error changing voice:', error);
                  Alert.alert('Error', 'Failed to change voice. Please try again.');
                } finally {
                  setIsLoading(false);
                }
              };

  const handleToggleVoice = async (enabled) => {
    setIsEnabled(enabled);
    await saveVoiceSettings(selectedVoice, enabled);
  };

  const VoiceOption = ({ voice, option }) => (
    <TouchableOpacity
      style={[
        styles.voiceOption,
        selectedVoice === voice && styles.selectedVoice
      ]}
      onPress={() => handleVoiceSelect(voice)}
      disabled={isLoading}
    >
      <View style={styles.voiceInfo}>
        <View style={styles.voiceHeader}>
          <Ionicons
            name={voice === 'female' ? 'female' : 'male'}
            size={24}
            color={selectedVoice === voice ? '#10b981' : '#6b7280'}
          />
          <Text style={[
            styles.voiceName,
            selectedVoice === voice && styles.selectedText
          ]}>
            {option.name}
          </Text>
          {selectedVoice === voice && (
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
          )}
        </View>
        <Text style={[
          styles.voiceDescription,
          selectedVoice === voice && styles.selectedText
        ]}>
          {option.description}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Voice Settings</Text>
        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>Voice Enabled</Text>
          <Switch
            value={isEnabled}
            onValueChange={handleToggleVoice}
            trackColor={{ false: '#d1d5db', true: '#10b981' }}
            thumbColor={isEnabled ? '#ffffff' : '#f3f4f6'}
          />
        </View>
      </View>

      <Text style={styles.subtitle}>Choose your AI companion's voice:</Text>

      <View style={styles.voiceOptions}>
        <VoiceOption voice="female" option={VOICE_OPTIONS.female} />
        <VoiceOption voice="male" option={VOICE_OPTIONS.male} />
      </View>

      <View style={styles.infoContainer}>
        <Ionicons name="information-circle" size={16} color="#6b7280" />
        <Text style={styles.infoText}>
          Your voice preference will be saved and used for all conversations.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 15,
  },
  voiceOptions: {
    gap: 12,
  },
  voiceOption: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  selectedVoice: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  voiceInfo: {
    gap: 8,
  },
  voiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voiceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  selectedText: {
    color: '#065f46',
  },
  voiceDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 36,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    lineHeight: 20,
  },
});
