import * as React from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Button, Card, Provider as PaperProvider, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { AIService } from '../lib/aiService';
import { voiceService } from '../lib/voiceService';

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
  const [communicationMode, setCommunicationMode] = React.useState('text');
  const [accent, setAccent] = React.useState('American');
  const [isListening, setIsListening] = React.useState(false);
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
          .select('first_name, companion_name, communication_mode, accent')
          .eq('id', user.id);

        if (data && data.length > 0) {
          const profile = data[0];
          console.log('Profile data:', profile); // Debug log
          console.log('Companion name from DB:', profile.companion_name); // Debug log
          console.log('Communication mode from DB:', profile.communication_mode); // Debug log
          setUserName(profile.first_name || '');
          setCompanionName(profile.companion_name || 'Pixel');
          console.log('Setting companion name to:', profile.companion_name || 'Pixel'); // Debug log
          setCommunicationMode(profile.communication_mode || 'text');
          setAccent(profile.accent || 'American');
          
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
            setMessages([{
              id: 1,
              text: `Hi ${profile.first_name || 'there'}! I'm ${profile.companion_name || 'Pixel'}, your Pocket Companion. How can I help you today?`,
              sender: 'companion',
              timestamp: new Date(),
            }]);
          }
        }

        // Initialize voice service
        try {
          await voiceService.initializeVoice();
        } catch (error) {
          console.log('Voice service not available:', error);
          // Continue without voice functionality
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

  // Voice input handlers
  const handleVoiceInput = async () => {
    if (communicationMode === 'text') {
      Alert.alert('Voice Not Enabled', 'Please enable voice mode in your profile settings.');
      return;
    }

    if (isListening) {
      await voiceService.stopListening();
      setIsListening(false);
    } else {
      const success = await voiceService.startListening();
      if (success) {
        setIsListening(true);
      }
    }
  };

  const handleVoiceResult = (recognizedText) => {
    setInputText(recognizedText);
    setIsListening(false);
  };

  const handleBackPress = () => {
    if (messages.length > 1) {
      Alert.alert(
        'Leave Chat?',
        'Are you sure you want to leave the chat? Your conversation will be saved.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessageText = inputText.trim();
    setInputText('');
    setIsLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in again.');
        return;
      }

      // Save user message to database
      const userMessage = await AIService.saveMessageToDatabase(
        user.id,
        userMessageText,
        'user'
      );

      // Add user message to UI
      const userMessageUI = {
        id: userMessage.id,
        text: userMessageText,
        sender: 'user',
        timestamp: new Date(userMessage.created_at),
      };
      setMessages(prev => [...prev, userMessageUI]);

      // Get conversation history for context
      const conversationHistory = await AIService.getConversationHistory(user.id, 10);

      // Get AI response
      const aiResponse = await AIService.sendMessage(
        userMessageText,
        conversationHistory,
        companionName
      );

      // Save AI response to database
      const savedAiMessage = await AIService.saveMessageToDatabase(
        user.id,
        aiResponse.content,
        'companion',
        userMessage.conversation_id
      );

      // Add AI response to UI
      const aiMessageUI = {
        id: savedAiMessage.id,
        text: aiResponse.content,
        sender: 'companion',
        timestamp: new Date(savedAiMessage.created_at),
      };
      setMessages(prev => [...prev, aiMessageUI]);

    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.message || 'Failed to send message. Please try again.');
      
      // Add error message to UI
      const errorMessage = {
        id: Date.now(),
        text: 'Sorry, I\'m having trouble responding right now. Please try again.',
        sender: 'companion',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message) => {
    const isUser = message.sender === 'user';
    
    return (
      <View
        key={message.id}
        style={{
          flexDirection: 'row',
          marginVertical: 4,
          paddingHorizontal: 16,
          justifyContent: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        <View
          style={{
            maxWidth: '80%',
            backgroundColor: isUser ? '#00B686' : '#f8f9fa',
            borderRadius: 18,
            padding: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          }}
        >
          <Text
            style={{
              color: isUser ? 'white' : '#333',
              fontSize: 16,
              lineHeight: 22,
            }}
          >
            {message.text}
          </Text>
          <Text
            style={{
              color: isUser ? 'rgba(255,255,255,0.7)' : '#999',
              fontSize: 12,
              marginTop: 4,
            }}
          >
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <PaperProvider>
      <View style={{ flex: 1, backgroundColor: '#f0fdf4' }}>
        {/* Header */}
        <View style={{
          backgroundColor: '#ffffff',
          paddingHorizontal: 20,
          paddingVertical: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
        }}>
          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            color: '#00B686',
            textAlign: 'center',
          }}>
            Chat with {companionName}
          </Text>
          <View style={{ marginTop: 8 }}>
            <Text style={{
              fontSize: 11,
              color: '#9ca3af',
              textAlign: 'center',
              fontStyle: 'italic',
            }}>
              For general assistance only
            </Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 16, paddingBottom: 20 }}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map(renderMessage)}
          {isLoading && (
            <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
              <View style={{ 
                backgroundColor: '#f8f9fa', 
                borderRadius: 18, 
                maxWidth: '80%',
                padding: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              }}>
                <Text style={{ color: '#666', fontSize: 16 }}>
                  {companionName || 'Companion'} is typing...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
          style={{ backgroundColor: 'white' }}
        >
          <View style={{
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            paddingHorizontal: 16,
            paddingVertical: 12,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder="Type your message..."
                  placeholderTextColor="#999"
                  multiline
                  maxLength={500}
                  style={{
                    backgroundColor: '#f8f9fa',
                    borderRadius: 20,
                    maxHeight: 100,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                  }}
                  contentStyle={{ fontSize: 16 }}
                />
              </View>
              
              {/* Voice Input Button (if voice mode is enabled) */}
              {communicationMode === 'voice' && (
                <TouchableOpacity
                  onPress={handleVoiceInput}
                  style={{
                    backgroundColor: isListening ? '#dc2626' : '#00B686',
                    borderRadius: 20,
                    width: 40,
                    height: 40,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 8,
                  }}
                >
                  <Ionicons 
                    name={isListening ? "mic" : "mic-outline"} 
                    size={20} 
                    color="white" 
                  />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                onPress={sendMessage}
                disabled={!inputText.trim() || isLoading}
                style={{
                  backgroundColor: inputText.trim() && !isLoading ? '#00B686' : '#e5e7eb',
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: 'white', fontSize: 18 }}>→</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </PaperProvider>
  );
}
