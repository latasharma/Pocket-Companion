import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Card, Provider as PaperProvider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AIService } from '../../lib/aiService';
import { supabase } from '../../lib/supabase';

export default function ChatScreen() {
  const [messages, setMessages] = React.useState([
    {
      id: 1,
      text: "Hi Lata! I'm Pixel, your Pocket Companion. How can I help you today?",
      sender: 'companion',
      timestamp: new Date(),
    }
  ]);
  const [inputText, setInputText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [userName, setUserName] = React.useState('');
  const [companionName, setCompanionName] = React.useState('');
  const scrollViewRef = React.useRef();
  const router = useRouter();

  React.useEffect(() => {
    const fetchUserInfoAndHistory = async () => {
      try {
        const userResult = await supabase.auth.getUser();
        if (!userResult || userResult.error || !userResult.data || !userResult.data.user) {
          return;
        }
        const user = userResult.data.user;

        // Get user profile
        const { data } = await supabase
          .from('profiles')
          .select('first_name, companion_name')
          .eq('id', user.id);

        if (data && data.length > 0) {
          const profile = data[0];
          console.log('Profile data:', profile);
          console.log('Companion name from DB:', profile.companion_name);
          setUserName(profile.first_name || '');
          setCompanionName(profile.companion_name || 'Pixel');
          console.log('Setting companion name to:', profile.companion_name || 'Pixel');
          
          // Get conversation history
          const conversationHistory = await AIService.getConversationHistory(user.id, 20);
          
          if (conversationHistory.length > 0) {
            // Convert database messages to UI format
            const historyMessages = conversationHistory.map(msg => ({
              id: msg.id,
              text: msg.content,
              sender: msg.sender_type === 'user' ? 'user' : 'companion',
              timestamp: new Date(msg.created_at),
            }));
            setMessages(historyMessages);
          } else {
            // No history, show welcome message
            const welcomeMessage = `Hi ${profile.first_name || 'there'}! I'm ${profile.companion_name || 'Pixel'}, your Pocket Companion. How can I help you today?`;
            setMessages([{
              id: 1,
              text: welcomeMessage,
              sender: 'companion',
              timestamp: new Date(),
            }]);
          }
        }

      } catch (error) {
        console.error('Error loading chat history:', error);
        // Show basic welcome message on error
        setMessages([{
          id: 1,
          text: "Hi! I'm Pixel, your Pocket Companion. How can I help you today?",
          sender: 'companion',
          timestamp: new Date(),
        }]);
      }
    };
    fetchUserInfoAndHistory();
  }, []);

  // Debug companion name changes
  React.useEffect(() => {
    console.log('Companion name state changed to:', companionName);
  }, [companionName]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    setIsLoading(true);

    // Add user message to chat
    const userMessageObj = {
      id: Date.now(),
      text: userMessage,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessageObj]);

    try {
      // Get current user
      const userResult = await supabase.auth.getUser();
      if (!userResult.data.user) {
        throw new Error('User not authenticated');
      }

      // Get conversation history for context
      const conversationHistory = await AIService.getConversationHistory(userResult.data.user.id, 10);

      // Send to AI service
      const response = await AIService.sendMessage(userMessage, conversationHistory, companionName);

      // Add AI response to chat
      const aiMessageObj = {
        id: Date.now() + 1,
        text: response.content,
        sender: 'companion',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessageObj]);

      // Save messages to database
      await AIService.saveMessageToDatabase(userResult.data.user.id, userMessage, 'user');
      await AIService.saveMessageToDatabase(userResult.data.user.id, response.content, 'companion');

    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message) => {
    const isUser = message.sender === 'user';
    
    return (
      <View key={message.id} style={[
        styles.messageContainer,
        isUser ? styles.userMessage : styles.companionMessage
      ]}>
        <Card style={[
          styles.messageCard,
          isUser ? styles.userCard : styles.companionCard
        ]}>
          <Card.Content style={styles.messageContent}>
            <Text style={[
              styles.messageText,
              isUser ? styles.userText : styles.companionText
            ]}>
              {message.text}
            </Text>
            <Text style={styles.timestamp}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </Card.Content>
        </Card>
      </View>
    );
  };

  return (
    <PaperProvider>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => {
              console.log('Back button pressed');
              router.push('/(tabs)/');
            }} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              console.log('Home button pressed');
              router.push('/(tabs)/');
            }} style={styles.homeButton}>
              <Ionicons name="home" size={24} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              console.log('Settings button pressed');
              router.push('/(tabs)/settings');
            }} style={styles.settingsButton}>
              <Ionicons name="settings" size={24} color="#3B82F6" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Chat with {companionName}</Text>
            <View style={styles.securityIndicator}>
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text style={styles.securityText}>E2EE</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => router.push('/profile')} style={styles.profileButton}>
              <Ionicons name="person" size={24} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(renderMessage)}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Pixel is thinking...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inputContainer}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your message..."
              multiline
              maxLength={1000}
              disabled={isLoading}
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() || isLoading ? styles.sendButtonDisabled : null]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={!inputText.trim() || isLoading ? '#9CA3AF' : '#FFFFFF'} 
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 10,
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  homeButton: {
    marginRight: 10,
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  settingsButton: {
    marginLeft: 10,
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    marginLeft: 10,
  },
  securityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  securityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  companionMessage: {
    alignItems: 'flex-start',
  },
  messageCard: {
    maxWidth: '80%',
  },
  userCard: {
    backgroundColor: '#3B82F6',
  },
  companionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageContent: {
    padding: 12,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  companionText: {
    color: '#1F2937',
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
}); 