import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AIService } from '../lib/aiService';
import { supabase } from '../lib/supabase';
import { MemoryService } from '../lib/memoryService';
import { VoiceService } from '../lib/voiceService';
import { VoiceInputService } from '../lib/voiceInputService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [companionName, setCompanionName] = useState('Pixel');
  const [userProfile, setUserProfile] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceInputEnabled, setVoiceInputEnabled] = useState(true);

  const [recordingTimeout, setRecordingTimeout] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchUserProfile();
    initializeMemorySystem();
    initializeVoiceService();
    initializeVoiceInput();
  }, []);

  // Initialize memory system and load chat history
  const initializeMemorySystem = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('Initializing memory system for user:', user.id);
        
        // Initialize memory system for new users
        await MemoryService.initializeUserMemory(user.id);
        
        // Load recent conversations
        const conversations = await MemoryService.loadConversations(user.id, 1);
        console.log('Loaded conversations from database:', conversations?.length || 0);
        
        if (conversations && conversations.length > 0) {
          setMessages(conversations);
          console.log('Set messages from database');
        } else {
          // If no database conversations, try AsyncStorage
          console.log('No database conversations, trying AsyncStorage...');
          await loadChatHistoryFromStorage();
        }
      }
    } catch (error) {
      console.error('Error initializing memory system:', error);
      // Fallback to AsyncStorage
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Save to database
        await MemoryService.saveConversation(user.id, newMessages);
        
        // Also save to AsyncStorage as backup
        await AsyncStorage.setItem(`chat_history_${user.id}`, JSON.stringify(newMessages));
      }
    } catch (error) {
      console.error('Error saving chat history:', error);
      // Fallback to AsyncStorage only
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await AsyncStorage.setItem(`chat_history_${user.id}`, JSON.stringify(newMessages));
        }
      } catch (storageError) {
        console.error('Error saving to AsyncStorage:', storageError);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
      const { data: profile } = await supabase
        .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

                            if (profile) {
                      setUserProfile(profile);
                      setCompanionName(profile.companion_name || 'Pixel');
                      const voicePref = profile.voice_enabled !== false; // Default to true if not set
                      setVoiceEnabled(voicePref);
                      VoiceService.setVoiceEnabled(voicePref); // Set VoiceService state properly
                      console.log('Voice preference loaded:', profile.voice_enabled, 'Voice enabled:', voicePref);
          
          // Only set welcome message if no existing messages
          if (!messages || messages.length === 0) {
            const welcomeMessage = {
              id: Date.now(),
              text: `Hi ${profile.first_name || 'there'}! It's ${profile.companion_name || 'Pixel'} here. I'm happy to chat with you! How's your day going?`,
              sender: 'ai',
              timestamp: new Date().toISOString(),
            };
            setMessages([welcomeMessage]);
            saveChatHistory([welcomeMessage]);
          }
        } else {
          // Only set default welcome message if no existing messages
          if (!messages || messages.length === 0) {
      const welcomeMessage = {
        id: Date.now(),
              text: "Hi there! It's Pixel here. I'm happy to chat with you! How's your day going?",
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
            saveChatHistory([welcomeMessage]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Fallback welcome message
      const welcomeMessage = {
        id: Date.now(),
        text: "Hi there! I'm Pixel, your AI companion. I'm so excited to chat with you and learn more about your day! What would you like to talk about?",
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
    }
  };



  const sendVoiceMessage = async (voiceText) => {
    if (!voiceText.trim() || isLoading) return;

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

    try {
      // Get enhanced context from memory system
      const { data: { user } } = await supabase.auth.getUser();
      let conversationHistory = [];
      let userPreferences = [];

      if (user) {
        // Get conversation context from database
        conversationHistory = await MemoryService.getConversationContext(user.id, 10);
        
        // Get user preferences context
        userPreferences = await MemoryService.getPreferencesContext(user.id);
      }

      // Ensure conversation history is in the correct format
      if (conversationHistory.length === 0) {
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
        userMessage: voiceText,
        conversationHistoryLength: conversationHistory.length,
        conversationHistory: conversationHistory.slice(-5) // Only show last 5 messages for debugging
      });

      // Keep conversation history manageable but not too short
      if (conversationHistory.length > 50) {
        console.log('Conversation history too long, trimming...');
        conversationHistory = conversationHistory.slice(-40); // Keep last 40 messages for better context
      }

      // Get AI response
      const response = await AIService.sendMessage(
        voiceText,
        conversationHistory,
        companionName
      );
      
      const aiMessage = {
        id: Date.now() + 1,
        text: response.content || "I'm here to chat with you! This is a basic working version.",
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };

      // Speak the AI response if voice is enabled in profile
      console.log('Voice enabled in chat:', voiceEnabled);
      if (voiceEnabled) {
        VoiceService.speak(aiMessage.text);
      }

      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      saveChatHistory(updatedMessages);
    } catch (error) {
      console.error('AI Service Error:', error);
      
      // Fallback response
      const aiMessage = {
        id: Date.now() + 1,
        text: "I'm having trouble connecting right now, but I'm here to chat! What's on your mind?",
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      
      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      saveChatHistory(updatedMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

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

    try {
      // Get enhanced context from memory system
      const { data: { user } } = await supabase.auth.getUser();
      let conversationHistory = [];
      let userPreferences = [];

      if (user) {
        // Get conversation context from database
        conversationHistory = await MemoryService.getConversationContext(user.id, 10);
        
        // Get user preferences context
        userPreferences = await MemoryService.getPreferencesContext(user.id);
      }

      // Ensure conversation history is in the correct format
      if (conversationHistory.length === 0) {
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
        userMessage: userMessage.text,
        conversationHistoryLength: conversationHistory.length,
        conversationHistory: conversationHistory.slice(-5) // Only show last 5 messages for debugging
      });

      // Keep conversation history manageable but not too short
      if (conversationHistory.length > 50) {
        console.log('Conversation history too long, trimming...');
        conversationHistory = conversationHistory.slice(-40); // Keep last 40 messages for better context
      }

      // Get AI response
      const response = await AIService.sendMessage(
        userMessage.text,
        conversationHistory,
        companionName
      );
      
      const aiMessage = {
        id: Date.now() + 1,
        text: response.content || "I'm here to chat with you! This is a basic working version.",
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };

                        // Speak the AI response if voice is enabled in profile
                  console.log('Voice enabled in chat:', voiceEnabled);
                  if (voiceEnabled) {
                    VoiceService.speak(aiMessage.text);
                  }

      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      saveChatHistory(updatedMessages);
    } catch (error) {
      console.error('AI Service Error:', error);
      
      // Fallback response
      const aiMessage = {
        id: Date.now() + 1,
        text: "I'm having trouble connecting right now, but I'm here to chat! What's on your mind?",
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };
      
      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      saveChatHistory(updatedMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => (
    <View style={[
      styles.messageContainer,
      item.sender === 'user' ? styles.userMessage : styles.aiMessage
    ]}>
      <Text style={[
        styles.messageText,
        item.sender === 'user' ? styles.userMessageText : styles.aiMessageText
      ]}>
          {item.text}
        </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
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
  voiceButton: {
    padding: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10B981',
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
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
