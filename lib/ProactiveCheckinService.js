/**
 * Proactive Check-in Service
 * Manages PoCo's proactive outreach when user hasn't interacted for 8 hours
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleNotification, cancelScheduledNotification } from './NotificationService';
import { supabase } from './supabase';

const INACTIVITY_HOURS = 8;
const CHECKIN_NOTIFICATION_ID = 'poco-proactive-checkin';

import { scanUserContext, shouldInitiateContact, buildProactivePrompt } from './ContextScannerService';
import { AIService } from './aiService';

/**
 * Fallback check-in messages if context scan fails
 */
const FALLBACK_MESSAGES = [
  {
    title: "Just checking in! 👋",
    body: "Haven't heard from you today. How are you doing?",
    greeting: "Hi! I haven't heard from you in a while. Is everything okay?"
  },
  {
    title: "Thinking of you! 💭",
    body: "It's been a while since we last chatted. What's new?",
    greeting: "Hey there! It's been quiet today. I wanted to check in and see how you're doing."
  },
  {
    title: "Miss chatting with you! 😊",
    body: "Let's catch up! How has your day been?",
    greeting: "I've been wondering how you're doing! Want to tell me about your day?"
  },
  {
    title: "Hope you're well! 🌟",
    body: "Just wanted to say hello and see how things are going.",
    greeting: "Hello! I hope everything is going well. I'm here if you want to chat!"
  },
];

/**
 * Get a random fallback message
 */
function getRandomFallbackMessage() {
  return FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
}

/**
 * Generate context-aware proactive message using AI
 */
async function generateContextAwareMessage(userId) {
  try {
    // Scan user's context
    const context = await scanUserContext(userId, 48); // Next 48 hours
    
    // Check if there's meaningful context
    if (!shouldInitiateContact(context)) {
      console.log('No meaningful context found, skipping proactive message');
      return null;
    }

    // Build smart prompt with context
    const prompt = buildProactivePrompt(context);

    // Generate personalized message using AI
    const response = await AIService.generateText(prompt, {
      maxTokens: 150,
      temperature: 0.8,
    });

    if (!response || !response.trim()) {
      throw new Error('Empty response from AI');
    }

    const message = response.trim();

    // Create notification title from first sentence
    const firstSentence = message.split(/[.!?]/)[0] + '.';
    const title = firstSentence.length > 50 
      ? firstSentence.substring(0, 47) + '...'
      : firstSentence;

    // Body is the rest or the whole message
    const body = message.length > 100 
      ? message.substring(0, 97) + '...'
      : message;

    return {
      title,
      body,
      greeting: message, // Full message for chat
      contextBased: true
    };
  } catch (error) {
    console.error('Error generating context-aware message:', error);
    return null;
  }
}

/**
 * Update last interaction time in database
 */
export async function updateLastInteraction() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ last_interaction_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating last interaction:', error);
    } else {
      console.log('✅ Updated last interaction timestamp');
    }
  } catch (err) {
    console.error('Error in updateLastInteraction:', err);
  }
}

/**
 * Schedule a proactive check-in notification for 8 hours from now
 * Uses context-aware AI generation for personalized messages
 */
export async function scheduleProactiveCheckIn() {
  try {
    // Cancel any existing check-in notification
    await cancelScheduledNotification(CHECKIN_NOTIFICATION_ID);

    // Calculate 8 hours from now
    const checkInTime = new Date();
    checkInTime.setHours(checkInTime.getHours() + INACTIVITY_HOURS);

    // Get user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No user logged in, skipping check-in schedule');
      return;
    }

    // Try to generate context-aware message
    let message = await generateContextAwareMessage(user.id);
    
    // Fallback to random message if context generation fails
    if (!message) {
      console.log('Using fallback message');
      message = getRandomFallbackMessage();
      message.contextBased = false;
    }

    // Store the greeting message to use when notification is opened
    await AsyncStorage.setItem('pending_checkin_greeting', message.greeting);
    await AsyncStorage.setItem('pending_checkin_context_based', String(message.contextBased));

    // Schedule notification
    await scheduleNotification({
      id: CHECKIN_NOTIFICATION_ID,
      title: message.title,
      body: message.body,
      date: checkInTime,
      type: 'proactive_checkin',
      data: {
        greeting: message.greeting,
        contextBased: message.contextBased,
        timestamp: checkInTime.toISOString(),
      },
    });

    const messageType = message.contextBased ? 'context-aware' : 'generic';
    console.log(`📅 Scheduled ${messageType} check-in for ${checkInTime.toLocaleString()}`);
  } catch (error) {
    console.error('Error scheduling proactive check-in:', error);
  }
}

