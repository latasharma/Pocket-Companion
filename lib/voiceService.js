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
      
      // For now, we'll use a simple prompt for voice input
      // In a production app, you'd integrate with a proper speech-to-text service
      Alert.prompt(
        'Voice Input',
        'Please speak your message:',
        [
          { text: 'Cancel', onPress: () => this.stopListening(), style: 'cancel' },
          { text: 'OK', onPress: (text) => this.handleVoiceResult(text) }
        ],
        'plain-text'
      );
      
      return true;
    } catch (error) {
      console.error('Error starting voice input:', error);
      this.isListening = false;
      return false;
    }
  }

  // Handle voice input result
  handleVoiceResult(text) {
    this.isListening = false;
    if (text && text.trim()) {
      // Return the recognized text
      return text.trim();
    }
    return null;
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