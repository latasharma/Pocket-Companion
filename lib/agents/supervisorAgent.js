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
    const enhancedPrompt = `You are Pixel, a smart and efficient AI companion. The user's name is Paul.

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
- Don't ask too many questions - be direct and helpful
- If user asks for recommendations, give them directly
- If user asks for "top 3" or "trending", provide exactly that
- Pay attention to conversation context and don't repeat questions

EXAMPLES:
- User: "I need a meditation app" → Provide URL
- User: "Stop giving me URLs" → Respond naturally, no URLs
- User: "How are you?" → Just chat, no URLs
- User: "Give me top 3 murder mystery books" → List 3 books directly

${conversationContext}

Current user message: ${message}

Please respond naturally, maintain conversation context, remember names, and only provide URLs when appropriate.`;

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
