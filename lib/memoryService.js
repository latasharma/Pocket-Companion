import { supabase } from './supabase';

export class MemoryService {
  // Initialize user's memory system (robust)
  // This function will NOT overwrite an existing conversation_history. It will
  // only create a row if none exists and will update "updated_at" for existing
  // rows to avoid wiping stored conversations when the app initializes.
  static async initializeUserMemory(userId) {
    try {
      if (!userId) return;

      // Check if a row already exists for this user
      const { data: existing, error: existingError } = await supabase
        .from('user_memory')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingError) {
        console.warn('initializeUserMemory - error checking existing row:', existingError);
      }

      if (existing) {
        // Row exists — update only the timestamp to keep conversation_history intact
        try {
          await supabase
            .from('user_memory')
            .update({ updated_at: new Date().toISOString() })
            .eq('user_id', userId);
          console.log('User memory exists; refreshed updated_at for user:', userId);
        } catch (updateTsError) {
          console.warn('initializeUserMemory - failed to refresh updated_at:', updateTsError);
        }
        return;
      }

      // No existing row found — insert a new row with empty conversation_history
      const { data: insertData, error: insertError } = await supabase
        .from('user_memory')
        .insert({
          user_id: userId,
          conversation_history: [],
          user_context: {},
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        // If insert fails because duplicates already exist, log and continue — load logic will handle duplicates
        console.error('Error inserting user memory:', insertError);
      } else {
        console.log('User memory created for user:', userId);
      }
    } catch (error) {
      console.error('Error initializing user memory (unexpected):', error);
      // Do not throw — let the app continue with fallback storage
    }
  }

  // Save conversation to database (robust)
  static async saveConversation(userId, messages) {
    try {
      if (!userId) {
        console.warn('saveConversation called without userId — skipping DB save');
        await this.saveToAsyncStorage(userId, messages);
        return;
      }

      // Prefer update first to avoid depending on ON CONFLICT/unique constraints
      const { data: updated, error: updateError } = await supabase
        .from('user_memory')
        .update({
          conversation_history: messages,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select();

      if (updateError) {
        console.warn('saveConversation - update error (will attempt insert):', updateError);
      } else if (Array.isArray(updated) && updated.length > 0) {
        // Successfully updated existing row
        await this.saveToAsyncStorage(userId, messages);
        return updated;
      }

      // If update didn't find a row, insert one
      const { data: insertData, error: insertError } = await supabase
        .from('user_memory')
        .insert({
          user_id: userId,
          conversation_history: messages,
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error inserting conversation (final):', insertError);
        // Attempt fallback: try to update any matching rows (handles duplicate rows case)
        try {
          const { data: retryUpdate, error: retryError } = await supabase
            .from('user_memory')
            .update({ conversation_history: messages, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .select();

          if (retryError) {
            console.error('Retry update also failed:', retryError);
          } else {
            await this.saveToAsyncStorage(userId, messages);
          }
        } catch (retryErr) {
          console.error('Retry update unexpected error:', retryErr);
        }
      } else {
        await this.saveToAsyncStorage(userId, messages);
        return insertData;
      }
    } catch (error) {
      console.error('Error saving conversation (unexpected):', error);
      // Always fallback to AsyncStorage
      await this.saveToAsyncStorage(userId, messages);
    }
  }

  // Load conversations: prefer the most-recent row for the user, but handle duplicates defensively
  static async loadConversations(userId, limit = 50, offset = 0) {
    try {
      if (!userId) {
        console.warn('loadConversations called without userId');
        return [];
      }

      // Query the most recent row for this user (order + limit ensures array response)
      const { data, error } = await supabase
        .from('user_memory')
        .select('conversation_history, user_id, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error loading conversations (query):', error);
        return await this.loadFromAsyncStorage(userId);
      }

      if (Array.isArray(data) && data.length > 0) {
        return data[0]?.conversation_history || [];
      }

      // No row found for this user
      return [];
    } catch (error) {
      console.error('Error loading conversations (unexpected):', error);
      return await this.loadFromAsyncStorage(userId);
    }
  }

  // Save user preference (profiles)
  static async savePreference(userId, key, value) {
    try {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .update({ [key]: value })
        .eq('id', userId)
        .select()
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving preference:', error);
    }
  }

  // Load user preferences
  static async loadPreferences(userId) {
    try {
      if (!userId) return {};
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (Array.isArray(data)) return data[0] || {};
      return data || {};
    } catch (error) {
      console.error('Error loading preferences:', error);
      return {};
    }
  }

  // AsyncStorage backup methods
  static async saveToAsyncStorage(userId, messages) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      if (!userId) return;
      await AsyncStorage.setItem(`chat_history_${userId}`, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving to AsyncStorage:', error);
    }
  }

  static async loadFromAsyncStorage(userId) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      if (!userId) return [];
      const storedHistory = await AsyncStorage.getItem(`chat_history_${userId}`);
      if (!storedHistory) return [];
      return JSON.parse(storedHistory);
    } catch (error) {
      console.error('Error loading from AsyncStorage:', error);
      return [];
    }
  }

  // Conversation context for AI
  static async getConversationContext(userId, limit = 10) {
    try {
      const conversationHistory = await this.loadConversations(userId, limit);
      if (Array.isArray(conversationHistory)) return conversationHistory;
      return [];
    } catch (error) {
      console.error('Error getting conversation context:', error);
      return [];
    }
  }

  // Preferences context for AI
  static async getPreferencesContext(userId) {
    try {
      const preferences = await this.loadPreferences(userId);
      return preferences || {};
    } catch (error) {
      console.error('Error getting preferences context:', error);
      return {};
    }
  }
}
