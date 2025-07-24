import * as Speech from 'expo-speech';
import { Alert } from 'react-native';

class VoiceService {
  constructor() {
    this.isListening = false;
    this.isSpeaking = false;
    this.accentVoices = {
      'American': 'en-US',
      'British': 'en-GB', 
      'Indian': 'en-IN',
      'Australian': 'en-AU',
      'Canadian': 'en-CA'
    };
  }

  // Initialize voice service
  async initializeVoice() {
    try {
      // expo-speech doesn't have isAvailableAsync, so we'll assume it's available
      // and handle errors when trying to speak
      console.log('Voice service initialized');
      return true;
    } catch (error) {
      console.error('Error initializing voice service:', error);
      return false;
    }
  }

  // Speak text with selected accent
  async speakText(text, accent = 'American') {
    try {
      if (this.isSpeaking) {
        await Speech.stop();
      }

      const voice = this.accentVoices[accent] || 'en-US';
      
      this.isSpeaking = true;
      await Speech.speak(text, {
        language: voice,
        pitch: 1.0,
        rate: 0.9,
        onDone: () => {
          this.isSpeaking = false;
        },
        onError: (error) => {
          console.error('Speech error:', error);
          this.isSpeaking = false;
        }
      });
    } catch (error) {
      console.error('Error speaking text:', error);
      this.isSpeaking = false;
    }
  }

  // Stop speaking
  async stopSpeaking() {
    try {
      await Speech.stop();
      this.isSpeaking = false;
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }

  // Get available voices
  getAvailableVoices() {
    return Object.keys(this.accentVoices);
  }

  // Check if voice is supported (simplified)
  async isVoiceSupported() {
    // For now, assume voice is supported
    // In a real app, you might want to check device capabilities
    return true;
  }

  // For now, we'll use a simple approach for voice input
  // In a real implementation, you'd integrate with a speech-to-text service
  async startListening() {
    Alert.alert(
      'Voice Input',
      'Voice input will be implemented in the next phase. For now, please use text input.',
      [{ text: 'OK' }]
    );
    return false;
  }

  async stopListening() {
    // Placeholder for future implementation
  }
}

export const voiceService = new VoiceService(); 