import { supabase } from './supabase';

export class MemoryService {
  // Initialize user's memory system (simplified)
  static async initializeUserMemory(userId) {
    try {
                    // Check if user_memory record exists, create if not
              const { data: existingMemory, error: selectError } = await supabase
                .from('user_memory')
                .select('id')
                .eq('user_id', userId)
                .maybeSingle();

              if (selectError) {
                console.error('Error checking user memory:', selectError);
              }

              if (!existingMemory) {
                const { error: insertError } = await supabase
                  .from('user_memory')
                  .insert({
                    user_id: userId,
                    conversation_history: [],
                    user_context: {}
                  });
                
                if (insertError) {
                  console.error('Error creating user memory:', insertError);
                } else {
                  console.log('User memory initialized');
                }
              }
    } catch (error) {
      console.error('Error initializing user memory:', error);
      // Don't throw error - let it continue with fallback
    }
  }

  // Save conversation to database (simplified)
  static async saveConversation(userId, messages) {
    try {
      // Update user_memory with new conversation history
      const { data, error } = await supabase
        .from('user_memory')
        .update({
          conversation_history: messages,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Also save to AsyncStorage as backup during development
      await this.saveToAsyncStorage(userId, messages);

      return data;
    } catch (error) {
      console.error('Error saving conversation:', error);
      // Don't throw error - let it continue with fallback
    }
  }

  // Load conversations from database (simplified)
  static async loadConversations(userId, limit = 50, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('user_memory')
        .select('conversation_history')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      // Return conversation history as array
      return data?.conversation_history || [];
    } catch (error) {
      console.error('Error loading conversations:', error);
      // Fallback to AsyncStorage during development
      return await this.loadFromAsyncStorage(userId);
    }
  }

  // Save user preference (simplified - using profiles table)
  static async savePreference(userId, key, value) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ [key]: value })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving preference:', error);
      // Don't throw error - let it continue
    }
  }

  // Load user preferences (simplified - using profiles table)
  static async loadPreferences(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data || {};
    } catch (error) {
      console.error('Error loading preferences:', error);
      return {};
    }
  }

  // Backup methods for AsyncStorage (during development)
  static async saveToAsyncStorage(userId, messages) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.setItem(`chat_history_${userId}`, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving to AsyncStorage:', error);
    }
  }

  static async loadFromAsyncStorage(userId) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const storedHistory = await AsyncStorage.getItem(`chat_history_${userId}`);
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        return parsedHistory; // Return the messages directly, not wrapped in an object
      }
      return [];
    } catch (error) {
      console.error('Error loading from AsyncStorage:', error);
      return [];
    }
  }

  // Get conversation context for AI (simplified)
  static async getConversationContext(userId, limit = 10) {
    try {
      const conversationHistory = await this.loadConversations(userId, limit);
      
      // Ensure we return the correct format
      if (Array.isArray(conversationHistory)) {
        return conversationHistory;
      } else {
        console.log('Conversation history is not an array:', conversationHistory);
        return [];
      }
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return [];
    }
  }

  // Get user preferences context for AI (simplified)
  static async getPreferencesContext(userId) {
    try {
      const preferences = await this.loadPreferences(userId);
      
      // Return preferences object directly
      return preferences || {};
    } catch (error) {
      console.error('Error getting preferences context:', error);
      return {};
    }
  }
}
