// Placeholder Supervisor Agent
// This is a temporary implementation for the hybrid approach
// In the future, this will be replaced with full COT agent architecture

export class SupervisorAgent {
  constructor() {
    console.log('🎯 Placeholder Supervisor Agent initialized');
    console.log('🔄 This will be replaced with full COT architecture in future builds');
    this.geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    this.openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    
    console.log('🔑 API Keys Status:', {
      gemini: this.geminiApiKey ? 'Present' : 'Missing',
      openai: this.openaiApiKey ? 'Present' : 'Missing'
    });
  }

  async processRequest(message, context) {
    console.log('🔄 Placeholder supervisor agent - using enhanced AI service directly');
    console.log('🔄 Message:', message);
    console.log('🔄 Context keys:', Object.keys(context));
    
    // Use the enhanced AI service directly without circular import
    // This ensures we get the URL support and enhanced prompts
    try {
      // Try Gemini first
      if (this.geminiApiKey) {
        try {
          console.log('🔄 Attempting Gemini API (primary)...');
          const response = await this.callGeminiAPI(message, context);
          return response;
        } catch (geminiError) {
          console.error('❌ Gemini API failed:', geminiError.message);
          console.log('🔄 Attempting OpenAI fallback...');
          
          // Try OpenAI as fallback
          if (this.openaiApiKey) {
            try {
              const response = await this.callOpenAIAPI(message, context);
              return response;
            } catch (openaiError) {
              console.error('❌ OpenAI fallback also failed:', openaiError.message);
              throw new Error('Both Gemini and OpenAI failed');
            }
          } else {
            console.error('❌ No fallback available (OpenAI API key missing)');
            throw new Error('OpenAI API key not available for fallback');
          }
        }
      } else {
        console.warn('⚠️ Gemini API key missing, trying OpenAI directly...');
        if (this.openaiApiKey) {
          return await this.callOpenAIAPI(message, context);
        } else {
          throw new Error('No API keys available (both Gemini and OpenAI missing)');
        }
      }
    } catch (error) {
      console.error('❌ All providers failed:', error.message);
      return this.getFallbackResponse(message);
    }
  }

