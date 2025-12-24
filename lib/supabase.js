import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://derggkmbocosxcxhnwvf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlcmdna21ib2Nvc3hjeGhud3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NzMzNDYsImV4cCI6MjA2ODM0OTM0Nn0.sF7LmxlL0NinnKJ_1RWpro9xXK8xn01uZjIme2EQ2P0';

// In React Native we must ensure the URL global is available for the Supabase client
// and provide a fetch implementation. The `react-native-url-polyfill` package
// provides the URL polyfill; we also pass the global fetch to the client to be
// explicit (supabase-js v2 accepts a `global.fetch` override).
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false // RN MUST be false
  },
  global: {
    // Use the global fetch implementation available in React Native
    fetch: globalThis.fetch,
  },
});
