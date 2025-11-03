/**
 * Setup Apple Test User Account
 * This script resets the password and grants Premium access for lata1.sharma@gmail
 * 
 * Run with: node setup-apple-test-user.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // You'll need to add this to .env

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure you have:');
  console.error('  - EXPO_PUBLIC_SUPABASE_URL in .env');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY in .env (from Supabase Dashboard → Settings → API)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupAppleTestUser() {
  const testEmail = 'lata1.sharma@gmail';
  const testPassword = 'Lata4321$';
  
  console.log('🔍 Looking up user:', testEmail);
  
  try {
    // Get user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }
    
    const user = users.users.find(u => u.email === testEmail);
    
    if (!user) {
      console.error('❌ User not found:', testEmail);
      console.log('💡 Creating new user instead...');
      
      // Create new user if doesn't exist
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true
      });
      
      if (createError) {
        console.error('❌ Error creating user:', createError);
        return;
      }
      
      console.log('✅ User created:', newUser.user.id);
      await setupUserProfile(newUser.user.id);
      return;
    }
    
    console.log('✅ Found user:', user.id);
    
    // Update password
    console.log('🔐 Updating password...');
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: testPassword }
    );
    
    if (updateError) {
      console.error('❌ Error updating password:', updateError);
      return;
    }
    
    console.log('✅ Password updated successfully!');
    
    // Set up profile with Premium access
    await setupUserProfile(user.id);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

async function setupUserProfile(userId) {
  console.log('👤 Setting up user profile...');
  
  try {
    // Calculate trial end date (7 days from now for testing, or make it active subscription)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30); // 30 days for Apple review
    
    // Update or insert profile with Premium access
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        first_name: 'Apple',
        last_name: 'Reviewer',
        companion_name: 'Pixel',
        subscription_tier: 'premium',
        subscription_status: 'active',
        subscription_start_date: new Date().toISOString(),
        subscription_end_date: trialEndDate.toISOString(),
        trial_end_date: trialEndDate.toISOString(),
        connect_onboarding_completed: true,
        connect_interests: ['Technology', 'Mobile Apps', 'AI', 'Health'],
        connect_concerns: ['career', 'health'],
        connect_type: 'professional',
        connect_location: 'national',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
    
    if (error) {
      console.error('❌ Error updating profile:', error);
      return;
    }
    
    console.log('✅ Profile updated with Premium access!');
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🎉 Apple Test User Setup Complete!');
    console.log('═══════════════════════════════════════');
    console.log('Email:', 'lata1.sharma@gmail');
    console.log('Password:', 'Lata4321$');
    console.log('Access: Premium (30 days)');
    console.log('Features: All features including Connect');
    console.log('═══════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Error setting up profile:', error);
  }
}

// Run the setup
setupAppleTestUser();

