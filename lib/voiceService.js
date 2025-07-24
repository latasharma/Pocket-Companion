import * as Speech from 'expo-speech';
import { Alert, Platform } from 'react-native';

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

  // Start listening for voice input
  async startListening() {
    try {
      this.isListening = true;
      
      // For now, we'll use a simple approach
      // In a production app, you'd integrate with a proper speech-to-text service
      Alert.alert(
        'Voice Input',
        'Voice input is coming soon! For now, please use the text input below.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              this.isListening = false;
            }
          }
        ]
      );
      
      return false; // Return false to indicate voice input is not available yet
    } catch (error) {
      console.error('Error starting voice input:', error);
      this.isListening = false;
      return false;
    }
  }

  async stopListening() {
    this.isListening = false;
  }

  // Get available voices
  getAvailableVoices() {
    return Object.keys(this.accentVoices);
  }

  // Check if voice is supported
  async isVoiceSupported() {
    return true;
  }
}

export const voiceService = new VoiceService(); 