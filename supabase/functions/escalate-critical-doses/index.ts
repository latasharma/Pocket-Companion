// Supabase Edge Function: Escalate critical medication doses to caregivers.
// Triggers (via cron) to send SMS, email, and optional phone call when a dose
// remains unconfirmed past the escalation window.
// Channels are privacy-minimized: no medication name/dose in the message body.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

type DoseEvent = {
  id: string;
  user_id: string;
  medication_id: string;
  scheduled_at: string;
  status: 'pending' | 'taken' | 'skipped' | 'snoozed';
  caregiver_sms_sent_at: string | null;
  caregiver_email_sent_at: string | null;
  caregiver_call_sent_at: string | null;
};

type Medication = {
  id: string;
  name: string | null;
  is_critical: boolean | null;
  caregiver_phone: string | null;
  caregiver_email: string | null;
  caregiver_consent: boolean | null;
  user_id: string;
};

type Profile = {
  id: string;
  first_name: string | null;
};

// Supabase dashboard forbids secrets starting with SUPABASE_, so use neutral names.
const SUPABASE_URL = Deno.env.get('PROJECT_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER') ?? '';
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') ?? '';
const SENDGRID_FROM_EMAIL = Deno.env.get('SENDGRID_FROM_EMAIL') ?? '';

const ENABLE_CALLS = (Deno.env.get('ENABLE_TWILIO_CALLS') ?? 'false').toLowerCase() === 'true';
const ESCALATION_MINUTES = parseInt(Deno.env.get('ESCALATION_MINUTES') ?? '60', 10);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const twilioAuthHeader =
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
    ? 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
    : null;

async function sendSms(to: string, body: string) {
  if (!twilioAuthHeader || !TWILIO_FROM_NUMBER) return false;
  const form = new URLSearchParams({
    To: to,
    From: TWILIO_FROM_NUMBER,
    Body: body
  });
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
  return res.ok;
}

async function sendCall(to: string, message: string) {
  if (!ENABLE_CALLS || !twilioAuthHeader || !TWILIO_FROM_NUMBER) return false;
  const twiml = `<Response><Say voice="alice">${message}</Say></Response>`;
  const form = new URLSearchParams({
    To: to,
    From: TWILIO_FROM_NUMBER,
    Twiml: twiml
  });
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
    {
      method: 'POST',
      headers: {
        Authorization: twilioAuthHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString()
    }
  );
  return res.ok;
}

async function sendEmail(to: string, subject: string, body: string) {
  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) return false;
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: SENDGRID_FROM_EMAIL },
      subject,
      content: [{ type: 'text/plain', value: body }]
    })
  });
  return res.ok;
}

// Fetch data needed for escalation while avoiding complex joins.
async function fetchPendingDoseEvents(cutoffIso: string) {
  const { data, error } = await supabase
    .from('dose_events')
    .select(
      'id,user_id,medication_id,scheduled_at,status,caregiver_sms_sent_at,caregiver_email_sent_at,caregiver_call_sent_at'
    )
    .eq('status', 'pending')
    .lte('scheduled_at', cutoffIso);
  if (error) throw error;
  return (data ?? []) as DoseEvent[];
}

async function fetchMedications(ids: string[]) {
  if (ids.length === 0) return new Map<string, Medication>();
  const { data, error } = await supabase
    .from('medications')
    .select('id,name,is_critical,caregiver_phone,caregiver_email,caregiver_consent,user_id')
    .in('id', ids);
  if (error) throw error;
  const map = new Map<string, Medication>();
  (data ?? []).forEach((m: Medication) => map.set(m.id, m));
  return map;
}

async function fetchProfiles(ids: string[]) {
  if (ids.length === 0) return new Map<string, Profile>();
  const { data, error } = await supabase
    .from('profiles')
    .select('id,first_name')
    .in('id', ids);
  if (error) throw error;
  const map = new Map<string, Profile>();
  (data ?? []).forEach((p: Profile) => map.set(p.id, p));
  return map;
}

function buildMessage(firstName?: string | null) {
  const name = firstName?.trim() || 'the user';
  return `PoCo alert: ${name} hasn’t confirmed a scheduled medication reminder. Please check in.`;
}

async function markChannelsSent(doseId: string, channels: Partial<Record<'sms' | 'email' | 'call', boolean>>) {
  const patch: Record<string, string> = {};
  const now = new Date().toISOString();
  if (channels.sms) patch.caregiver_sms_sent_at = now;
  if (channels.email) patch.caregiver_email_sent_at = now;
  if (channels.call) patch.caregiver_call_sent_at = now;
  if (Object.keys(patch).length === 0) return;
  await supabase.from('dose_events').update(patch).eq('id', doseId);
}

async function handleRequest(): Promise<Response> {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response('Missing Supabase service configuration', { status: 500 });
    }

    const cutoff = new Date(Date.now() - ESCALATION_MINUTES * 60 * 1000).toISOString();
    const doseEvents = await fetchPendingDoseEvents(cutoff);
    const medIds = Array.from(new Set(doseEvents.map((d) => d.medication_id)));
    const userIds = Array.from(new Set(doseEvents.map((d) => d.user_id)));

    const [medMap, profileMap] = await Promise.all([
      fetchMedications(medIds),
      fetchProfiles(userIds)
    ]);

    let processed = 0;
    let notified = 0;

    for (const dose of doseEvents) {
      processed += 1;
      const med = medMap.get(dose.medication_id);
      if (!med || !med.is_critical || !med.caregiver_consent) continue;

      const message = buildMessage(profileMap.get(dose.user_id)?.first_name);

      // Decide channels based on available contact info
      const wantSms = !!med.caregiver_phone && !dose.caregiver_sms_sent_at;
      const wantEmail = !!med.caregiver_email && !dose.caregiver_email_sent_at;
      const wantCall = ENABLE_CALLS && !!med.caregiver_phone && !dose.caregiver_call_sent_at;

      if (!wantSms && !wantEmail && !wantCall) continue;

      const results = { sms: false, email: false, call: false };

      if (wantSms) {
        results.sms = await sendSms(med.caregiver_phone as string, message);
      }
      if (wantEmail) {
        results.email = await sendEmail(med.caregiver_email as string, 'PoCo alert', message);
      }
      if (wantCall) {
        results.call = await sendCall(med.caregiver_phone as string, message);
      }

      const anySent = results.sms || results.email || results.call;
      if (anySent) {
        notified += 1;
        await markChannelsSent(dose.id, results);
      }
    }

    return new Response(
      JSON.stringify({ processed, notified, cutoff }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Escalation function error:', error);
    return new Response('Error processing escalations', { status: 500 });
  }
}

Deno.serve(handleRequest);
