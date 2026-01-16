// Supabase Edge Function: Context-Aware Proactive Outreach
// Runs daily (morning & evening) to scan user context and send meaningful check-ins
// Better than gold standard: Uses real user data, not generic messages

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

const SUPABASE_URL = Deno.env.get('PROJECT_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

/**
 * Get upcoming events in the next N hours
 */
async function getUpcomingEvents(userId: string, hoursAhead: number = 24) {
  const now = new Date();
  const future = new Date();
  future.setHours(future.getHours() + hoursAhead);

  const { data: dates } = await supabase
    .from('important_dates')
    .select('*')
    .eq('user_id', userId)
    .gte('date', now.toISOString())
    .lte('date', future.toISOString())
    .order('date', { ascending: true });

  return { importantDates: dates || [], total: dates?.length || 0 };
}

/**
 * Get upcoming medications
 */
async function getUpcomingMedications(userId: string, hoursAhead: number = 24) {
  const { data: medications } = await supabase
    .from('medications')
    .select('*')
    .eq('user_id', userId);

  const now = new Date();
  const currentHour = now.getHours();
  const upcoming: any[] = [];

  (medications || []).forEach((med: any) => {
    let times = [];
    try {
      if (med.times) {
        times = typeof med.times === 'string' ? JSON.parse(med.times) : med.times;
      } else if (med.time) {
        times = [med.time];
      }
    } catch (e) {
      console.error('Error parsing times:', e);
    }

    times.forEach((time: string) => {
      const [hour] = time.split(':').map(Number);
      let hoursUntil = hour - currentHour;
      if (hour < currentHour) hoursUntil += 24;

      if (hoursUntil >= 0 && hoursUntil <= hoursAhead) {
        upcoming.push({
          name: med.name,
          time,
          hoursUntil,
          isCritical: med.is_critical || false
        });
      }
    });
  });

  return upcoming.sort((a, b) => a.hoursUntil - b.hoursUntil);
}

/**
 * Get missed doses
 */
async function getMissedDoses(userId: string) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);

  const { data } = await supabase
    .from('dose_events')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .lt('scheduled_at', new Date().toISOString())
    .gte('scheduled_at', cutoff.toISOString());

  return data || [];
}

/**
 * Get recent conversation topics
 */
async function getRecentTopics(userId: string) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 3);

  const { data } = await supabase
    .from('conversations')
    .select('topic, summary, importance_level')
    .eq('user_id', userId)
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(3);

  return data || [];
}

/**
 * Get user profile
 */
async function getUserProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('first_name, preferred_name')
    .eq('id', userId)
    .single();

  return data;
}

/**
 * Build context-aware prompt
 */
function buildPrompt(context: any) {
  const userName = context.profile?.preferred_name || context.profile?.first_name || 'there';
  
  let desc = `You are PoCo, a caring AI companion checking in with ${userName}.\n\n**Current situation:**\n`;

  if (context.events.total > 0) {
    desc += `\n**Upcoming events:**\n`;
    context.events.importantDates.forEach((date: any) => {
      const hoursUntil = Math.round((new Date(date.date) - new Date()) / (1000 * 60 * 60));
      desc += `- ${date.title} (${date.type}) in ${hoursUntil} hours\n`;
    });
  }

  if (context.upcomingMeds.length > 0) {
    desc += `\n**Upcoming medications:**\n`;
    context.upcomingMeds.slice(0, 3).forEach((med: any) => {
      const critical = med.isCritical ? ' (CRITICAL)' : '';
      desc += `- ${med.name} at ${med.time}${critical}\n`;
    });
  }

  if (context.missedDoses.length > 0) {
    desc += `\n**Health concern:** ${context.missedDoses.length} unconfirmed medication doses recently.\n`;
  }

  if (context.recentTopics.length > 0) {
    desc += `\n**Recent topics:** ${context.recentTopics.map((t: any) => t.topic).join(', ')}\n`;
  }

  const prompt = `${desc}

Craft a warm, natural, context-aware check-in message for ${userName} (2-3 sentences max).

Guidelines:
✅ Be specific - reference actual events/appointments
✅ Sound like a caring friend, not a reminder app
✅ Offer genuine help
✅ Show you remember past conversations
❌ Don't sound robotic
❌ Don't list everything
❌ Keep it brief and warm

Generate message:`;

  return prompt;
}

/**
 * Generate proactive message using GPT
 */
async function generateProactiveMessage(context: any) {
  const prompt = buildPrompt(context);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are PoCo, a warm and caring AI companion.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 150
    })
  });

  const data = await response.json();
  return data.choices[0]?.message?.content || null;
}

/**
 * Send notification via http_post to notification service
 */
async function sendProactiveNotification(userId: string, message: string) {
  // This would integrate with your notification system
  // For now, we'll just log it
  console.log(`📨 Would send to ${userId}: ${message}`);
  
  // TODO: Integrate with actual notification service
  // await supabase.functions.invoke('send-notification', {
  //   body: { userId, message, type: 'proactive_checkin' }
  // });
}

/**
 * Main handler
 */
async function handleRequest(): Promise<Response> {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
      return new Response('Missing configuration', { status: 500 });
    }

    // Get all active users (or could filter by last_interaction_at)
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, first_name');

    if (usersError) throw usersError;

    let scanned = 0;
    let notified = 0;

    for (const user of users || []) {
      scanned++;

      // Scan user context
      const [events, upcomingMeds, missedDoses, recentTopics, profile] = await Promise.all([
        getUpcomingEvents(user.id, 48), // Next 48 hours
        getUpcomingMedications(user.id, 24),
        getMissedDoses(user.id),
        getRecentTopics(user.id),
        getUserProfile(user.id)
      ]);

      const context = {
        events,
        upcomingMeds,
        missedDoses,
        recentTopics,
        profile
      };

      // Check if there's meaningful context
      const hasContext = 
        events.total > 0 ||
        upcomingMeds.some(m => m.isCritical && m.hoursUntil < 2) ||
        missedDoses.length > 0;

      if (hasContext) {
        // Generate and send proactive message
        const message = await generateProactiveMessage(context);
        if (message) {
          await sendProactiveNotification(user.id, message);
          notified++;
        }
      }
    }

    return new Response(
      JSON.stringify({ scanned, notified }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response('Error processing proactive check-ins', { status: 500 });
  }
}

Deno.serve(handleRequest);