  async callGeminiAPI(message, context) {
    try {
      console.log('🔄 Calling Gemini API...');
      
      const enhancedPrompt = this.buildPrompt(message, context);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiApiKey}`,
        {
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
            // generationConfig: {
            //   maxOutputTokens: 500,
            //   temperature: 0.7,
            // }
          }),
        }
      );

      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Gemini API HTTP error:', response.status);
        console.error('❌ Error details:', JSON.stringify(errorData, null, 2));
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('✅ Gemini response received');
      
      // Safely extract the text from response
      if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
        const candidate = data.candidates[0];
        
        if (candidate.content && candidate.content.parts && Array.isArray(candidate.content.parts) && candidate.content.parts.length > 0) {
          const aiText = candidate.content.parts[0].text?.trim();
          
          if (aiText) {
            console.log('[Gemini raw out]:', aiText);
            console.log('[Has URL?]:', /(https?:\/\/[^\s)]+)(?![^([]*[\])])/.test(aiText));
            return aiText;
          } else {
            throw new Error('Response text is empty');
          }
        } else {
          // Handle case where content exists but has no parts
          console.warn('⚠️ No content.parts in candidate response. Finish reason:', candidate.finishReason);
          console.warn('⚠️ Full candidate:', JSON.stringify(candidate, null, 2));
          
          if (candidate.finishReason === 'MAX_TOKENS') {
            throw new Error('Response was cut off at token limit (MAX_TOKENS)');
          } else if (candidate.finishReason === 'SAFETY') {
            throw new Error('Response was blocked by safety filters');
          } else {
            throw new Error(`Response generation stopped: ${candidate.finishReason}`);
          }
        }
      } else {
        throw new Error('No candidates in Gemini response');
      }
    } catch (error) {
      console.error('❌ Gemini API call failed:', error.message);
      throw error; // Re-throw to trigger fallback
    }
  }

  async callOpenAIAPI(message, context) {
    try {
      console.log('🔄 Calling OpenAI API...');
      
      const SYSTEM_PROMPT = this.getSystemPrompt(context);
      const enhancedPrompt = this.buildPrompt(message, context);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: enhancedPrompt }
          ],
          // max_tokens: 500,
          // temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenAI API HTTP error:', response.status);
        console.error('❌ Error details:', errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ OpenAI response received');
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const aiText = data.choices[0].message.content.trim();
        console.log('[OpenAI raw out]:', aiText);
        console.log('[Has URL?]:', /(https?:\/\/[^\s)]+)(?![^([]*[\])])/.test(aiText));
        return aiText;
      } else if (data.error) {
        console.error('❌ OpenAI API error response:', data.error);
        throw new Error(`OpenAI error: ${data.error.message}`);
      } else {
        console.error('❌ Unexpected OpenAI response format:', data);
        throw new Error('Unexpected response format from OpenAI');
      }
    } catch (error) {
      console.error('❌ OpenAI API call failed:', error.message);
      throw error; // Re-throw to trigger fallback
    }
  }

  buildPrompt(message, context) {
    // Extract conversation history from context
    const conversationHistory = context.conversationHistory || [];
    const userProfile = context.userProfile || {};
    const companionName = context.companionName || 'Pixel';
    const userName = userProfile?.first_name || 'friend';
    
    // Build conversation context
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = '\n\nRECENT CONVERSATION HISTORY:\n';
      conversationHistory.forEach((msg) => {
        const role = msg.role === 'user' ? 'User' : companionName;
        conversationContext += `${role}: ${msg.content}\n`;
      });
    }
    
    // Build the enhanced prompt
    const enhancedPrompt = `You are ${companionName}, a warm and conversational AI companion. The user's name is ${userName}.

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
- Remember the user's name is ${userName}, you are ${companionName}
- Be helpful but conversational
- Keep responses concise (2-3 sentences max) to reduce speech latency
- If user asks for recommendations, give 1-2 suggestions, not long lists
- Pay attention to conversation context and don't repeat questions
- Show personality and warmth
- Avoid repetitive greetings like "Hey ${userName}!" - use natural conversation flow

RESPONSE STYLE EXAMPLES:
- Instead of: "Here are 3 options: 1. A, 2. B, 3. C"
- Try: "I've been hearing great things about [specific recommendation]. It's really [positive quality]. What do you think about that?"

- Instead of: "I can help you with that."
- Try: "Absolutely! I'd love to help you with that."

- Instead of: "How are you feeling today?"
- Try: "How's your day going, ${userName}? I hope you're doing well."

${conversationContext}

Current user message: ${message}

Please respond naturally and conversationally, maintaining context and showing genuine interest.`;

    return enhancedPrompt;
  }

  getSystemPrompt(context) {
    const companionName = context.companionName || 'Pixel';
    
    return `You are a smart and efficient AI companion named ${companionName}. You're here to chat, help, and be genuinely useful. Be warm and friendly while being action-oriented and efficient.

CRITICAL RULE: When asked for links, recipes, or specific information, you MUST provide the actual content immediately. Do NOT apologize or say you can't provide it. ALWAYS include real URLs or complete information.

URL RULE: Always include the full https:// URL. Do not use placeholders like [link] or 'insert link here'. Provide actual working URLs.

COMPANION PERSONALITY:
- Be warm, friendly, and genuinely helpful
- Use casual, conversational language - like talking to a smart friend
- Be action-oriented: when asked for something specific, provide it immediately
- Be efficient: don't just talk about helping, actually help
- Show personality and warmth while being useful
- Remember details about the user and reference them naturally
- Be a good listener and respond thoughtfully

SAFETY GUIDELINES:
- Never provide medical, legal, or financial advice unless clearly educational
- Encourage professional consultation for serious matters
- Be supportive but not a replacement for professional services
- Respect user privacy and boundaries`;
  }

  getFallbackResponse(message) {
    const responses = [
      "I'm having a moment connecting right now, but I'm still here for you. What would you like to chat about?",
      "Sorry for the brief hiccup! I'm back. What were you saying?",
      "Having a little technical moment, but I'm eager to hear what's on your mind!",
      "My apologies for that! I'm ready to help. What can I do for you?",
      "Just a quick blip on my end! I'm here now. Tell me what you need!"
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }
}
