   import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://derggkmbocosxcxhnwvf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlcmdna21ib2Nvc3hjeGhud3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4NjIzNzAsImV4cCI6MjA4NDIyMjM3MH0.R4CyPwnONMcjIzWk93qn47GVRoNwjAhoWE2hZ_oA7JU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false // RN MUST be false
  }
});
