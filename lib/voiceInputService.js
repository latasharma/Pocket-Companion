import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system/legacy';

export class VoiceInputService {
  static isRecording = false;
  static isStopping = false; // Prevent double-stop
  static recording = null;
  static recordingStartTime = null; // Track recording start time
  static onSpeechResult = null;
  static onError = null;
  static onRecordingStatus = null; // For visual feedback

  // Audio format configurations optimized for transcription
  static AUDIO_FORMATS = {
    // Primary format - optimized for OpenAI transcription (MP3-like)
    PRIMARY: {
      android: {
        extension: '.m4a',
        outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
        audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
        audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
    },
    // Fallback format - using standard preset for maximum compatibility
    FALLBACK: Audio.RecordingOptionsPresets.HIGH_QUALITY,
  };

  // Initialize voice input service
  static async initialize() {
    try {
      // Request microphone permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission not granted');
      }

      // Initial audio session setup
      await this.setupAudioSession();

      console.log('Voice input service initialized with professional audio management');
      return true;
    } catch (error) {
      console.error('Error initializing voice input service:', error);
      return false;
    }
  }

  // Professional audio session management (like Replika)
  static async setupAudioSession() {
    try {
      // Configure audio mode for optimal recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        interruptionModeIOS: 1, // DO_NOT_MIX - like professional apps
        interruptionModeAndroid: 1, // DO_NOT_MIX
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        shouldDuckIOS: false,
      });

