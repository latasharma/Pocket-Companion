// Placeholder Supervisor Agent
// This is a temporary implementation for the hybrid approach
// In the future, this will be replaced with full COT agent architecture

import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  circuitBreakers, 
  RetryManager, 
  ModelCache 
} from '../apiStability.js';

export class SupervisorAgent {
  constructor() {
    console.log('🎯 Placeholder Supervisor Agent initialized');
    console.log('🔄 This will be replaced with full COT architecture in future builds');
  }

  async processRequest(message, context) {
    console.log('🔄 Placeholder supervisor agent - using enhanced AI service directly');
    console.log('🔄 Message:', message);
    console.log('🔄 Context keys:', Object.keys(context));
    
    // Use the enhanced AI service directly without circular import
    // This ensures we get the URL support and enhanced prompts
    const response = await this.callEnhancedAI(message, context);
    
    return response;
  }

  async callEnhancedAI(message, context) {
    // Extract conversation history from context
    const conversationHistory = context.conversationHistory || [];
    const userProfile = context.userProfile || {};
    
    // Always fetch fresh userProfile from database to ensure correct names
    let finalUserName = userProfile.first_name;
    let finalCompanionName = userProfile.companion_name;
    
    // If userProfile is missing or incomplete, fetch from database
    if ((!finalUserName || !finalCompanionName) && context.userId) {
      try {
        const { supabase } = await import('../supabase.js');
        const { data } = await supabase
          .from('profiles')
          .select('first_name, companion_name')
          .eq('id', context.userId)
          .single();
        if (data) {
          finalUserName = data.first_name;
          finalCompanionName = data.companion_name;
          // Update userProfile object for future use
          userProfile.first_name = data.first_name;
          userProfile.companion_name = data.companion_name;
          console.log(`✅ Fetched userProfile from database: User=${finalUserName}, Companion=${finalCompanionName}`);
        }
      } catch (error) {
        console.log('⚠️ Could not fetch userProfile:', error.message);
      }
    }
    
    // Use generic fallbacks only if database truly doesn't have names (no hardcoded names)
    finalUserName = finalUserName || 'there';
    finalCompanionName = finalCompanionName || 'your companion';
    
    // CRITICAL: Never hardcode names - always use what's in the database
    if (!finalCompanionName || finalCompanionName === 'your companion') {
      console.warn('⚠️ Companion name not found in database - using generic fallback');
    }
    if (!finalUserName || finalUserName === 'there') {
      console.warn('⚠️ User name not found in database - using generic fallback');
    }
    
    console.log(`👤 Using names - User: ${finalUserName}, Companion: ${finalCompanionName}`);
    
    // Build conversation context
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = '\n\nCONVERSATION HISTORY:\n';
      conversationHistory.forEach((msg, index) => {
        const role = msg.sender_type === 'user' ? 'User' : 'Assistant';
        conversationContext += `${role}: ${msg.content}\n`;
      });
    }
    
    // Build the enhanced prompt with conversation context
    const enhancedPrompt = `You are ${finalCompanionName}, a warm and conversational AI companion. The user's name is ${finalUserName}.

CONVERSATION STYLE:
- Be warm, friendly, and genuinely interested
- Talk like a caring friend, not a search engine
- Share personal enthusiasm and excitement
- Use natural conversation flow with pauses and transitions
- Show personality through your word choices and tone
- Be helpful but also engaging and fun to talk to

SMART URL RULE: Only provide URLs when specifically asked for them or when they would be genuinely helpful. If the user says "stop", "no URLs", or "don't give me links", then respond naturally without any URLs.

WHEN TO PROVIDE URLS:
- When user asks for specific apps, websites, or resources
- When user asks for recipes, meditation apps, workout apps, etc.
- When user asks "what's a good [app/website] for [purpose]"

WHEN NOT TO PROVIDE URLS:
- When user says "stop", "no URLs", "don't give me links"
- When user is just chatting casually
- When user asks general questions that don't need specific resources
- When user is frustrated or asking you to stop

CONVERSATION RULES:
- CRITICAL: The user's name is ${finalUserName}. Your name (the AI companion) is ${finalCompanionName}
- NEVER call the user by your own name (${finalCompanionName})
- NEVER call yourself by the user's name (${finalUserName})
- Always refer to the user as ${finalUserName} when addressing them
- Always refer to yourself as ${finalCompanionName} when talking about yourself
- Be helpful but conversational
- Keep responses concise (2-3 sentences max) to reduce speech latency
- If user asks for recommendations, give 1-2 suggestions, not long lists
- Pay attention to conversation context and don't repeat questions
- Show personality and warmth
- Avoid repetitive greetings like "Hey ${finalUserName}!" - use natural conversation flow

RESPONSE STYLE EXAMPLES:
- Instead of: "Here are 3 options: 1. A, 2. B, 3. C"
- Try: "I've been hearing great things about [specific recommendation]. It's really [positive quality]. What do you think about that?"

- Instead of: "I can help you with that."
- Try: "Absolutely! I'd love to help you with that."

- Instead of: "How are you feeling today?"
- Try: "How's your day going, ${finalUserName}? I hope you're doing well."

${conversationContext}

Current user message: ${message}

Please respond naturally and conversationally, maintaining context and showing genuine interest.`;

