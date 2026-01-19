import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

const SUPABASE_URL = Deno.env.get('PROJECT_URL') ?? Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
const TWILIO_FROM_NUMBER = Deno.env.get('TWILIO_FROM_NUMBER') ?? '';
const TWILIO_MESSAGING_SERVICE_SID = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID') ?? '';

const twilioAuthHeader = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN
  ? `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`
  : null;

async function sendSms(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  if (!twilioAuthHeader) {
    return { success: false, error: 'Twilio not configured' };
  }

  const form = new URLSearchParams({
    To: to,
    Body: body,
  });

  if (TWILIO_MESSAGING_SERVICE_SID) {
    form.append('MessagingServiceSid', TWILIO_MESSAGING_SERVICE_SID);
  } else if (TWILIO_FROM_NUMBER) {
    form.append('From', TWILIO_FROM_NUMBER);
  } else {
    return { success: false, error: 'Missing MessagingServiceSid or From number' };
  }

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: twilioAuthHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: form.toString(),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    return { success: false, error };
  }

  return { success: true };
}

function parseMmDdYyyy(dateStr: string, timeStr: string | null) {
  const parts = dateStr.split('/').map(Number);
  const [month, day, year] = parts.length === 3 ? parts : [1, 1, 1970];
  const [hours, minutes] = (timeStr || '08:00:00').split(':').map(Number);
  return new Date(year, month - 1, day, hours || 8, minutes || 0, 0, 0);
}

function getLocalTimeParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return { hour, minute };
}

function isWithinQuietHours(now: Date, start: string, end: string, timeZone: string): boolean {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;
  const local = getLocalTimeParts(now, timeZone);
  const nowMin = local.hour * 60 + local.minute;

  if (startMin < endMin) {
    return nowMin >= startMin && nowMin < endMin;
  }
  return nowMin >= startMin || nowMin < endMin;
}

Deno.serve(async () => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response('Missing Supabase configuration', { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();

    const { data: prefs } = await supabase
      .from('proactive_preferences')
      .select('*');

    let sent = 0;

    for (const pref of prefs || []) {
      if (!pref.user_id) continue;
      const tz = pref.timezone || 'UTC';
      if (isWithinQuietHours(now, pref.quiet_hours_start, pref.quiet_hours_end, tz)) continue;

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, companion_name, phone')
        .eq('id', pref.user_id)
        .single();

      const phone = profile?.phone;
      if (!phone) continue;

      const { data: recentLog } = await supabase
        .from('proactive_delivery_log')
        .select('sent_at')
        .eq('user_id', pref.user_id)
        .eq('message_type', 'news')
        .order('sent_at', { ascending: false })
        .limit(1);

      if (pref.frequency === 'daily' && recentLog?.length) {
        const last = new Date(recentLog[0].sent_at);
        const hoursSince = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
        if (hoursSince < 20) continue;
      }

      const { data: newsItems } = await supabase
        .from('news_items')
        .select('title, link')
        .eq('user_id', pref.user_id)
        .order('published_at', { ascending: false })
        .limit(3);

      const { data: dates } = await supabase
        .from('important_dates')
        .select('title, date, time, repeat_type')
        .eq('user_id', pref.user_id);

      const upcoming = (dates || [])
        .map((d: any) => ({
          title: d.title,
          when: parseMmDdYyyy(d.date, d.time),
        }))
        .filter((d) => d.when >= now && d.when <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))
        .sort((a, b) => a.when.getTime() - b.when.getTime());

      const companionName = profile?.companion_name || 'PoCo';
      const firstName = profile?.first_name || 'there';
      const headlines = (newsItems || []).map((n: any, idx: number) => `${idx + 1}. ${n.title}`).join('\n');
      const nextDate = upcoming[0];

      const messageParts = [
        `Hi ${firstName}, it’s ${companionName}.`,
      ];

      if (nextDate) {
        const dateLabel = nextDate.when.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        messageParts.push(`Upcoming: ${nextDate.title} on ${dateLabel}.`);
      }

      if (headlines) {
        messageParts.push(`Top headlines:\n${headlines}`);
      } else {
        messageParts.push('No new headlines yet, I’ll check again later.');
      }

      const body = messageParts.join(' ');

      const result = await sendSms(phone, body);
      if (!result.success) {
        console.error('SMS failed', result.error);
        continue;
      }

      await supabase
        .from('proactive_delivery_log')
        .insert({
          user_id: pref.user_id,
          message_type: 'news',
          channel: 'sms',
          metadata: {
            headlines: (newsItems || []).map((n: any) => n.title),
            next_date: nextDate?.title || null,
          }
        });

      sent += 1;
    }

    return new Response(JSON.stringify({ success: true, sent }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-proactive-sms error', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