      console.log('Professional audio session configured');
    } catch (error) {
      console.error('Error setting up audio session:', error);
      throw error;
    }
  }

  // Start recording voice input
  static async startRecording(onResult, onError, onStatus) {
    try {
      if (this.isRecording || this.isStopping) {
        console.log('Already recording or stopping, ignoring start request');
        return;
      }

      this.onSpeechResult = onResult;
      this.onError = onError;
      this.onRecordingStatus = onStatus;

      console.log('Starting voice recording...');
      console.log('Start recording called at:', new Date().toISOString());

      // Try to start recording with retry logic
      await this.attemptRecordingStart();
    } catch (error) {
      console.error('Error starting voice recording:', error);
      if (this.onError) {
        try {
          this.onError(error);
        } catch (callbackError) {
          console.error('Error in onError callback:', callbackError);
        }
      }
    }
  }

  // Attempt to start recording with fallback options
  static async attemptRecordingStart(retryCount = 0) {
    const maxRetries = 2;
    
    try {
      // Professional audio session management
      await this.setupAudioSession();

      // Wait a moment for audio session to stabilize
      await new Promise(resolve => setTimeout(resolve, 200));

      // Choose recording options based on retry count
      let recordingOptions;
      if (retryCount === 0) {
        recordingOptions = this.AUDIO_FORMATS.PRIMARY;
        console.log('Using HIGH_QUALITY recording preset');
      } else {
        recordingOptions = this.AUDIO_FORMATS.FALLBACK;
        console.log('Using LOW_QUALITY recording preset as fallback');
      }

      // Create recording object
      const { recording } = await Audio.Recording.createAsync(
        recordingOptions,
        (status) => {
          // Only log important status changes, not every update
          if (status.isRecording !== this.isRecording) {
            console.log('Recording state changed:', status.isRecording ? 'Started' : 'Stopped');
          }
          if (this.onRecordingStatus) {
            this.onRecordingStatus(status);
          }
        },
        100
      );

      this.recording = recording;
      this.isRecording = true;
      this.recordingStartTime = Date.now(); // Track start time

      console.log('Voice recording started successfully');
      
      // Debug: Check recording status after creation
      const initialStatus = await recording.getStatusAsync();
      console.log('Initial recording status:', {
        canRecord: initialStatus.canRecord,
        isRecording: initialStatus.isRecording,
        durationMillis: initialStatus.durationMillis
      });
    } catch (error) {
      console.error(`Recording attempt ${retryCount + 1} failed:`, error.message);
      
      if (retryCount < maxRetries) {
        console.log('Retrying with different recording options...');
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait before retry
        return this.attemptRecordingStart(retryCount + 1);
      } else {
        throw new Error(`Failed to start recording after ${maxRetries + 1} attempts: ${error.message}`);
      }
    }
  }

  // Stop recording and process speech
  static async stopRecording() {
    try {
      if (!this.isRecording || !this.recording) {
        console.log('Not recording, ignoring stop request');
        return;
      }
      
      if (this.isStopping) {
        console.log('Already stopping, ignoring duplicate stop request');
        return;
      }
      
      this.isStopping = true;

      console.log('Stopping voice recording...');
      console.log('Stop recording called at:', new Date().toISOString());

      // Stop recording and wait for flush
      await this.recording.stopAndUnloadAsync();
      
      // Give iOS a moment to flush the file, then read final status
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const uri = this.recording.getURI();
      const status = await this.recording.getStatusAsync().catch(() => null);
      
      // Calculate duration using both methods
      const wallMs = this.recordingStartTime ? (Date.now() - this.recordingStartTime) : 0;
      const durMs = status?.durationMillis ?? 0;
      
      // Use the larger of the two durations as the effective duration
      const effectiveMs = Math.max(durMs, wallMs);
      
      console.log('Recording stopped, URI:', uri);
      console.log('Wall clock duration:', wallMs, 'ms');
      console.log('Status duration:', durMs, 'ms');
      console.log('Effective duration:', effectiveMs, 'ms');

      // Validate recording quality using effective duration
      if (!this.validateRecording(status, effectiveMs)) {
        console.log('Recording quality check failed, skipping transcription');
        return;
      }

      // Validate and optimize audio file before processing
      const optimizedUri = await this.validateAndOptimizeAudio(uri);
      if (!optimizedUri) {
        console.log('Audio validation failed, skipping transcription');
        return;
      }

      // Process the audio with retry logic
      await this.processSpeechToTextWithRetry(optimizedUri);
    } catch (error) {
      console.error('Error stopping voice recording:', error);
      if (this.onError) {
        try {
          this.onError(error);
        } catch (callbackError) {
          console.error('Error in onError callback:', callbackError);
        }
      }
    } finally {
      // Clean up state
      this.recording = null;
      this.isRecording = false;
      this.isStopping = false;
      this.recordingStartTime = null;
    }
  }

  // Validate recording quality
  static validateRecording(status, actualDuration = null) {
    // Use actual duration if provided, otherwise fall back to status duration
    const duration = actualDuration || status.durationMillis;
    
    // Check minimum duration (300ms - more reasonable for voice input)
    if (!duration || duration < 300) {
      console.log('Recording too short:', duration, 'ms');
      return false;
    }

    // Check maximum duration (30 seconds)
    if (duration > 30000) {
      console.log('Recording too long:', duration, 'ms');
      return false;
    }

    // Check if recording completed successfully
    if (!status.isDoneRecording) {
      console.log('Recording not completed properly');
      return false;
    }

    return true;
  }

  // Validate and optimize audio file
  static async validateAndOptimizeAudio(audioUri) {
    try {
      console.log('Validating and optimizing audio file...');

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        console.error('Audio file does not exist:', audioUri);
        return null;
      }

      console.log('Audio file size:', fileInfo.size, 'bytes');

      // Check file size (minimum 1KB, maximum 25MB)
      if (fileInfo.size < 1024) {
        console.error('Audio file too small:', fileInfo.size, 'bytes');
        return null;
      }

      if (fileInfo.size > 25 * 1024 * 1024) {
        console.error('Audio file too large:', fileInfo.size, 'bytes');
        return null;
      }

      // Check file extension and optimize if needed
      const fileExtension = this.getFileExtension(audioUri);
      console.log('Audio file extension:', fileExtension);

      // If not MP3, try to convert or use as-is
      if (fileExtension !== '.mp3') {
        console.log('Converting audio to MP3 format...');
        const convertedUri = await this.convertToMp3(audioUri);
        if (convertedUri) {
          console.log('Audio converted successfully to MP3');
          return convertedUri;
        } else {
          console.log('Conversion failed, using original file');
          return audioUri;
        }
      }

      console.log('Audio file validation passed');
      return audioUri;
    } catch (error) {
      console.error('Error validating audio file:', error);
      return null;
    }
  }

  // Get file extension from URI
  static getFileExtension(uri) {
    const lastDotIndex = uri.lastIndexOf('.');
    if (lastDotIndex === -1) return '';
    return uri.substring(lastDotIndex).toLowerCase();
  }

  // Convert audio to MP3 format
  static async convertToMp3(audioUri) {
    try {
      // For now, we'll use the original file since direct conversion
      // requires additional libraries. In a production app, you'd use:
      // - react-native-ffmpeg for audio conversion
      // - or a cloud service for format conversion
      
      console.log('Audio conversion not implemented - using original format');
      return audioUri;
    } catch (error) {
      console.error('Error converting audio to MP3:', error);
      return null;
    }
  }

  // Process speech to text with retry logic
  static async processSpeechToTextWithRetry(audioUri, retryCount = 0) {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    try {
      console.log(`Processing speech to text (attempt ${retryCount + 1}/${maxRetries + 1})...`);
      
      const result = await this.processSpeechToText(audioUri);
      return result;
    } catch (error) {
      console.error(`Transcription attempt ${retryCount + 1} failed:`, error.message);
      
      if (retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
        console.log(`Retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.processSpeechToTextWithRetry(audioUri, retryCount + 1);
      } else {
        console.error('All transcription attempts failed');
        await this.handleTranscriptionFailure(audioUri, error);
      }
    }
  }

  // Process speech to text using OpenAI
  static async processSpeechToText(audioUri) {
    console.log('Audio URI:', audioUri);
    console.log('OpenAI API Key exists:', !!process.env.EXPO_PUBLIC_OPENAI_API_KEY);
    console.log('OpenAI API Key length:', process.env.EXPO_PUBLIC_OPENAI_API_KEY?.length);
    
    if (!process.env.EXPO_PUBLIC_OPENAI_API_KEY) {
      throw new Error('OpenAI API key not found');
    }
    
    // Determine the correct MIME type based on file extension
    const fileExtension = this.getFileExtension(audioUri);
    const mimeType = this.getMimeType(fileExtension);
    
    console.log('Using MIME type:', mimeType, 'for file extension:', fileExtension);
    
    // Create a form data object for the API request
    const formData = new FormData();
    
    // Add the audio file to the form data with correct MIME type
    formData.append('file', {
      uri: audioUri,
      type: mimeType,
      name: `recording${fileExtension}`
    });
    
    // Add the model parameter
    formData.append('model', 'gpt-4o-mini-transcribe');
    
    console.log('Sending transcription request to OpenAI...');
    
    // Make the API request to OpenAI
    const url = 'https://api.openai.com/v1/audio/transcriptions';
    console.log('POST', url, 'len=', url.length);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
        'Accept': 'application/json',
      },
      body: formData
    });
    
    console.log('OpenAI response status:', response.status);
    
    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI transcription error details:', errText);
      throw new Error(`OpenAI transcription error: ${response.status} - ${errText}`);
    }
    
    const result = await response.json();
    const transcribedText = result.text;
    
    console.log('✅ Transcribed text:', transcribedText);
    
    if (this.onSpeechResult) {
      try {
        this.onSpeechResult(transcribedText);
      } catch (error) {
        console.error('Error in onSpeechResult callback:', error);
      }
    }
    
    return transcribedText;
  }

  // Get MIME type for file extension
  static getMimeType(fileExtension) {
    switch (fileExtension) {
      case '.mp3':
        return 'audio/mpeg';
      case '.wav':
        return 'audio/wav';
      case '.m4a':
        return 'audio/mp4';
      case '.aac':
        return 'audio/aac';
      default:
        return 'audio/mpeg'; // Default to MP3
    }
  }

  // Handle transcription failure with multiple fallback strategies
  static async handleTranscriptionFailure(audioUri, originalError) {
    console.log('Handling transcription failure with fallback strategies...');
    
    // Strategy 1: Try with different audio format
    try {
      console.log('Fallback 1: Trying with different audio format...');
      const convertedUri = await this.convertAudioFormat(audioUri);
      if (convertedUri) {
        const result = await this.processSpeechToText(convertedUri);
        if (result) return result;
      }
    } catch (error) {
      console.log('Fallback 1 failed:', error.message);
    }

    // Strategy 2: Try with different model (if available)
    try {
      console.log('Fallback 2: Trying with different model...');
      const result = await this.processSpeechToTextWithDifferentModel(audioUri);
      if (result) return result;
    } catch (error) {
      console.log('Fallback 2 failed:', error.message);
    }

    // Strategy 3: Show user feedback
    console.log('All fallback strategies failed, showing user feedback');
    if (this.onError) {
      try {
        this.onError(new Error('Voice transcription failed. Please try again or type your message.'));
      } catch (callbackError) {
        console.error('Error in onError callback:', callbackError);
      }
    }
  }

  // Convert audio format (placeholder for future implementation)
  static async convertAudioFormat(audioUri) {
    try {
      const fileExtension = this.getFileExtension(audioUri);
      
      // If already MP3, try WAV as fallback
      if (fileExtension === '.mp3') {
        console.log('Trying WAV format as fallback...');
        // In a real implementation, you'd convert MP3 to WAV
        return null; // For now, return null
      }
      
      // If WAV, try MP3 as fallback
      if (fileExtension === '.wav') {
        console.log('Trying MP3 format as fallback...');
        // In a real implementation, you'd convert WAV to MP3
        return null; // For now, return null
      }
      
      console.log('No format conversion available');
      return null;
    } catch (error) {
      console.error('Error in audio format conversion:', error);
      return null;
    }
  }

  // Try with different model (placeholder for future implementation)
  static async processSpeechToTextWithDifferentModel(audioUri) {
    // This would try with a different transcription model
    // For now, return null to skip this fallback
    console.log('Different model fallback not implemented yet');
    return null;
  }

  // Check if recording is active
  static isCurrentlyRecording() {
    return this.isRecording;
  }

  // Clean up resources
  static async cleanup() {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }
      this.isRecording = false;
      this.onSpeechResult = null;
      this.onError = null;
      this.onRecordingStatus = null;
    } catch (error) {
      console.error('Error cleaning up voice input service:', error);
    }
  }
}
