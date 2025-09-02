import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { AudioModule } = NativeModules;

// ElevenLabs Voice IDs for different voices
const VOICE_OPTIONS = {
  female: {
    id: '21m00Tcm4TlvDq8ikWAM', // Rachel - Female
    name: 'Rachel',
    description: 'Warm, friendly female voice'
  },
  male: {
    id: 'pNInz6obpgDQGcFmaJgB', // Adam - Male
    name: 'Adam', 
    description: 'Calm, reassuring male voice'
  }
};

export class VoiceService {
  static isEnabled = false;
  static currentVoice = null;
  static selectedVoiceType = 'female'; // Default to female voice
  static useElevenLabs = true; // Re-enable ElevenLabs with proper file-based solution
  static currentSound = null; // Track current audio session
  static audioContext = null; // Web Audio Context for non-blocking processing
  static audioWorker = null; // Web Worker for audio processing
  static onVoiceStart = null; // Callback when voice starts playing
  static onVoiceEnd = null; // Callback when voice ends
  
  // Rate limiting properties
  static rateLimitHit = false;
  static rateLimitResetTime = null;
  static rateLimitCooldown = 60000; // 1 minute cooldown

  // Load saved voice preference from AsyncStorage
  static async loadVoicePreference() {
    try {
      const savedVoice = await AsyncStorage.getItem('selectedVoice');
      if (savedVoice && (savedVoice === 'male' || savedVoice === 'female')) {
        this.selectedVoiceType = savedVoice;
        console.log(`Loaded saved voice preference: ${savedVoice}`);
      }
    } catch (error) {
      console.error('Error loading voice preference:', error);
    }
  }

