/**
 * Email Confirmation Service
 * For TEST mode (< 10 min): Email sent immediately
 * For real doses: Email sent by server cron job at scheduled time
 * Caregiver receives an email asking them to confirm (TAKEN / SKIP)
 */

import { supabase } from './supabase';

/**
 * Schedule Email to be sent at medication time
 * - If scheduled within 10 minutes: send immediately (for testing)
 * - Otherwise: server cron job will send at scheduled time
 */
export async function scheduleEmailConfirmation({ doseEventId, medicationName, scheduledAt }) {
  try {
    console.log('📅 Email scheduled for:', doseEventId, 'Medication Name', medicationName, 'at', scheduledAt.toLocaleString());

    // Verify user is logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user logged in');
      return;
    }

    // Try fetching common caregiver/email-related fields. Be permissive because
    // different deployments may have slightly different column names.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(
        'caregiver_email, caregiver_name, caregiver_phone'
      )
      .eq('id', user.id)
      .single();

    // Log any error from Supabase so we can diagnose why the record is null
    if (profileError) {
      console.error('Error fetching profile for EmailConfirmationService:', profileError);
      return;
    }

    console.log('Fetched profile for email confirmation based on user.id:', user.id);
    console.log('Fetched profile for email confirmation:', profile);
    // Resolve caregiver email from several possible columns
    const caregiverEmail =
      profile?.caregiver_email ||
      profile?.caregiver ||
      profile?.caregiver_contact ||
      profile?.secondary_caregiver_email ||
      profile?.secondary_caregiver ||
      null;

    if (!caregiverEmail) {
      console.warn('⚠️ Caregiver email not found on profile. Email will not be sent.');
      return;
    }

    // Check if this is a test dose (scheduled within 10 minutes)
    const now = new Date();
    const scheduledTime = new Date(scheduledAt);
    const minutesUntil = (scheduledTime.getTime() - now.getTime()) / (1000 * 60);

    if (minutesUntil <= 10 && minutesUntil >= 0) {
      // TEST mode - send Email immediately
      console.log('🧪 TEST mode: Sending Email immediately');
      await sendEmailNow(doseEventId, caregiverEmail, medicationName);
    } else {
      // Production mode - cron will handle it
      console.log('🤖 Production: Server will send Email at scheduled time');
      console.log('✅ Will send to:', caregiverEmail);
    }
  } catch (error) {
    console.error('Error in scheduleEmailConfirmation:', error);
  }
}

/**
 * Send Email immediately (for testing)
 */
async function sendEmailNow(doseEventId, caregiverEmail, medicationName) {
  try {
    // Defensive validations / diagnostics
    console.log('sendEmailNow diagnostics:', {
      doseEventIdType: typeof doseEventId,
      doseEventIdValue: doseEventId,
      caregiverEmailType: typeof caregiverEmail,
      caregiverEmailValue: caregiverEmail,
      medicationNameType: typeof medicationName,
      medicationNameValue: medicationName,
    });

    // Validate required fields
    if (!doseEventId) {
      console.error('Missing doseEventId — aborting email send');
      return false;
    }

    if (!caregiverEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(caregiverEmail))) {
      console.error('Invalid caregiverEmail — aborting email send:', caregiverEmail);
      return false;
    }

    // Normalize values
    caregiverEmail = String(caregiverEmail).trim();
    medicationName = medicationName ? String(medicationName).trim() : '';

    // Create payload - DO NOT stringify it
    const payload = {
      doseEventId: String(doseEventId),
      caregiverEmail: caregiverEmail,
      medicationName: medicationName
    };

    console.log('📧 Invoking edge function send-medication-email with payload:', JSON.stringify(payload));
    console.log('📧 Payload type check - is object?', typeof payload === 'object');
    console.log('📧 Payload keys:', Object.keys(payload));

    const res = await supabase.functions.invoke('send-medication-email', {
      body: payload,
      // headers: { 'Content-Type': 'application/json' }
    });

    // supabase-js may return { data, error } on success, or include an Error-like object
    if (res && res.error) {
      console.error('❌ Error sending Email (function returned error):', res.error);
      // If the returned error includes a response, attempt to read it for more details
      if (res.error && res.error.response) {
        try {
          const text = await res.error.response.text();
          console.error('Function response body:', text);
        } catch (e) {
          console.error('Could not read error response body from res.error:', e);
        }
      }
      return false;
    }

    if (res && res.data) {
      console.log('✅ Email function response data:', res.data);
    } else {
      console.log('✅ Email function invoked successfully (no data returned).');
    }

    return true;
  } catch (error) {
    // FunctionsHttpError and similar thrown errors include status and response
    console.error('❌ Exception sending Email:', error);
    if (error && error.status) console.error('Function HTTP status:', error.status);
    if (error && error.response) {
      try {
        const text = await error.response.text();
        console.error('Function response body:', text);
      } catch (e) {
        console.error('Could not read error response body:', e);
      }
    }
    return false;
  }
}
