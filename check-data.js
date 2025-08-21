// Simple script to check data storage
import { supabase } from './lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function checkDataStorage() {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No user logged in');
      return;
    }

    console.log('=== DATA STORAGE CHECK ===');
    console.log('User ID:', user.id);

    // Check Supabase Database
    console.log('\n--- SUPABASE DATABASE ---');
    
    // Check user_memory table
    const { data: memoryData } = await supabase
      .from('user_memory')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    console.log('user_memory table:', memoryData ? 'Data found' : 'No data');
    if (memoryData) {
      console.log('Conversation history length:', memoryData.conversation_history?.length || 0);
    }

    // Check profiles table
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    console.log('profiles table:', profileData ? 'Data found' : 'No data');
    if (profileData) {
      console.log('Profile data keys:', Object.keys(profileData));
    }

    // Check AsyncStorage (Backup)
    console.log('\n--- ASYNCSTORAGE (BACKUP) ---');
    const asyncStorageKey = `chat_history_${user.id}`;
    const asyncStorageData = await AsyncStorage.getItem(asyncStorageKey);
    console.log('AsyncStorage backup:', asyncStorageData ? 'Data found' : 'No data');
    if (asyncStorageData) {
      const parsedData = JSON.parse(asyncStorageData);
      console.log('Backup conversation length:', parsedData.length);
    }

  } catch (error) {
    console.error('Error checking data storage:', error);
  }
}
