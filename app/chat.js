import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AIService } from '../lib/aiService';
import { authService } from '../lib/authService';
import { deviceIdService } from '../lib/deviceIdService';
import { MemoryService } from '../lib/memoryService';
import { supabase } from '../lib/supabase';
import { VoiceInputService } from '../lib/voiceInputService';
import { VoiceService } from '../lib/voiceService';

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState(''); // 'preparing', 'speaking', or ''
  const [companionName, setCompanionName] = useState('Pixel');
  const [userProfile, setUserProfile] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceInputEnabled, setVoiceInputEnabled] = useState(true);

  const [recordingTimeout, setRecordingTimeout] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let subscription = null;

    const initializeApp = async () => {
      try {
        // Load memory (DB/AsyncStorage) first so we don't overwrite an existing
        // conversation with a welcome message. After memory is loaded we then
        // load the user profile which may set companionName/voice prefs.
        await initializeMemorySystem();
        await fetchUserProfile();

        // Initialize other services after profile/memory are ready
        await initializeVoiceService();
        await initializeVoiceInput();
        await initializeDeviceId();
        
        // Set up auth state change listener
        console.log('🔐 Setting up auth listener in useEffect');
        subscription = authService.onAuthStateChange((event, session) => {
          console.log('🔐 Auth event received:', event, 'Session:', !!session);
          
          if (event === 'SIGNED_OUT') {
            console.log('👋 User signed out');
            setMessages([]);
            setUserProfile(null);
            setCompanionName('Pixel');
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            console.log('🔄 User session updated:', event);
            // Refresh profile; do not block the listener
            fetchUserProfile();
            // Also re-load memory to pick up any server-side changes
            initializeMemorySystem();
          }
        });
        
        if (!subscription) {
          console.warn('⚠️ Auth listener returned null subscription');
        } else {
          console.log('✅ Auth listener set up successfully');
        }
      } catch (error) {
        console.error('❌ Error in useEffect initialization:', error);
      }
    };

    initializeApp();

    // Cleanup subscription on unmount
    return () => {
      console.log('🧹 Cleaning up subscriptions');
      if (subscription && typeof subscription.unsubscribe === 'function') {
        console.log('🧹 Unsubscribing from auth state changes');
        subscription.unsubscribe();
      }
    };
  }, []);

  const initializeDeviceId = async () => {
    try {
      const deviceId = await deviceIdService.getDeviceId();
      console.log('📱 Device ID initialized in chat:', deviceId);
    } catch (error) {
      console.error('❌ Error initializing device ID:', error);
    }
  };

  // Initialize memory system and load chat history
  const initializeMemorySystem = async () => {
    try {
      // Try to get current user (this will refresh token if necessary)
      let user = await authService.getCurrentUser();

      // If no user yet, attempt a refresh once to recover short-lived token races
      if (!user) {
        console.log('No user from authService initially, attempting session refresh...');
        await authService.refreshSession();
        user = await authService.getCurrentUser();
      }

      if (user) {
        console.log('Initializing memory system for user:', user.id);

        // Initialize memory system for new users (safe - doesn't wipe history)
        await MemoryService.initializeUserMemory(user.id);

        // Load recent conversations (request a larger history for full chat display)
        const conversations = await MemoryService.loadConversations(user.id, 1);
        console.log('Loaded conversations from database:', conversations?.length || 0);

        if (Array.isArray(conversations) && conversations.length > 0) {
          // MemoryService returns the messages array directly
          setMessages(conversations);
          console.log('Set messages from database (restored history)');
        } else {
          // If no database conversations, try AsyncStorage
          console.log('No database conversations, trying AsyncStorage...');
          await loadChatHistoryFromStorage(user.id);
        }
      } else {
        // As a last resort, try to load any local AsyncStorage chat (may exist for this device)
        console.log('No authenticated user available; attempting to load any local AsyncStorage chat');
        await loadChatHistoryFromStorage();
      }
    } catch (error) {
      console.error('Error initializing memory system:', error);
      // Fallback to AsyncStorage (try to load without user id)
      await loadChatHistoryFromStorage();
    }
  };

  // Load chat history from AsyncStorage (fallback)
  const loadChatHistoryFromStorage = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const storedHistory = await AsyncStorage.getItem(`chat_history_${user.id}`);
        if (storedHistory) {
          const parsedHistory = JSON.parse(storedHistory);
          setMessages(parsedHistory);
        }
      }
    } catch (error) {
      console.error('Error loading chat history from storage:', error);
    }
  };

  // Save chat history to database and storage
  const saveChatHistory = async (newMessages) => {
    try {
      // Prefer the authService which handles session refreshes reliably
      let user = await authService.getCurrentUser();

      // Fallback to supabase auth.getUser() if authService didn't return a user
      if (!user) {
        try {
          const { data: { user: sbUser } } = await supabase.auth.getUser();
          user = sbUser;
        } catch (e) {
          console.warn('saveChatHistory - supabase.auth.getUser() fallback failed:', e);
        }
      }

      if (user) {
        // Save to database
        console.log('Saving conversation to database for user:', user.id);
        await MemoryService.saveConversation(user.id, newMessages);
        
        // Also save to AsyncStorage as backup
        await AsyncStorage.setItem(`chat_history_${user.id}`, JSON.stringify(newMessages));
      } else {
        // If no authenticated user, still persist to device for eventual recovery
        try {
          const tempKey = 'chat_history_anonymous';
          await AsyncStorage.setItem(tempKey, JSON.stringify(newMessages));
          console.log('Saved chat history to anonymous AsyncStorage key');
        } catch (storageError) {
          console.error('Error saving to AsyncStorage (anonymous):', storageError);
        }
      }
    } catch (error) {
      console.error('Error saving chat history:', error);
      // As a final fallback, save to device storage
      try {
        const tempKey = 'chat_history_anonymous';
        await AsyncStorage.setItem(tempKey, JSON.stringify(newMessages));
      } catch (storageError) {
        console.error('Error saving fallback chat history to AsyncStorage:', storageError);
      }
    }
  };

  // Initialize voice service
  const initializeVoiceService = async () => {
    try {
      await VoiceService.initialize();
      console.log('Voice service initialized');
    } catch (error) {
      console.error('Error initializing voice service:', error);
    }
  };

  // Initialize voice input service
  const initializeVoiceInput = async () => {
    try {
      const success = await VoiceInputService.initialize();
      if (success) {
        console.log('Voice input service initialized');
      } else {
        console.log('Voice input service initialization failed');
        setVoiceInputEnabled(false);
      }
    } catch (error) {
      console.error('Error initializing voice input service:', error);
      setVoiceInputEnabled(false);
    }
  };

    // Handle voice input recording - press and hold style
  const handleVoiceInputToggle = async () => {
    if (!voiceInputEnabled || isLoading) {
      console.log("Voice input is disabled or loading");
      return;
    }

    if (isRecording) {
      // Stop recording
      console.log("Stopping voice recording...");

      setIsRecording(false);
      if (recordingTimeout) {
        clearTimeout(recordingTimeout);
        setRecordingTimeout(null);
      }
      await VoiceInputService.stopRecording();
    } else {
      // Start recording
      setIsRecording(true);
      
      // Set a timeout to auto-stop after 30 seconds
      const timeout = setTimeout(() => {
        if (isRecording) {
          handleVoiceInputToggle();
        }
      }, 30000);
      setRecordingTimeout(timeout);

      await VoiceInputService.startRecording(
        (transcribedText) => {
          // Handle successful transcription
          console.log("Voice input transcribed:", transcribedText);
          setIsRecording(false);
          if (recordingTimeout) {
            clearTimeout(recordingTimeout);
            setRecordingTimeout(null);
          }
          // Automatically send the message
          if (transcribedText.trim()) {
            console.log("Auto-sending voice message:", transcribedText);
            sendVoiceMessage(transcribedText);
          }
        },
        (error) => {
          // Handle transcription error
          console.error("Voice input error:", error);
          setIsRecording(false);
          if (recordingTimeout) {
            clearTimeout(recordingTimeout);
            setRecordingTimeout(null);
          }
        }
      );
    }
  };

  // Clear chat history (for testing)
  const clearChatHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await AsyncStorage.removeItem(`chat_history_${user.id}`);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

