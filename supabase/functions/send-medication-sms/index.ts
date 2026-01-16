// Supabase Edge Function: Send Medication Confirmation SMS
// Sends SMS to user asking them to confirm medication intake
// Only for critical medications with escalation enabled

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

const SUPABASE_URL = Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER') ?? '';
const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const twilioAuthHeader = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
  ? 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
  : null;

/**
 * Send SMS via Twilio (supports both Messaging Service and direct phone number)
 */
async function sendSms(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  if (!twilioAuthHeader) {
    console.error('Twilio not configured');
    return { success: false, error: 'Twilio not configured' };
  }

  const form = new URLSearchParams({
    To: to,
    Body: body
  });

  // Use Messaging Service if configured, otherwise use phone number
  if (TWILIO_MESSAGING_SERVICE_SID) {
    form.append('MessagingServiceSid', TWILIO_MESSAGING_SERVICE_SID);
    console.log('Using Messaging Service:', TWILIO_MESSAGING_SERVICE_SID);
  } else if (TWILIO_FROM_NUMBER) {
    form.append('From', TWILIO_FROM_NUMBER);
    console.log('Using phone number:', TWILIO_FROM_NUMBER);
  } else {
    console.error('Neither Messaging Service SID nor From number configured');
    return { success: false, error: 'Missing Messaging Service SID or From number' };
  }

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: twilioAuthHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString()
    }
  );

  if (!res.ok) {
    const error = await res.text();
    console.error('Twilio error:', error);
    return { success: false, error };
  }

  console.log('✅ SMS sent successfully to:', to);
  return { success: true };
}

/**
 * Main handler
 */
async function handleRequest(req: Request): Promise<Response> {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response('Missing Supabase configuration', { status: 500 });
    }

    const { doseEventId, userPhone, medicationName } = await req.json();

    if (!doseEventId || !userPhone || !medicationName) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Send SMS asking for confirmation
    const message = `PoCo Reminder: Time to take ${medicationName}. Reply TAKEN or SKIP to confirm.`;
    
    const result = await sendSms(userPhone, message);

    if (result.success) {
      // Mark that SMS was sent
      const { error: updateError } = await supabase
        .from('dose_events')
        .update({ 
          confirmation_sms_sent_at: new Date().toISOString() 
        })
        .eq('id', doseEventId);

      if (updateError) {
        console.error('Failed to update dose_events:', updateError);
        return new Response(
          JSON.stringify({ success: false, message: 'SMS sent but failed to update dose event', error: updateError.message }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'SMS sent' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ success: false, message: 'Failed to send SMS', error: result.error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response('Error sending SMS', { status: 500 });
  }
}

Deno.serve(handleRequest);