  // Initialize voice settings with Web Audio Context
  static async initialize() {
    try {
      // Note: Web Audio Context not available in React Native, using expo-av
      console.log('Using expo-av for audio playback (React Native compatible)');

      // Note: Web Workers not supported in React Native, using main thread processing
      console.log('Using main thread audio processing (React Native compatible)');

      // Load saved voice preference
      await this.loadVoicePreference();

      // Check available voices
      const voices = await Speech.getAvailableVoicesAsync();
      console.log('Available voices:', voices.length);
      
      // Set default voice (prefer female voices for companion)
      const femaleVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') || 
        voice.name.toLowerCase().includes('samantha') ||
        voice.name.toLowerCase().includes('karen')
      );
      
      this.currentVoice = femaleVoice || voices[0];
      console.log('Selected voice:', this.currentVoice?.name);
      
      // Voice is enabled by default
      this.isEnabled = true;
      
      return true;
    } catch (error) {
      console.error('Error initializing voice service:', error);
      return false;
    }
  }

  // Handle messages from audio worker
  static handleWorkerMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'AUDIO_PROCESSED':
        this.playProcessedAudio(data.audioBuffer);
        break;
      case 'AUDIO_ERROR':
        console.error('Audio processing error:', data.error);
        this.fallbackToSystemSpeech(data.text);
        break;
    }
  }

  // Play processed audio using Web Audio Context
  static async playProcessedAudio(audioBuffer) {
    try {
      if (this.audioContext) {
        // Create audio source from processed buffer
        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.audioContext.destination);
        source.start(0);
        
        // Track current session
        this.currentSound = source;
        
        console.log('Playing audio via Web Audio Context');
      } else {
        // Fallback to expo-av if Web Audio Context not available
        await this.playWithExpoAV(audioBuffer);
      }
    } catch (error) {
      console.error('Error playing processed audio:', error);
    }
  }

  // Start playback from audio buffer to reduce latency
  static async startPlaybackFromBuffer(audioBuffer, filePath) {
    try {
      // Convert to base64 using chunked approach to avoid stack overflow
      let binaryString = '';
      const chunkSize = 1024;
      
      for (let i = 0; i < audioBuffer.length; i += chunkSize) {
        const chunk = audioBuffer.slice(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, chunk);
      }
      
      const base64Data = btoa(binaryString);
      
      // Write to file using FileSystem
      await FileSystem.writeAsStringAsync(filePath, base64Data, {
        encoding: FileSystem.EncodingType.Base64
      });

      // Configure audio session for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: 1,
        interruptionModeAndroid: 1,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      // Play audio from downloaded file with maximum volume
      const { sound } = await Audio.Sound.createAsync(
        { uri: filePath },
        { 
          shouldPlay: true,
          volume: 1.0,  // Maximum volume (1.0 is the max)
          rate: 1.0,    // Normal speed
          shouldCorrectPitch: true
        }
      );
      
      // Set volume after creation to ensure it's applied
      await sound.setVolumeAsync(1.0);
      
      this.currentSound = sound;
      await sound.playAsync();
      
      // Notify that voice is actually playing now
      console.log('🎵 Voice is now actually playing');
      this.onVoiceStart && this.onVoiceStart();
      
      // Clean up when done
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          console.log('Voice playback completed');
          sound.unloadAsync();
          this.currentSound = null;
          // Clean up file
          FileSystem.deleteAsync(filePath, { idempotent: true });
          // Notify that voice has ended
          this.onVoiceEnd && this.onVoiceEnd();
        }
      });
    } catch (error) {
      console.error('Error starting playback from buffer:', error);
    }
  }

  // Fallback to system speech
  static async fallbackToSystemSpeech(text) {
    try {
      console.log('Using system speech fallback');
      await Speech.speak(text, {
        rate: 0.85,
        pitch: 1.1,
        volume: 1.0,  // Full volume
        language: 'en-US'
      });
    } catch (error) {
      console.error('System speech fallback failed:', error);
    }
  }

  // Set voice type (male/female)
  static async setVoiceType(voiceType) {
    if (VOICE_OPTIONS[voiceType]) {
      this.selectedVoiceType = voiceType;
      console.log(`Voice changed to: ${VOICE_OPTIONS[voiceType].name}`);
      
      // Save to AsyncStorage immediately
      try {
        await AsyncStorage.setItem('selectedVoice', voiceType);
        console.log(`Voice preference saved: ${voiceType}`);
      } catch (error) {
        console.error('Error saving voice preference:', error);
      }
      
      return true;
    }
    return false;
  }

  // Get current voice type
  static getVoiceType() {
    return this.selectedVoiceType;
  }

  // Get current voice ID for ElevenLabs
  static getCurrentVoiceId() {
    return VOICE_OPTIONS[this.selectedVoiceType]?.id || VOICE_OPTIONS.female.id;
  }

  // Get voice options
  static getVoiceOptions() {
    return VOICE_OPTIONS;
  }

  // Strip markdown formatting and add emotion markers for voice synthesis
  static stripMarkdown(text) {
    if (!text) return text;
    
    let processedText = text
      // Remove bold formatting (**text** or __text__)
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      // Remove italic formatting (*text* or _text_)
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      // Remove code formatting (`text`)
      .replace(/`(.*?)`/g, '$1')
      // Remove links [text](url)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove headers (# ## ### etc.)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove list markers (- * +)
      .replace(/^[-*+]\s+/gm, '')
      // Remove numbered lists
      .replace(/^\d+\.\s+/gm, '')
      // Remove blockquotes
      .replace(/^>\s+/gm, '')
      // Clean up extra whitespace
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // Add emotion markers based on content
    processedText = this.addEmotionMarkers(processedText);
    
    return processedText;
  }

  // Add emotion markers to text for more expressive speech
  static addEmotionMarkers(text) {
    // Add pauses and emphasis for better expression
    let enhancedText = text;
    
    // Add pauses after sentences
    enhancedText = enhancedText.replace(/\./g, '... ');
    enhancedText = enhancedText.replace(/!/g, '!... ');
    enhancedText = enhancedText.replace(/\?/g, '?... ');
    
    // Add emphasis for important words (capitalization helps with emotion)
    enhancedText = enhancedText.replace(/\b(great|wonderful|amazing|excellent|fantastic)\b/gi, 'GREAT $1');
    enhancedText = enhancedText.replace(/\b(important|critical|essential|vital)\b/gi, 'IMPORTANT $1');
    enhancedText = enhancedText.replace(/\b(sorry|apologize|regret)\b/gi, 'SORRY $1');
    enhancedText = enhancedText.replace(/\b(happy|excited|thrilled|delighted)\b/gi, 'HAPPY $1');
    
    // Add conversational markers
    enhancedText = enhancedText.replace(/\b(well|so|now|you see)\b/gi, '... $1');
    
    return enhancedText;
  }

  // Check and reset rate limits
  static checkRateLimit() {
    if (this.rateLimitHit && this.rateLimitResetTime) {
      if (Date.now() > this.rateLimitResetTime) {
        console.log('Rate limit cooldown expired, re-enabling ElevenLabs');
        this.rateLimitHit = false;
        this.rateLimitResetTime = null;
        this.useElevenLabs = true;
        return true;
      } else {
        const remainingTime = Math.ceil((this.rateLimitResetTime - Date.now()) / 1000);
        console.log(`Rate limit active, ${remainingTime}s remaining until ElevenLabs re-enabled`);
        return false;
      }
    }
    return true;
  }

  // Speak text using ElevenLabs or fallback to system speech
  static async speak(text, options = {}) {
    if (!this.isEnabled) {
      console.log('Voice is disabled');
      return;
    }

    try {
      // Stop any current speech
      await this.stop();

      // Check rate limits before attempting ElevenLabs
      this.checkRateLimit();

      // Strip markdown formatting for voice synthesis
      const cleanText = this.stripMarkdown(text);

      if (this.useElevenLabs) {
        await this.speakWithElevenLabs(cleanText);
      } else {
        // Fallback to system speech
        await Speech.speak(cleanText, {
          voice: this.currentVoice?.identifier,
          rate: 0.85,
          pitch: 1.1,
          volume: 1.0,  // Full volume
          language: 'en-US',
          ...options
        });
      }

      console.log('Speaking:', cleanText.substring(0, 50) + '...');
    } catch (error) {
      console.error('Error speaking text:', error);
      // Fallback to system speech if ElevenLabs fails
      await this.fallbackToSystemSpeech(this.stripMarkdown(text));
    }
  }

  // Speak using ElevenLabs API with direct file download
  static async speakWithElevenLabs(text) {
    try {
      const apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
      const voiceId = this.getCurrentVoiceId();

      console.log('🔊 Voice synthesis debug:');
      console.log('🔊 API Key exists:', !!apiKey);
      console.log('🔊 API Key length:', apiKey?.length);
      console.log('🔊 Voice ID:', voiceId);
      console.log('🔊 Text length:', text.length);

      if (!apiKey) {
        throw new Error('No ElevenLabs API key found');
      }

      console.log('Using ElevenLabs for voice synthesis...');

      // Create a temporary file path
      const fileName = `elevenlabs_${Date.now()}.mp3`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      // Use optimized approach for React Native
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,  // Lower stability for more emotion
            similarity_boost: 0.7,  // Keep voice consistency
            style: 0.3,  // Add some style variation
            use_speaker_boost: true  // Enhance clarity
          },
          output_format: 'mp3_22050_64'  // Back to original working format
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      // Get audio data and start playback immediately
      const audioBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(audioBuffer);
      await this.startPlaybackFromBuffer(uint8Array, filePath);

    } catch (error) {
      // If it's a rate limit error, handle gracefully
      if (error.message.includes('429')) {
        console.log('ElevenLabs rate limit hit, switching to system speech');
        this.rateLimitHit = true;
        this.rateLimitResetTime = Date.now() + this.rateLimitCooldown;
        this.useElevenLabs = false;
        // Don't throw error, let it fall through to system speech
        return;
      }
      
      // For other errors, log once and throw
      console.error('ElevenLabs error:', error.message);
      throw error; // Let the main speak function handle fallback for other errors
    }
  }

  // Process audio using simple approach (working solution)
  static async processAudioInMainThread(response, text) {
    try {
      // Get audio data
      const audioBuffer = await response.arrayBuffer();
      
      // Create data URL using chunked processing
      const uint8Array = new Uint8Array(audioBuffer);
      let binaryString = '';
      
      // Process in very small chunks to avoid stack overflow
      const chunkSize = 1024; // 1KB chunks
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, chunk);
      }
      
      const audioBase64 = btoa(binaryString);
      const dataUrl = `data:audio/mpeg;base64,${audioBase64}`;
      
      // Play audio using expo-av
      const { sound } = await Audio.Sound.createAsync(
        { uri: dataUrl },
        { shouldPlay: true }
      );
      
      this.currentSound = sound;
      await sound.playAsync();
      
      // Clean up when done
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
          this.currentSound = null;
        }
      });
      
      console.log('Playing audio via data URL');

    } catch (error) {
      console.error('Audio processing error:', error);
      throw error;
    }
  }

  // Play audio using expo-av
  static async playWithExpoAV(audioSource) {
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioSource },
        { shouldPlay: true }
      );
      
      this.currentSound = sound;
      
      await sound.playAsync();

      // Clean up when done
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync();
          this.currentSound = null;
        }
      });
    } catch (error) {
      console.error('Error playing with expo-av:', error);
      throw error;
    }
  }

  // Stop current speech with proper cleanup
  static async stop() {
    try {
      // Stop system speech
      await Speech.stop();
      
      // Stop Web Audio Context source
      if (this.currentSound && this.currentSound.stop) {
        this.currentSound.stop();
        this.currentSound = null;
      }
      
      // Stop expo-av audio if playing
      if (this.currentSound && this.currentSound.stopAsync) {
        await this.currentSound.stopAsync();
        await this.currentSound.unloadAsync();
        this.currentSound = null;
      }
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }

  // Set voice state from profile
  static setVoiceEnabled(enabled) {
    this.isEnabled = enabled;
    console.log('Voice state set to:', enabled);
    
    if (!this.isEnabled) {
      this.stop();
    }
    
    return this.isEnabled;
  }

  // Toggle voice on/off
  static toggleVoice() {
    this.isEnabled = !this.isEnabled;
    console.log('Voice enabled:', this.isEnabled);
    
    if (!this.isEnabled) {
      this.stop();
    }
    
    return this.isEnabled;
  }

  // Toggle between ElevenLabs and system speech
  static toggleVoiceQuality() {
    this.useElevenLabs = !this.useElevenLabs;
    console.log('Using ElevenLabs:', this.useElevenLabs);
    return this.useElevenLabs;
  }

  // Get voice status
  static getVoiceStatus() {
    return {
      isEnabled: this.isEnabled,
      useElevenLabs: this.useElevenLabs,
      currentVoice: this.currentVoice?.name || 'Default',
      hasWebAudio: !!this.audioContext,
      hasWorker: !!this.audioWorker
    };
  }

  // Change voice
  static async changeVoice(voiceIdentifier) {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const newVoice = voices.find(voice => voice.identifier === voiceIdentifier);
      
      if (newVoice) {
        this.currentVoice = newVoice;
        console.log('Voice changed to:', newVoice.name);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error changing voice:', error);
      return false;
    }
  }

  // Get available voices
  static async getAvailableVoices() {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices.map(voice => ({
        identifier: voice.identifier,
        name: voice.name,
        language: voice.language
      }));
    } catch (error) {
      console.error('Error getting available voices:', error);
      return [];
    }
  }

  // Cleanup resources
  static cleanup() {
    if (this.audioWorker) {
      this.audioWorker.terminate();
      this.audioWorker = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.stop();
  }
} 