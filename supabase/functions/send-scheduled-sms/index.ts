import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const SUPABASE_URL = Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER') ?? '';
const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID') ?? '';

const twilioAuthHeader = `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`;

/**
 * Send SMS via Twilio (supports both Messaging Service and direct phone number)
 */
async function sendSms(to: string, body: string): Promise<boolean> {
  if (!twilioAuthHeader) {
    console.error('Twilio not configured');
    return false;
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
    return false;
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
    return false;
  }

  console.log('✅ SMS sent successfully to:', to);
  return true;
}

/**
 * Cron job to send SMS for critical medications at their scheduled time
 */
async function handleRequest(): Promise<Response> {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response('Missing Supabase configuration', { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find dose_events for critical medications that:
    // 1. Are scheduled within the last 5 minutes OR next 20 minutes (cron runs every 15 min)
    // 2. Haven't had SMS sent yet (confirmation_sms_sent_at IS NULL)
    // 3. Status is 'pending'
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const twentyMinutesFromNow = new Date(now.getTime() + 20 * 60 * 1000);

    const { data: doseEvents, error: doseError } = await supabase
      .from('dose_events')
      .select(`
        id,
        scheduled_at,
        medication_id,
        user_id,
        medications!inner (
          name,
          is_critical
        )
      `)
      .eq('status', 'pending')
      .eq('medications.is_critical', true)
      .is('confirmation_sms_sent_at', null)
      .gte('scheduled_at', fiveMinutesAgo.toISOString())
      .lte('scheduled_at', twentyMinutesFromNow.toISOString());

    if (doseError) {
      console.error('Error fetching dose events:', doseError);
      return new Response(JSON.stringify({ error: doseError.message }), { status: 500 });
    }

    console.log(`Found ${doseEvents?.length || 0} critical medications needing SMS`);

    const userIds = Array.from(new Set((doseEvents || []).map((event) => event.user_id).filter(Boolean)));
    let phoneByUserId: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, phone')
        .in('id', userIds);

      if (profileError) {
        console.error('Error fetching profiles for SMS:', profileError);
      } else {
        phoneByUserId = (profiles || []).reduce((acc, profile) => {
          if (profile?.id && profile?.phone) acc[profile.id] = profile.phone;
          return acc;
        }, {} as Record<string, string>);
      }
    }

    let sentCount = 0;
    
    for (const event of doseEvents || []) {
      const medication = event.medications;
      const userPhone = phoneByUserId[event.user_id];

      if (!userPhone) {
        console.log(`Skipping dose event ${event.id}: no phone number for user ${event.user_id}`);
        continue;
      }

      // Send SMS
      const message = `PoCo Reminder: Time to take ${medication.name}. Reply TAKEN or SKIP to confirm.`;
      const success = await sendSms(userPhone, message);

      if (success) {
        // Mark SMS as sent
        await supabase
          .from('dose_events')
          .update({ confirmation_sms_sent_at: new Date().toISOString() })
          .eq('id', event.id);

        console.log(`✅ SMS sent for dose event ${event.id} (${medication.name})`);
        sentCount++;
      } else {
        console.error(`❌ Failed to send SMS for dose event ${event.id}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: doseEvents?.length || 0,
        sent: sentCount 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-scheduled-sms:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

Deno.serve(handleRequest);
