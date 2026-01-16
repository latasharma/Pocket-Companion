/**
 * Context Scanner Service
 * Scans user's data to find meaningful context for proactive conversations
 * Better than gold standard: Uses actual user data, not generic check-ins
 */

import { supabase } from './supabase';

/**
 * Get upcoming events in the next N hours
 */
async function getUpcomingEvents(userId, hoursAhead = 24) {
  const now = new Date();
  const future = new Date();
  future.setHours(future.getHours() + hoursAhead);

  try {
    // Get important dates
    const { data: dates, error: datesError } = await supabase
      .from('important_dates')
      .select('*')
      .eq('user_id', userId)
      .gte('date', now.toISOString())
      .lte('date', future.toISOString())
      .order('date', { ascending: true });

    if (datesError) console.error('Error fetching dates:', datesError);

    // Get appointments (if table exists)
    let appointments = [];
    try {
      const { data: appts, error: apptsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', userId)
        .gte('date', now.toISOString())
        .lte('date', future.toISOString())
        .order('date', { ascending: true });

      if (!apptsError) appointments = appts || [];
    } catch (e) {
      // Appointments table might not exist yet
      console.log('Appointments table not found, skipping');
    }

    return {
      importantDates: dates || [],
      appointments: appointments,
      total: (dates?.length || 0) + appointments.length
    };
  } catch (error) {
    console.error('Error in getUpcomingEvents:', error);
    return { importantDates: [], appointments: [], total: 0 };
  }
}

/**
 * Get upcoming medication times in next N hours
 */
async function getUpcomingMedications(userId, hoursAhead = 24) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  try {
    const { data: medications, error } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching medications:', error);
      return [];
    }

    const upcoming = [];
    
    (medications || []).forEach(med => {
      // Parse times array
      let times = [];
      try {
        if (med.times) {
          times = typeof med.times === 'string' ? JSON.parse(med.times) : med.times;
        } else if (med.time) {
          times = [med.time];
        }
      } catch (e) {
        console.error('Error parsing medication times:', e);
      }

      times.forEach(time => {
        const [hour, minute] = time.split(':').map(Number);
        
        // Calculate hours until this dose
        let hoursUntil = hour - currentHour;
        if (hour < currentHour || (hour === currentHour && minute < currentMinute)) {
          hoursUntil += 24; // Tomorrow
        }

        if (hoursUntil >= 0 && hoursUntil <= hoursAhead) {
          upcoming.push({
            medication: med,
            scheduledTime: time,
            hoursUntil,
            isCritical: med.is_critical || false
          });
        }
      });
    });

    return upcoming.sort((a, b) => a.hoursUntil - b.hoursUntil);
  } catch (error) {
    console.error('Error in getUpcomingMedications:', error);
    return [];
  }
}

/**
 * Get missed or late medication doses in the last N days
 */
async function getMissedDoses(userId, daysBack = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);

  try {
    const { data, error } = await supabase
      .from('dose_events')
      .select('*, medications(*)')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lt('scheduled_at', new Date().toISOString())
      .gte('scheduled_at', cutoff.toISOString())
      .order('scheduled_at', { ascending: false });

    if (error) {
      console.error('Error fetching missed doses:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMissedDoses:', error);
    return [];
  }
}

/**
 * Get recent conversation topics from memory
 */
async function getRecentConversationTopics(userId, daysBack = 3) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);

  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('topic, summary, importance_level, created_at')
      .eq('user_id', userId)
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching conversation topics:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRecentConversationTopics:', error);
    return [];
  }
}

/**
 * Get user profile for personalization
 */
async function getUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('first_name, preferred_name, last_interaction_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
}

/**
 * Build comprehensive context for proactive outreach
 */
export async function scanUserContext(userId, hoursAhead = 24) {
  console.log(`🔍 Scanning context for user ${userId}...`);

  const [events, upcomingMeds, missedDoses, recentTopics, profile] = await Promise.all([
    getUpcomingEvents(userId, hoursAhead),
    getUpcomingMedications(userId, hoursAhead),
    getMissedDoses(userId, 7),
    getRecentConversationTopics(userId, 3),
    getUserProfile(userId)
  ]);

  const context = {
    events,
    upcomingMedications: upcomingMeds,
    missedDoses,
    recentTopics,
    profile,
    scanTime: new Date().toISOString()
  };

  console.log('📊 Context scan complete:', {
    upcomingEvents: events.total,
    upcomingMeds: upcomingMeds.length,
    missedDoses: missedDoses.length,
    recentTopics: recentTopics.length
  });

  return context;
}

