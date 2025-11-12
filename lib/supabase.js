import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://derggkmbocosxcxhnwvf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlcmdna21ib2Nvc3hjeGhud3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NzMzNDYsImV4cCI6MjA2ODM0OTM0Nn0.sF7LmxlL0NinnKJ_1RWpro9xXK8xn01uZjIme2EQ2P0';

// Safely create Supabase client - wrap in try-catch to prevent crash on initialization
let supabase = null;
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false // RN MUST be false
    }
  });
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  // Create a minimal fallback client that won't crash
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
  } catch (fallbackError) {
    console.error('Failed to create fallback Supabase client:', fallbackError);
  }
}

export { supabase };
