   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = 'https://derggkmbocosxcxhnwvf.supabase.co';
   const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlcmdna21ib2Nvc3hjeGhud3ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NzMzNDYsImV4cCI6MjA2ODM0OTM0Nn0.sF7LmxlL0NinnKJ_1RWpro9xXK8xn01uZjIme2EQ2P0';

   export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
     auth: {
       autoRefreshToken: true,
       persistSession: true,
       detectSessionInUrl: false
     }
   });