/**
 * Cancel any scheduled proactive check-in
 * Call this when user interacts with the app
 */
export async function cancelProactiveCheckIn() {
  try {
    await cancelScheduledNotification(CHECKIN_NOTIFICATION_ID);
    await AsyncStorage.removeItem('pending_checkin_greeting');
    console.log('🗑️  Cancelled proactive check-in');
  } catch (error) {
    console.error('Error cancelling proactive check-in:', error);
  }
}

/**
 * Handle user interaction - update timestamp and reschedule check-in
 * Call this whenever user sends a message
 */
export async function handleUserInteraction() {
  try {
    // Update database timestamp
    await updateLastInteraction();

    // Cancel old check-in and schedule new one
    await scheduleProactiveCheckIn();
  } catch (error) {
    console.error('Error handling user interaction:', error);
  }
}

/**
 * Get the stored greeting message for when notification is opened
 */
export async function getPendingCheckInGreeting() {
  try {
    const greeting = await AsyncStorage.getItem('pending_checkin_greeting');
    if (greeting) {
      // Clear it after retrieving
      await AsyncStorage.removeItem('pending_checkin_greeting');
      return greeting;
    }
    // Fallback greeting
    return "Hi! I haven't heard from you in a while. Is everything okay?";
  } catch (error) {
    console.error('Error getting pending greeting:', error);
    return "Hi! How are you doing?";
  }
}

/**
 * Initialize proactive check-in system on app start
 * Checks if user is already inactive and schedules appropriately
 */
export async function initializeProactiveCheckIn() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get last interaction time from database
    const { data, error } = await supabase
      .from('profiles')
      .select('last_interaction_at')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      console.log('No last interaction found, scheduling fresh check-in');
      await scheduleProactiveCheckIn();
      return;
    }

    const lastInteraction = new Date(data.last_interaction_at);
    const now = new Date();
    const hoursSinceLastInteraction = (now - lastInteraction) / (1000 * 60 * 60);

    if (hoursSinceLastInteraction >= INACTIVITY_HOURS) {
      // User is already inactive - send notification now or soon
      console.log(`⏰ User inactive for ${hoursSinceLastInteraction.toFixed(1)} hours`);
      // Schedule for 1 minute from now to give app time to load
      const soonTime = new Date();
      soonTime.setMinutes(soonTime.getMinutes() + 1);
      
      const message = getRandomCheckInMessage();
      await AsyncStorage.setItem('pending_checkin_greeting', message.greeting);
      
      await scheduleNotification({
        id: CHECKIN_NOTIFICATION_ID,
        title: message.title,
        body: message.body,
        date: soonTime,
        type: 'proactive_checkin',
        data: {
          greeting: message.greeting,
          timestamp: soonTime.toISOString(),
        },
      });
    } else {
      // User is still within active window - schedule for remaining time
      const remainingHours = INACTIVITY_HOURS - hoursSinceLastInteraction;
      const checkInTime = new Date();
      checkInTime.setHours(checkInTime.getHours() + remainingHours);
      
      const message = getRandomCheckInMessage();
      await AsyncStorage.setItem('pending_checkin_greeting', message.greeting);
      
      await scheduleNotification({
        id: CHECKIN_NOTIFICATION_ID,
        title: message.title,
        body: message.body,
        date: checkInTime,
        type: 'proactive_checkin',
        data: {
          greeting: message.greeting,
          timestamp: checkInTime.toISOString(),
        },
      });

      console.log(`📅 User active ${hoursSinceLastInteraction.toFixed(1)}h ago, next check-in in ${remainingHours.toFixed(1)}h`);
    }
  } catch (error) {
    console.error('Error initializing proactive check-in:', error);
  }
}