const fetchUserProfile = async () => {
  try {
    // Use the new authService to get current user with session refresh
    const user = await authService.getCurrentUser();
    
    if (!user) {
        console.log('❌ No authenticated user found');
        // Try to load any anonymous local chat first to avoid overwriting
        try {
          const anonStored = await AsyncStorage.getItem('chat_history_anonymous');
          if (anonStored) {
            const parsed = JSON.parse(anonStored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMessages(parsed);
              console.log('Loaded anonymous chat from AsyncStorage');
              return;
            }
          }
        } catch (e) {
          console.warn('Error checking anonymous AsyncStorage:', e);
        }
        // No local chat found — show a welcome message
        const welcomeMessage = {
          id: Date.now(),
          text: "Hi there! It's Pixel here. Please log in to continue our conversation.",
          sender: 'ai',
          timestamp: new Date().toISOString(),
        };
        setMessages([welcomeMessage]);
        return;
      }

      // Now fetch the profile using the authenticated user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Error fetching profile:', profileError);
        throw profileError;
      }

      if (profile) {
        setUserProfile(profile);
        const companionNameToUse = profile.companion_name || 'Pixel';
        setCompanionName(companionNameToUse);
        console.log('🎯 Companion name set from profile:', companionNameToUse);
        
        const voicePref = profile.voice_enabled !== false;
        setVoiceEnabled(voicePref);
        VoiceService.setVoiceEnabled(voicePref);
        console.log('🎙️ Voice preference loaded:', voicePref);
        
        // Only set welcome message if there is no existing conversation saved
        try {
          const existingConversations = await MemoryService.loadConversations(user.id, 50);
          if (Array.isArray(existingConversations) && existingConversations.length > 0) {
            // Use conversations loaded from DB (initializeMemorySystem already set state when available)
            console.log('Existing conversations found in DB; not setting welcome message');
          } else {
            // Check AsyncStorage backup before creating a new welcome message
            const stored = await AsyncStorage.getItem(`chat_history_${user.id}`);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setMessages(parsed);
                console.log('Loaded chat history from AsyncStorage backup');
              } else {
                const welcomeMessage = {
                  id: Date.now(),
                  text: `Hi ${profile.first_name || 'there'}! It's ${companionNameToUse} here. I'm happy to chat with you! How's your day going?`,
                  sender: 'ai',
                  timestamp: new Date().toISOString(),
                };
                setMessages([welcomeMessage]);
                try {
                  await saveChatHistory([welcomeMessage]);
                  console.log('🎯 Welcome message saved');
                } catch (saveErr) {
                  console.warn('⚠️ Failed to save welcome message:', saveErr);
                }
              }
            } else {
              const welcomeMessage = {
                id: Date.now(),
                text: `Hi ${profile.first_name || 'there'}! It's ${companionNameToUse} here. I'm happy to chat with you! How's your day going?`,
                sender: 'ai',
                timestamp: new Date().toISOString(),
              };
              setMessages([welcomeMessage]);
              try {
                await saveChatHistory([welcomeMessage]);
                console.log('🎯 Welcome message saved');
              } catch (saveErr) {
                console.warn('⚠️ Failed to save welcome message:', saveErr);
              }
            }
          }
        } catch (err) {
          console.warn('Error checking existing conversations before welcome:', err);
        }
      } else {
        console.log('⚠️ No profile found for user');
        // Set default welcome if no profile and no existing conversations
        try {
          const existingConversations = await MemoryService.loadConversations(user.id, 50);
          if (Array.isArray(existingConversations) && existingConversations.length > 0) {
            console.log('Existing conversations found; skipping default welcome');
          } else {
            const stored = await AsyncStorage.getItem(`chat_history_${user.id}`);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setMessages(parsed);
                console.log('Loaded chat history from AsyncStorage backup (no profile)');
              } else {
                const welcomeMessage = {
                  id: Date.now(),
                  text: "Hi there! It's Pixel here. I'm happy to chat with you! How's your day going?",
                  sender: 'ai',
                  timestamp: new Date().toISOString(),
                };
                setMessages([welcomeMessage]);
                try {
                  await saveChatHistory([welcomeMessage]);
                  console.log('🎯 Default welcome saved');
                } catch (saveErr) {
                  console.warn('⚠️ Failed to save default welcome message:', saveErr);
                }
              }
            } else {
              const welcomeMessage = {
                id: Date.now(),
                text: "Hi there! It's Pixel here. I'm happy to chat with you! How's your day going?",
                sender: 'ai',
                timestamp: new Date().toISOString(),
              };
              setMessages([welcomeMessage]);
              try {
                await saveChatHistory([welcomeMessage]);
                console.log('🎯 Default welcome saved');
              } catch (saveErr) {
                console.warn('⚠️ Failed to save default welcome message:', saveErr);
              }
            }
          }
        } catch (err) {
          console.warn('Error checking existing conversations before default welcome:', err);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      // Fallback welcome message
      const welcomeMessage = {
        id: Date.now(),
        text: "Hi there! I'm Pixel, your AI companion. I'm happy to chat with you! What would you like to talk about?",
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
      try {
        await saveChatHistory([welcomeMessage]);
        console.log('🎯 Fallback welcome saved');
      } catch (saveErr) {
        console.warn('⚠️ Failed to save fallback welcome message:', saveErr);
      }
    }
  };

  const sendVoiceMessage = async (voiceText) => {
    if (!voiceText.trim() || isLoading) return;

    try {
      // Check if user is still authenticated before sending
      console.log('🔐 Checking authentication before sending voice message...');
      const user = await authService.getCurrentUser();
      
      if (!user) {
        Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
        console.log('❌ User not authenticated, cannot send voice message');
        return;
      }

      const userMessage = {
        id: Date.now(),
        text: voiceText.trim(),
        sender: 'user',
        timestamp: new Date().toISOString(),
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      saveChatHistory(newMessages);
      setIsLoading(true);

      // Get device ID
      const deviceId = await deviceIdService.getDeviceId();
      console.log('📱 Using device ID:', deviceId);

      // Get enhanced context from memory system
      let conversationHistory = [];

      if (user) {
        try {
          conversationHistory = await MemoryService.getConversationContext(user.id, 10);
          console.log('📄 Loaded conversation context from database:', conversationHistory.length, 'messages');
        } catch (contextError) {
          console.warn('⚠️ Could not load conversation context:', contextError);
        }
      }

      // Ensure conversation history is in the correct format
      if (conversationHistory.length === 0) {
        console.log('📄 Using current messages as conversation history');
        // Fallback to current messages if database context is empty
        conversationHistory = messages
          .filter(msg => {
            // Include user messages
            if (msg.sender === 'user') return true;
            // Include AI messages that are responses to user messages (not welcome messages)
            if (msg.sender === 'ai') {
              const isWelcomeMessage = msg.text.includes('I\'m so excited to chat with you') || 
                                    msg.text.includes('What would you like to talk about');
              return !isWelcomeMessage;
            }
            return false;
          })
          .map(msg => ({
            sender_type: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          }));
      } else {
        // Convert memory system format to AI service format
        conversationHistory = conversationHistory
          .filter(msg => {
            // Filter out welcome messages
            if (msg.sender === 'ai') {
              const isWelcomeMessage = msg.text.includes('I\'m so excited to chat with you') || 
                                    msg.text.includes('What would you like to talk about');
              return !isWelcomeMessage;
            }
            return true;
          })
          .map(msg => ({
            sender_type: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          }));
      }

      // Debug: Log what's being sent to AI
      console.log('Sending voice to AI:', {
        voiceText: voiceText,
        companionName: companionName,
        deviceId: deviceId,
        conversationHistoryLength: conversationHistory.length,
        conversationHistory: conversationHistory.slice(-5) // Only show last 5 messages for debugging
      });

      // Keep conversation history manageable but not too short
      if (conversationHistory.length > 50) {
        console.log('Conversation history too long, trimming...');
        conversationHistory = conversationHistory.slice(-40); // Keep last 40 messages for better context
      }

      // Get AI response
      console.log('🤖 Calling AI service for voice message...', userProfile);
      const response = await AIService.sendMessage(
        voiceText + " (System Note: Please vary your vocabulary and avoid repeatedly using words like 'Great', 'Happy', 'Thrilled', 'Ah', or 'Oh' at the start of sentences.)",
        conversationHistory,
        companionName,
        deviceId,
        userProfile.id,
      );
      
      const aiMessage = {
        id: Date.now() + 1,
        text: response.content || "I'm here to chat with you! This is a basic working version.",
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };

      // Start voice synthesis immediately after getting AI response
      console.log('🎙️ Voice enabled in chat:', voiceEnabled);
      if (voiceEnabled) {
        // Show speaking indicator immediately to indicate voice is being prepared
        setIsSpeaking(true);
        setVoiceStatus('preparing');
        
        // Set up callbacks for voice start/end
        VoiceService.onVoiceStart = () => {
          console.log('🎵 Voice started playing - changing indicator text');
          setVoiceStatus('speaking');
        };
        VoiceService.onVoiceEnd = () => {
          console.log('🎵 Voice ended - hiding speaking indicator');
          setIsSpeaking(false);
          setVoiceStatus('');
        };
        
        // Start voice synthesis
        VoiceService.speak(aiMessage.text)
          .then(() => {
            console.log('✅ Voice synthesis completed successfully');
          })
          .catch((error) => {
            console.error('❌ Voice synthesis failed:', error);
            setIsSpeaking(false); // Hide indicator if synthesis fails
            setVoiceStatus('');
          });
        console.log('🎵 Voice synthesis started immediately for response length:', aiMessage.text.length);
      }

      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      saveChatHistory(updatedMessages);

    } catch (error) {
      console.error('❌ AI Service Error:', error);
      
      // Handle JWT errors
      if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
        console.warn('⏰ JWT expired during voice send, refreshing...');
        const refreshed = await authService.refreshSession();
        if (refreshed) {
          console.log('🔄 Retrying voice message after session refresh');
          return sendVoiceMessage(voiceText); // Retry with original text
        } else {
          Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
        }
      } else {
        // Fallback response
        const aiMessage = {
          id: Date.now() + 1,
          text: "I'm having trouble connecting right now, but I'm here to chat! What's on your mind?",
          sender: 'ai',
          timestamp: new Date().toISOString(),
        };
        
        const updatedMessages = [...messages, aiMessage];
        setMessages(updatedMessages);
        saveChatHistory(updatedMessages);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    try {
      // Check if user is still authenticated before sending
      const user = await authService.getCurrentUser();
      
      if (!user) {
        Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
        return;
      }

      const userMessage = {
        id: Date.now(),
        text: inputText.trim(),
        sender: 'user',
        timestamp: new Date().toISOString(),
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      saveChatHistory(newMessages);
      setInputText('');
      setIsLoading(true);

      // Get device ID
      const deviceId = await deviceIdService.getDeviceId();
      console.log('🔱 Using device ID:', deviceId);

      // Get enhanced context from memory system
      let conversationHistory = [];

      if (user) {
        try {
          conversationHistory = await MemoryService.getConversationContext(user.id, 10);
          console.log('📖 Loaded conversation context from database:', conversationHistory.length, 'messages');
        } catch (contextError) {
          console.warn('⚠️ Could not load conversation context:', contextError);
        }
      }

      // Ensure conversation history is in the correct format
      if (conversationHistory.length === 0) {
        console.log('📖 Using current messages as conversation history');
        // Fallback to current messages if database context is empty
        conversationHistory = messages
          .filter(msg => {
            // Include user messages
            if (msg.sender === 'user') return true;
            // Include AI messages that are responses to user messages (not welcome messages)
            if (msg.sender === 'ai') {
              const isWelcomeMessage = msg.text.includes('I\'m so excited to chat with you') || 
                                    msg.text.includes('What would you like to talk about');
              return !isWelcomeMessage;
            }
            return false;
          })
          .map(msg => ({
            sender_type: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          }));
      } else {
        // Convert memory system format to AI service format
        conversationHistory = conversationHistory
          .filter(msg => {
            // Filter out welcome messages
            if (msg.sender === 'ai') {
              const isWelcomeMessage = msg.text.includes('I\'m so excited to chat with you') || 
                                    msg.text.includes('What would you like to talk about');
              return !isWelcomeMessage;
            }
            return true;
          })
          .map(msg => ({
            sender_type: msg.sender === 'user' ? 'user' : 'assistant',
            content: msg.text
          }));
      }

      // Debug: Log what's being sent to AI
      console.log('Sending to AI:', {
        userMessage: inputText.trim(),
        companionName: companionName,
        deviceId: deviceId,
        conversationHistoryLength: conversationHistory.length,
        conversationHistory: conversationHistory.slice(-5) // Only show last 5 messages for debugging
      });

      // Keep conversation history manageable but not too short
      if (conversationHistory.length > 50) {
        console.log('Conversation history too long, trimming...');
        conversationHistory = conversationHistory.slice(-40); // Keep last 40 messages for better context
      }

      // Get AI response
      console.log('🤖 Calling AI service...', deviceId);
      console.log('🤖 Calling AI service for voice message...', userProfile);
      console.log('🤖 Calling AI service for voice message userProfileID...', userProfile['id']);
      const response = await AIService.sendMessage(
        userMessage.text + " (System Note: Please vary your vocabulary and avoid repeatedly using words like 'Great', 'Happy', 'Thrilled', 'Ah', or 'Oh' at the start of sentences.)",
        conversationHistory,
        companionName,
        deviceId,
        userProfile['id'],
      );
      
      const aiMessage = {
        id: Date.now() + 1,
        text: response.content || "I'm here to chat with you! This is a basic working version.",
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };

      // Start voice synthesis if enabled
      console.log('🎙️ Voice enabled in chat:', voiceEnabled);
      if (voiceEnabled) {
        // Show speaking indicator immediately to indicate voice is being prepared
        setIsSpeaking(true);
        setVoiceStatus('preparing');
        
        // Set up callbacks for voice start/end
        VoiceService.onVoiceStart = () => {
          console.log('🎵 Voice started playing - changing indicator text');
          setVoiceStatus('speaking');
        };
        VoiceService.onVoiceEnd = () => {
          console.log('🎵 Voice ended - hiding speaking indicator');
          setIsSpeaking(false);
          setVoiceStatus('');
        };
        
        // Start voice synthesis
        VoiceService.speak(aiMessage.text)
          .then(() => {
            console.log('✅ Voice synthesis completed successfully');
          })
          .catch((error) => {
            console.error('❌ Voice synthesis failed:', error);
            setIsSpeaking(false); // Hide indicator if synthesis fails
            setVoiceStatus('');
          });
        console.log('🎵 Voice synthesis started immediately for response length:', aiMessage.text.length);
      }

      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      saveChatHistory(updatedMessages);

    } catch (error) {
      console.error('❌ AI Service Error:', error);
      
      // Handle JWT errors
      if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
        console.warn('⏰ JWT expired during send, refreshing...');
        const refreshed = await authService.refreshSession();
        if (refreshed) {
          console.log('📄 Retrying message after session refresh');
          return sendMessage(); // Retry with original text
        } else {
          Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
        }
      } else {
        // Fallback response
        const aiMessage = {
          id: Date.now() + 1,
          text: "I'm having trouble connecting right now, but I'm here to chat! What's on your mind?",
          sender: 'ai',
          timestamp: new Date().toISOString(),
        };
        
        const updatedMessages = [...messages, aiMessage];
        setMessages(updatedMessages);
        saveChatHistory(updatedMessages);
      }
    } finally {
      setIsLoading(false);
    }
  };


  const parseMarkdownLinks = (text) => {
    const parts = [];
    // Regex to match markdown links: [text](url)
    const markdownLinkRegex = /\[([^\]]+)\]\(https?:\/\/[^\)]+\)/g;
    // Regex to match plain URLs
    const plainUrlRegex = /(https?:\/\/[^\s)]+)/g;
    
    let lastIndex = 0;
    let match;

    // First, handle markdown links [text](url)
    const markdownRegex = new RegExp(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g);
    
    while ((match = markdownRegex.exec(text)) !== null) {
      // Add text before the markdown link
      if (match.index > lastIndex) {
        parts.push({ 
          type: 'text', 
          content: text.slice(lastIndex, match.index) 
        });
      }
      
      // Add the markdown link (with display text and URL)
      parts.push({ 
        type: 'link', 
        displayText: match[1], 
        url: match[2] 
      });
      
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      const remaining = text.slice(lastIndex);
      
      // Check if remaining text has plain URLs (but not already parsed as markdown)
      let remainingLastIndex = 0;
      const plainRegex = new RegExp(/(https?:\/\/[^\s)]+)/g);
      let plainMatch;
      
      while ((plainMatch = plainRegex.exec(remaining)) !== null) {
        // Add text before URL
        if (plainMatch.index > remainingLastIndex) {
          parts.push({ 
            type: 'text', 
            content: remaining.slice(remainingLastIndex, plainMatch.index) 
          });
        }
        
        // Add plain URL
        parts.push({ 
          type: 'link', 
          displayText: plainMatch[0], 
          url: plainMatch[0] 
        });
        
        remainingLastIndex = plainMatch.index + plainMatch[0].length;
      }
      
      // Add any final remaining text
      if (remainingLastIndex < remaining.length) {
        parts.push({ 
          type: 'text', 
          content: remaining.slice(remainingLastIndex) 
        });
      }
    }

    return parts.length > 0 ? parts : [{ type: 'text', content: text }];
  };

  const renderMessage = ({ item }) => {
    const parts = parseMarkdownLinks(item.text);

    return (
      <View style={[
        styles.messageContainer,
        item.sender === 'user' ? styles.userMessage : styles.aiMessage
      ]}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {parts.map((part, idx) => {
            if (part.type === 'link') {
              return (
                <TouchableOpacity
                  key={`link-${idx}`}
                  onPress={() => {
                    console.log('Opening URL:', part.url);
                    Linking.openURL(part.url).catch(err => {
                      console.error('Failed to open URL:', err);
                      Alert.alert('Error', 'Could not open URL');
                    });
                  }}
                  activeOpacity={0.6}
                >
                  <Text
                    style={[
                      styles.messageText,
                      item.sender === 'user' ? styles.userMessageText : styles.aiMessageText,
                      { 
                        color: item.sender === 'user' ? '#87CEEB' : '#2563EB',
                        textDecorationLine: 'underline',
                        paddingHorizontal: 0,
                        marginHorizontal: 0,
                      }
                    ]}
                  >
                    {part.displayText}
                  </Text>
                </TouchableOpacity>
              );
            }

            // Regular text
            if (part.content) {
              return (
                <Text
                  key={`text-${idx}`}
                  style={[
                    styles.messageText,
                    item.sender === 'user' ? styles.userMessageText : styles.aiMessageText
                  ]}
                >
                  {part.content}
                </Text>
              );
            }

            return null;
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#10B981" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chat with {companionName}</Text>
                                <View style={styles.headerButtons}>
            <TouchableOpacity
                          style={styles.profileButton}
              onPress={() => router.push('/profile')}
                        >
                          <Ionicons name="person-circle-outline" size={32} color="#10B981" />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id.toString()}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          keyboardShouldPersistTaps="handled"
        />

        {isLoading && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>{companionName} is typing...</Text>
          </View>
        )}
        
        {isSpeaking && (
          <View style={styles.speakingIndicator}>
            <Text style={styles.speakingText}>
              {companionName} is {voiceStatus === 'speaking' ? 'speaking...' : 'preparing voice...'}
            </Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={[styles.voiceButton, isRecording && styles.voiceButtonRecording]}
            onPress={handleVoiceInputToggle}
            
            disabled={!voiceInputEnabled || isLoading}
          >
            <Ionicons 
              name={isRecording ? "stop-circle" : "mic"} 
              size={24} 
              color={isRecording ? "#ef4444" : "#10B981"} 
            />
            {isRecording && (
              <View style={styles.recordingIndicator}>
                <Text style={styles.recordingText}>Recording...</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor="#6B7280"
            multiline
            maxLength={500}
          />
          
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileButton: {
    padding: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#10B981',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  aiMessageText: {
    color: '#111827',
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  speakingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  speakingText: {
    fontSize: 14,
    color: '#10B981',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
    maxHeight: 100,
  },
  voiceButton: {
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
    marginRight: 8,
    flexShrink: 0,
  },
  voiceButtonRecording: {
    backgroundColor: '#FEF2F2',
    borderColor: '#ef4444',
  },
  recordingIndicator: {
    position: 'absolute',
    top: -30,
    left: 0,
    right: 0,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  recordingText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  sendButton: {
    backgroundColor: '#10B981',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