/**
 * Determine if there's meaningful context to initiate contact
 */
export function shouldInitiateContact(context) {
  // Don't reach out if nothing meaningful is happening
  if (!context) return false;

  const hasUpcomingEvents = context.events.total > 0;
  const hasCriticalMedsSoon = context.upcomingMedications.some(m => 
    m.isCritical && m.hoursUntil < 2
  );
  const hasMissedDoses = context.missedDoses.length > 0;
  const hasImportantTopics = context.recentTopics.some(t => t.importance_level >= 2);

  // Initiate if any meaningful trigger exists
  return hasUpcomingEvents || hasCriticalMedsSoon || hasMissedDoses || hasImportantTopics;
}

/**
 * Build context-aware prompt for AI to generate proactive message
 */
export function buildProactivePrompt(context) {
  const userName = context.profile?.preferred_name || context.profile?.first_name || 'there';
  
  let contextDescription = `You are PoCo, a caring AI companion checking in with ${userName}.\n\n`;
  contextDescription += `**Current situation:**\n`;

  // Add upcoming events
  if (context.events.importantDates.length > 0) {
    contextDescription += `\n**Upcoming important dates:**\n`;
    context.events.importantDates.forEach(date => {
      const when = new Date(date.date).toLocaleDateString();
      const hoursUntil = Math.round((new Date(date.date) - new Date()) / (1000 * 60 * 60));
      contextDescription += `- ${date.title} (${date.type}) on ${when} (in ${hoursUntil} hours)\n`;
    });
  }

  if (context.events.appointments.length > 0) {
    contextDescription += `\n**Upcoming appointments:**\n`;
    context.events.appointments.forEach(appt => {
      const when = new Date(appt.date).toLocaleString();
      contextDescription += `- ${appt.title} at ${when}\n`;
    });
  }

  // Add medication context
  if (context.upcomingMedications.length > 0) {
    contextDescription += `\n**Upcoming medications (next 24h):**\n`;
    context.upcomingMedications.slice(0, 3).forEach(med => {
      const critical = med.isCritical ? ' (CRITICAL)' : '';
      contextDescription += `- ${med.medication.name} at ${med.scheduledTime}${critical}\n`;
    });
  }

  if (context.missedDoses.length > 0) {
    contextDescription += `\n**Health concern:** ${userName} has ${context.missedDoses.length} unconfirmed medication dose(s) in the past week.\n`;
  }

  // Add conversation context
  if (context.recentTopics.length > 0) {
    contextDescription += `\n**Recent conversation topics:**\n`;
    context.recentTopics.slice(0, 3).forEach(topic => {
      if (topic.topic) {
        contextDescription += `- ${topic.topic}${topic.summary ? ': ' + topic.summary : ''}\n`;
      }
    });
  }

  const prompt = `${contextDescription}

**Your task:** Craft a warm, natural, context-aware check-in message for ${userName}.

**Guidelines:**
✅ Be specific - reference actual events, appointments, or topics
✅ Sound like a caring friend, not a reminder app
✅ Offer genuine help or support
✅ Keep it warm and conversational (2-3 sentences max)
✅ Show you remember past conversations when relevant
✅ If multiple events, pick the most important/urgent one

❌ Don't sound robotic or like a notification
❌ Don't list everything - pick what matters most
❌ Don't say "I'm an AI" or "I'm here to remind you"
❌ Don't be overly formal

**Examples of GOOD messages:**
"Hi! I saw Emma's birthday is tomorrow. Last time we talked, you mentioned wanting to get her a gardening book - did you find one you like?"

"Hey there! Your dentist appointment is this afternoon at 3pm. I remember you were a bit nervous about it last time - want to chat before you go?"

"Good morning! I noticed you haven't taken your evening medication the past couple days. Is everything okay? I'm here if you want to talk."

**Examples of BAD messages:**
"Reminder: You have 3 events coming up."
"Just checking in! How are you doing today?"
"Don't forget about your appointment tomorrow."

Now generate a personalized message for ${userName}:`;

  return prompt;
}

/**
 * Format context for display/logging
 */
export function formatContextSummary(context) {
  return {
    upcomingEvents: context.events.total,
    nextMedication: context.upcomingMedications[0]?.medication.name || 'none',
    missedDoses: context.missedDoses.length,
    lastTopic: context.recentTopics[0]?.topic || 'none',
    shouldContact: shouldInitiateContact(context)
  };
}