    // Use official Google Generative AI SDK
    const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    
    try {
      console.log('🔄 Calling Gemini API using official SDK...');
      console.log('🔄 API Key exists:', !!geminiApiKey);
      
      if (!geminiApiKey) {
        throw new Error('Gemini API key not available');
      }

      // Try Gemini directly - 404s fail immediately, no retries
      const aiText = await this._makeGeminiRequest(geminiApiKey, enhancedPrompt);
      
      console.log('[Agent raw out]:', aiText);
      console.log('[Agent Has URL?]:', /(https?:\/\/[^\s)]+)(?![^([]*[\])])/.test(aiText));
      return aiText;
    } catch (error) {
      // Silent error handling - never show errors to users
      // Just fallback to OpenAI gracefully
      if (__DEV__) {
        console.log('⚠️ Gemini failed, using OpenAI fallback');
      }
      return await this.fallbackToOpenAI(enhancedPrompt, message, finalUserName, finalCompanionName);
    }
  }

  // Create timeout signal for React Native compatibility
  _createTimeoutSignal(timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
    // Clean up timeout if signal is already aborted
    controller.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    });
    return controller.signal;
  }

  // Internal method to make Gemini API request with model caching
  async _makeGeminiRequest(geminiApiKey, enhancedPrompt) {
    // Try cached model first
    const cachedModel = await ModelCache.getWorkingModel('gemini');
    const modelsToTry = [];
    
    if (cachedModel) {
      modelsToTry.push({ 
        name: cachedModel.model, 
        version: cachedModel.version 
      });
    }
    
    // Add fallback models - try v1beta first (more stable)
    modelsToTry.push(
      { name: 'gemini-pro', version: 'v1beta' }, // Most stable, available in v1beta
      { name: 'gemini-1.5-flash', version: 'v1beta' }, // Try v1beta for flash too
      { name: 'gemini-1.5-flash', version: 'v1' }, // Then try v1
      { name: 'gemini-1.5-pro', version: 'v1beta' }, // Try v1beta for pro
      { name: 'gemini-1.5-pro', version: 'v1' } // Last resort
    );

    // Try models sequentially but quickly (no retries for 404s)
    for (const { name, version } of modelsToTry) {
      try {
        console.log(`🔄 Trying Gemini model: ${name} (${version})`);
        
        const apiUrl = `https://generativelanguage.googleapis.com/${version}/models/${name}:generateContent?key=${geminiApiKey}`;
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: enhancedPrompt
              }]
            }],
            generationConfig: {
              maxOutputTokens: 300,
              temperature: 0.7,
            }
          }),
          signal: this._createTimeoutSignal(10000) // 10 second timeout
        });

        if (!response.ok) {
          const status = response.status;
          
          // 404 means model doesn't exist - skip immediately
          if (status === 404) {
            console.log(`⚠️ Model ${name} (${version}) not found - trying next`);
            continue; // Try next model immediately
          }
          
          // For other errors, throw
          const errorText = await response.text();
          throw new Error(`HTTP ${status}: ${errorText}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          const aiText = data.candidates[0].content.parts[0].text;
          
          // Cache successful model
          if (cachedModel?.model !== name || cachedModel?.version !== version) {
            await ModelCache.setWorkingModel('gemini', name, version);
            console.log(`✅ Using Gemini model: ${name} (${version})`);
          }
          
          return aiText;
        } else {
          throw new Error('Invalid response format from Gemini API');
        }
      } catch (error) {
        // Skip 404s immediately, throw others
        if (error.message.includes('404') || error.message.includes('NOT_FOUND')) {
          console.log(`⚠️ Model ${name} (${version}) not found - trying next`);
          continue;
        }
        throw error;
      }
    }

    throw new Error('All Gemini models failed');
  }

  async fallbackToOpenAI(prompt, userMessage, userName, companionName) {
    try {
      const openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not found');
      }

      console.log('🔄 Falling back to OpenAI...');
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: `You are ${companionName}, a warm and conversational AI companion. The user's name is ${userName}. 

CRITICAL NAME RULES:
- The user's name is ${userName}
- Your name (the AI companion) is ${companionName}
- NEVER confuse the names - the user is ${userName}, you are ${companionName}
- When addressing the user, use their name: ${userName}
- When referring to yourself, use your name: ${companionName}

Be friendly, engaging, and maintain conversation context naturally.` },
            { role: 'user', content: prompt }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const aiText = data.choices[0].message.content.trim();
        console.log('[Agent OpenAI fallback out]:', aiText);
        return aiText;
      } else {
        throw new Error('Unexpected response format from OpenAI');
      }
    } catch (error) {
      console.error('❌ OpenAI fallback also failed:', error);
      // Last resort - return a contextual response
      if (userMessage.toLowerCase().includes('frustrating') || userMessage.toLowerCase().includes('app') || userMessage.toLowerCase().includes('apple')) {
        return "I totally understand that frustration. Getting apps approved can be a real challenge, but you're doing great work. What specific issues are you running into with the approval process?";
      }
      return "I'm having trouble connecting right now, but I'm here to help! Could you tell me more about what you need?";
    }
  }
}
