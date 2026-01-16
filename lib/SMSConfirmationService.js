/**
 * SMS Confirmation Service
 * For TEST mode (< 10 min): SMS sent immediately
 * For real doses: SMS sent by server cron job at scheduled time
 * Users reply TAKEN or SKIP to confirm
 */

import { supabase } from './supabase';

/**
 * Schedule SMS to be sent at medication time
 * - If scheduled within 10 minutes: send immediately (for testing)
 * - Otherwise: server cron job will send at scheduled time
 */
export async function scheduleSMSConfirmation({ doseEventId, medicationName, scheduledAt }) {
  try {
    console.log('📅 SMS scheduled for:', medicationName, 'at', scheduledAt.toLocaleString());
    
    // Verify user has phone number in profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user logged in');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .single();

    if (!profile?.phone) {
      console.warn('⚠️ User phone number not found. SMS will not be sent.');
      return;
    }

    // Check if this is a test dose (scheduled within 10 minutes)
    const now = new Date();
    const scheduledTime = new Date(scheduledAt);
    const minutesUntil = (scheduledTime.getTime() - now.getTime()) / (1000 * 60);

    if (minutesUntil <= 10 && minutesUntil >= 0) {
      // TEST mode - send SMS immediately
      console.log('🧪 TEST mode: Sending SMS immediately');
      await sendSMSNow(doseEventId, profile.phone, medicationName);
    } else {
      // Production mode - cron will handle it
      console.log('🤖 Production: Server will send SMS at scheduled time');
      console.log('✅ Will send to:', profile.phone);
    }
  } catch (error) {
    console.error('Error in scheduleSMSConfirmation:', error);
  }
}

/**
 * Send SMS immediately (for testing)
 */
async function sendSMSNow(doseEventId, userPhone, medicationName) {
  try {
    const { error } = await supabase.functions.invoke('send-medication-sms', {
      body: {
        doseEventId,
        userPhone,
        medicationName
      }
    });

    if (error) {
      console.error('❌ Error sending SMS:', error);
    } else {
      console.log('✅ SMS sent to:', userPhone);
    }
  } catch (error) {
    console.error('❌ Exception sending SMS:', error);
  }
}
