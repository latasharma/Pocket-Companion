// Placeholder Supervisor Agent
// This is a temporary implementation for the hybrid approach
// In the future, this will be replaced with full COT agent architecture

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
    const enhancedPrompt = `You are Pixel, a warm and conversational AI companion. The user's name is Paul.

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
- Remember the user's name is Paul, you are Pixel
- Be helpful but conversational
- Keep responses concise (2-3 sentences max) to reduce speech latency
- If user asks for recommendations, give 1-2 suggestions, not long lists
- Pay attention to conversation context and don't repeat questions
- Show personality and warmth
- Avoid repetitive greetings like "Hey Paul!" - use natural conversation flow

RESPONSE STYLE EXAMPLES:
- Instead of: "Here are 3 options: 1. A, 2. B, 3. C"
- Try: "I've been hearing great things about [specific recommendation]. It's really [positive quality]. What do you think about that?"

- Instead of: "I can help you with that."
- Try: "Absolutely! I'd love to help you with that."

- Instead of: "How are you feeling today?"
- Try: "How's your day going, Paul? I hope you're doing well."

${conversationContext}

Current user message: ${message}

Please respond naturally and conversationally, maintaining context and showing genuine interest.`;

    // Use Gemini API directly
    const geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    
    try {
      console.log('🔄 Calling Gemini API directly...');
      console.log('🔄 API Key exists:', !!geminiApiKey);
      console.log('🔄 API Key length:', geminiApiKey?.length);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
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
            maxOutputTokens: 500,
            temperature: 0.7,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const aiText = data.candidates[0].content.parts[0].text.trim();
        console.log('[Agent raw out]:', aiText);
        console.log('[Agent Has URL?]:', /(https?:\/\/[^\s)]+)(?![^([]*[\])])/.test(aiText));
        return aiText;
      } else {
        throw new Error('Unexpected response format from Gemini');
      }
    } catch (error) {
      console.error('❌ Gemini request failed:', error);
      return "I'm here to help! What would you like to know?";
    }
  }
}
