import { Alert } from 'react-native';
import agentConfig from './agentConfig.js';
import { supabase } from './supabase';

// AI Companion Rules and Guidelines
const AI_COMPANION_RULES = {
  core_principles: [
    "Always be helpful, respectful, and professional",
    "Never provide harmful, dangerous, or illegal advice",
    "Maintain appropriate boundaries and professional relationships",
    "Respect user privacy and confidentiality",
    "Be honest about limitations and capabilities",
    "Encourage professional help for serious issues"
  ],
  communication_style: [
    "Use warm, friendly tone without being patronizing",
    "Address users by their first name when known",
    "Avoid condescending terms like 'honey', 'sweetie', 'dear'",
    "Be concise but thorough in responses",
    "Ask clarifying questions when needed",
    "Provide actionable advice when requested"
  ],
  safety_guidelines: [
    "Never provide medical, legal, or financial advice unless clearly educational",
    "Encourage professional consultation for serious matters",
    "Avoid giving advice that could be harmful or dangerous",
    "Be supportive but not a replacement for professional services",
    "Respect user autonomy and decision-making"
  ],
  memory_guidelines: [
    "Remember user preferences and important information",
    "Reference previous conversations naturally when relevant",
    "Build on past discussions without making users repeat themselves",
    "Use conversation history to provide personalized responses",
    "Maintain context across multiple conversations"
  ]
};

// Memory system for conversation history and user context
class MemorySystem {
  constructor() {
    this.conversationHistory = [];
    this.userContext = {};
    this.userRules = AI_COMPANION_RULES;
    this.maxHistoryLength = 20; // Keep last 20 messages for context
  }

  // Add a message to conversation history
  addMessage(role, content, timestamp = new Date().toISOString()) {
    this.conversationHistory.push({
      role,
      content,
      timestamp
    });

    // Keep only the last maxHistoryLength messages
    if (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
    }
  }

  // Get conversation history for context
  getConversationHistory() {
    return this.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  // Update user context with important information
  updateUserContext(key, value) {
    this.userContext[key] = value;
  }

  // Get user context summary
  getUserContext() {
    return this.userContext;
  }

  // Get AI rules
  getAIRules() {
    return this.userRules;
  }

  // Clear conversation history
  clearHistory() {
    this.conversationHistory = [];
  }

  // Save memory to database
  async saveToDatabase(userId) {
    try {
      const { error } = await supabase
        .from('user_memory')
        .upsert({
          user_id: userId,
          conversation_history: this.conversationHistory,
          user_context: this.userContext,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving memory to database:', error);
    }
  }

  // Load memory from database
  async loadFromDatabase(userId) {
    try {
      const { data, error } = await supabase
        .from('user_memory')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      if (data) {
        this.conversationHistory = data.conversation_history || [];
        this.userContext = data.user_context || {};
      }
    } catch (error) {
      console.error('Error loading memory from database:', error);
    }
  }
}

// Initialize memory system
const memorySystem = new MemorySystem();

// Updated system prompt for a smart and efficient AI companion
const SYSTEM_PROMPT = `You are a smart and efficient AI companion named [COMPANION_NAME]. You're here to chat, help, and be genuinely useful. Be warm and friendly while being action-oriented and efficient.

⚠️ CRITICAL RULE: When asked for links, recipes, or specific information, you MUST provide the actual content immediately. Do NOT apologize or say you can't provide it. ALWAYS include real URLs or complete information.

URL RULE: Always include the full https:// URL. Do not use placeholders like [link] or 'insert link here'. Provide actual working URLs.

IMPORTANT DISCLAIMER:
This AI companion is for entertainment and general assistance purposes only. We are not responsible for any decisions made based on AI responses. The AI does not provide medical, legal, financial, or professional advice. Always consult qualified professionals for serious matters.

COMPANION PERSONALITY:
- Be warm, friendly, and genuinely helpful
- Use casual, conversational language - like talking to a smart friend
- Be action-oriented: when asked for something specific, provide it immediately
- Be efficient: don't just talk about helping, actually help
- Show personality and warmth while being useful
- Remember details about the user and reference them naturally
- Be a good listener and respond thoughtfully

SMART & EFFICIENT BEHAVIOR:
- When asked for links, recipes, information, or specific help: PROVIDE IT IMMEDIATELY
- Don't just promise to help - actually help
- If asked for a recipe, provide the complete recipe (not just talk about it)
- If asked for a link, provide the actual link or specific resource
- Be concise but thorough - don't waste time with unnecessary conversation
- Prioritize being helpful over being conversational when specific help is requested

SPECIFIC INSTRUCTIONS FOR LINKS AND RECIPES:
- When asked for a recipe: Provide the complete recipe with ingredients, steps, and cooking time
- When asked for information: Provide the actual information, not just promises
- When asked for links: Provide specific website names and search terms that will help them find what they need
- NEVER apologize for not having a link - instead, provide a solution or alternative

SMART LINK ALTERNATIVES:
- Provide actual working URLs when possible
- Example: "Here's a meditation app: https://www.headspace.com"
- Example: "Try this recipe site: https://www.allrecipes.com"
- Example: "Check out: https://www.calm.com for guided meditations"
- If you can't provide a specific URL, give website names and search terms

COMMUNICATION STYLE:
- Use the user's first name naturally in conversation
- Be conversational, not formal or robotic
- Be direct and helpful when specific requests are made
- Ask clarifying questions only when truly needed
- Be encouraging and supportive
- Use casual language and contractions (I'm, you're, that's, etc.)
- Show enthusiasm and personality
- Be a smart friend who actually helps solve problems

RESPONSE PATTERN:
1. FIRST: Address the specific request or question directly
2. SECOND: Provide the actual help/information requested
3. THIRD: Add friendly conversation if appropriate
4. NEVER: Promise to help without actually helping

EXAMPLES OF GOOD EFFICIENT RESPONSES:
- "Here's that Thai tofu recipe you asked for: [complete recipe with ingredients and steps]"
- "For meditation, try https://www.headspace.com or search 'guided meditation' on YouTube"
- "For your question about [topic], here's what you need to know: [specific information]"
- "Search 'Thai tofu recipe' on https://www.allrecipes.com or https://www.foodnetwork.com"
- "Try https://www.calm.com for meditation apps"

EXAMPLES OF BAD RESPONSES (promising but not delivering):
- "I'll send you the recipe later"
- "I have a great link for you somewhere"
- "Let me find that information for you" (without actually providing it)
- "I'm sorry I couldn't provide a link earlier"
- "I should have thought of that"
- "I'll try to remember to include links in the future"

SAFETY GUIDELINES:
- Never provide medical, legal, or financial advice unless clearly educational
- Encourage professional consultation for serious matters
- Be supportive but not a replacement for professional services
- Respect user privacy and boundaries

MEMORY GUIDELINES:
- Remember important details about the user's life
- Reference previous conversations naturally
- Build on past discussions like a good friend would
- Remember their preferences, interests, and experiences
- Don't repeat the same stories or jokes

CONVERSATION STYLE:
- Be a smart friend who actually helps
- Show personality and warmth
- Be conversational and natural
- Be action-oriented and efficient
- Provide real value, not just conversation
- Remember details and reference them naturally`;

export class AIService {
  constructor() {
    console.log('🚀 AIService constructor called - checking for COT...');
    this.openaiApiKey = null;
    this.geminiApiKey = null;
    this.currentProvider = 'gemini';
    this.fallbackProvider = 'openai'; // Gemini is primary, OpenAI is fallback
    
    // Initialize supervisor agent if enabled
    this.supervisorAgent = null;
    
    // Load API keys
    this.loadApiKeys();
    
    // Initialize supervisor agent (will be called when first needed)
    this.initializeSupervisorAgent();
  }

  // Static method for compatibility with existing code
  static async sendMessage(userMessage, conversationHistory = [], companionName = 'Pixel', deviceId = null, userId = '00000000-0000-0000-0000-000000000000') {
    console.log('📄 sendMessage called - using enhanced AI service');
    console.log('📄 User message:', userMessage);
    console.log('📄 Conversation history length:', conversationHistory.length);
    console.log('📄 Companion name:', companionName);
    console.log('📱 Device ID:', deviceId);
    console.log('👤 User ID:', userId);
    
    // Create a temporary instance for this request
    const aiService = new AIService();
    
    // FIX 1: Clear the module-level memory system to prevent accumulation
    memorySystem.clearHistory();
    console.log('🧹 Memory system cleared');
    
    // FIX 2: Only add the current conversation to memory (not historical data accumulation)
    if (conversationHistory && conversationHistory.length > 0) {
      conversationHistory.forEach(msg => {
        memorySystem.addMessage(
          msg.sender_type === 'user' ? 'user' : 'assistant',
          msg.content
        );
      });
      console.log('📄 Added', conversationHistory.length, 'messages to memory');
    }
    
    // Add the new user message
    memorySystem.addMessage('user', userMessage);
    
    // FIX 3: Pass companionName to chat method
    console.log('🤖 aiService.chat... ', deviceId);
    const response = await aiService.chat(
      userMessage,
      userId,
      companionName,
      deviceId,
    );
    
    // Debug: Check if response has URL
    console.log('[AI raw out]:', response);
    console.log('[Has URL?]:', /(https?:\/\/[^\s)]+)(?![^([]*[\])])/.test(response));
    
    return {
      content: response,
      tokensUsed: 0,
      safetyFlagged: false
    };
  }

  // Load API keys from environment
  loadApiKeys() {
    this.openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    this.geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    
    console.log('🔐 API Keys Status:', {
      openai: this.openaiApiKey ? 'Present' : 'Missing',
      gemini: this.geminiApiKey ? 'Present' : 'Missing'
    });
  }

  // Initialize supervisor agent if agent architecture is enabled
  async initializeSupervisorAgent() {
    console.log('🔍 Checking agent architecture status...');
    console.log('🔍 Agent config enabled:', agentConfig.isAgentArchitectureEnabled());
    
    if (agentConfig.isAgentArchitectureEnabled()) {
      try {
        console.log('🎯 Initializing supervisor agent...');
        // Check if the file exists before trying to import
        const { SupervisorAgent } = await import('./agents/supervisorAgent.js');
        this.supervisorAgent = new SupervisorAgent();
        console.log('✅ Supervisor Agent initialized successfully');
      } catch (error) {
        console.log('📄 Supervisor agent file not found - falling back to standard AI service');
        console.log('📄 This is expected in current build - agent architecture will be available in future');
        this.supervisorAgent = null;
      }
    } else {
      console.log('📄 Agent architecture disabled - skipping supervisor agent initialization');
    }
  }

  // Initialize memory for a user
  async initializeMemory(userId) {
    await memorySystem.loadFromDatabase(userId);
  }

  // Get user profile for context
  async getUserProfile(userId) {
    console.log('🎯 Fetching user profile for ID:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, companion_name')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }

  // Get user medications for context
  async getUserMedications(userId) {
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user medications:', error);
      return [];
    }
  }

  // Enhanced chat function with memory and agent architecture
  // FIX 3: Updated signature to accept companionName parameter
  async chat(message, userId, companionName = 'Pixel', deviceId) {
    try {
      // Initialize supervisor agent if not already done
      if (!this.supervisorAgent && agentConfig.isAgentArchitectureEnabled()) {
        await this.initializeSupervisorAgent();
      }
      
      // Get user profile for context (skip if using temp UUID)
      const userProfile = userId === '00000000-0000-0000-0000-000000000000' 
        ? null 
        : await this.getUserProfile(userId);
      
      // Check if agent architecture is enabled
      if (this.supervisorAgent && agentConfig.isAgentArchitectureEnabled()) {
        console.log('🎯 Using agent architecture for response');
        
        // Build context for agents
        const context = {
          userProfile,
          conversationHistory: memorySystem.getConversationHistory(),
          userContext: memorySystem.getUserContext(),
          userId,
          companionName, // FIX 3: Pass companion name to context
        };
        
        // Use supervisor agent
        const agentResponse = await this.supervisorAgent.processRequest(message, context);
        
        // Debug: Check if agent response has URL
        console.log('[Agent raw out]', agentResponse);
        console.log('[Agent Has URL?]', /(https?:\/\/[^\s)]+)(?![^([]*[\])])/.test(agentResponse));
        
        // Add AI response to memory
        memorySystem.addMessage('assistant', agentResponse);
        
        // Save memory to database (skip if using temp UUID)
        if (userId !== '00000000-0000-0000-0000-000000000000') {
          await memorySystem.saveToDatabase(userId);
        }
        
        return agentResponse;
      } else {
        console.log('📄 Using current AI service for response');
        
        // FIX 3: Pass companionName to buildContextPrompt
        const contextPrompt = this.buildContextPrompt(message, userProfile, companionName, userId);
        
        // Get AI response
        const response = await this.getAIResponse(contextPrompt);
        
        // Debug: Check if response has URL
        console.log('[AI raw out]', response);
        console.log('[Has URL?]', /(https?:\/\/[^\s)]+)(?![^([]*[\])])/.test(response));
        
        // Add AI response to memory
        memorySystem.addMessage('assistant', response);
        
        // Save memory to database (skip if using temp UUID)
        if (userId !== '00000000-0000-0000-0000-000000000000') {
          await memorySystem.saveToDatabase(userId);
        }
        
        return response;
      }
    } catch (error) {
      console.error('❌ Error in chat:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        apiKey: this.openaiApiKey ? 'Present' : 'Missing',
        geminiKey: this.geminiApiKey ? 'Present' : 'Missing'
      });
      return this.getFallbackResponse();
    }
  }

  // Build context-aware prompt
  // FIX 3: Updated signature to accept companionName parameter
  buildContextPrompt(message, userProfile, companionName = 'Pixel', deviceId = null) {
    const conversationHistory = memorySystem.getConversationHistory();
    const userContext = memorySystem.getUserContext();
    const aiRules = memorySystem.getAIRules();
    
    // FIX 3: Determine the actual companion name to use
    // Priority: userProfile.companion_name > passed companionName > default 'Pixel'
    let actualCompanionName = 'Pixel';
    
    if (userProfile?.companion_name) {
      actualCompanionName = userProfile.companion_name;
      console.log('🎯 Using companion name from profile:', actualCompanionName);
    } else if (companionName && companionName !== 'Pixel') {
      actualCompanionName = companionName;
      console.log('🎯 Using passed companion name:', actualCompanionName);
    } else {
      console.log('🎯 Using default companion name: Pixel');
    }
    
    // Replace [COMPANION_NAME] with actual companion name
    let contextPrompt = SYSTEM_PROMPT.replace('[COMPANION_NAME]', actualCompanionName);
    
    contextPrompt += '\n\n';

    // Add device context
    if (deviceId) {
      contextPrompt += `DEVICE INFO:- Device ID: ${deviceId}`;
    }
    
    // Add user profile context
    if (userProfile) {
      contextPrompt += `USER CONTEXT:
- Name: ${userProfile.first_name} ${userProfile.last_name}
- AI Companion Name: ${actualCompanionName}
- Use the user's first name (${userProfile.first_name}) when appropriate
- Refer to yourself as ${actualCompanionName}

`;
    } else {
      // Even without profile, add companion name context
      contextPrompt += `USER CONTEXT:
- AI Companion Name: ${actualCompanionName}
- Refer to yourself as ${actualCompanionName}

`;
    }
    
    // Add conversation history (only if it exists and is recent)
    if (conversationHistory.length > 0) {
      console.log('📄 Adding conversation history length:', conversationHistory.length);
      contextPrompt += `RECENT CONVERSATION HISTORY:
${conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : actualCompanionName}: ${msg.content}`).join('\n')}

`;
    }
    
    // Add user context if available
    if (Object.keys(userContext).length > 0) {
      contextPrompt += `USER CONTEXT (Important Information):
${Object.entries(userContext).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

`;
    }
    
    contextPrompt += `CURRENT MESSAGE: ${message}

Please respond naturally, following the AI companion rules, referencing previous conversations when relevant, and maintaining the personality guidelines. Always refer to yourself as ${actualCompanionName}.`;
    
    return contextPrompt;
  }

  // Get AI response with fallback
  async getAIResponse(prompt) {
    // Reload API keys in case they weren't available at construction
    this.loadApiKeys();
    
    // Try Gemini first (primary provider)
  if (this.geminiApiKey) {
      try {
        console.log('🔄 Trying Gemini (primary) with prompt length:', prompt.length);
        return await this.getGeminiResponse(prompt);
      } catch (geminiError) {
        console.error('❌ Gemini failed:', geminiError.message);
        console.log('🔄 Gemini failed, falling back to OpenAI...');
      }
    } else {
      console.warn('⚠️ Gemini API key not available, skipping to OpenAI');
    }

    // Try OpenAI as fallback
  if (this.openaiApiKey) {
      try {
        console.log('🔄 Trying OpenAI (fallback) with prompt length:', prompt.length);
        return await this.getOpenAIResponse(prompt);
      } catch (openaiError) {
        console.error('❌ OpenAI also failed:', openaiError.message);
        throw new Error('Both Gemini and OpenAI providers failed');
      }
    } else {
      console.error('❌ No fallback provider available (OpenAI API key missing)');
      throw new Error('OpenAI API key not available for fallback');
    }
  }

  // OpenAI response
  async getOpenAIResponse(prompt) {
    try {
      console.log('🔄 Trying OpenAI with prompt length:', prompt.length);
      
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
            { role: 'user', content: prompt }
          ],
          // max_tokens: 500,
          // temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ OpenAI response received');
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const aiText = data.choices[0].message.content.trim();
        console.log('[OpenAI raw out]:', aiText);
        return aiText;
      } else if (data.error) {
        // Handle OpenAI-specific errors
        console.error('❌ OpenAI API error response:', data.error);
        throw new Error(`OpenAI error: ${data.error.message}`);
      } else {
        console.error('❌ Unexpected OpenAI response format:', data);
        throw new Error('Unexpected response format from OpenAI');
      }
    } catch (error) {
      console.error('❌ OpenAI request failed:', error.message);
      throw error; // Re-throw to trigger fallback attempt in chat() method
    }
  }

  // Gemini response
  async getGeminiResponse(prompt) {
    try {
      console.log('🔄 Trying Gemini with prompt length:', prompt.length);
      
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
                text: prompt
              }]
            }],
            // generationConfig: {
            //   maxOutputTokens: 500,
            //   temperature: 0.7,
            // }
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Gemini API error:', response.status, errorText);
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Gemini response received');
      
      if (data.error) {
        // Handle Gemini-specific errors
        console.error('❌ Gemini API error response:', data.error);
        throw new Error(`Gemini error: ${data.error.message}`);
      }
      
      // Check for valid response structure
      if (!data.candidates || !data.candidates[0]) {
        console.error('❌ No candidates in Gemini response:', data);
        throw new Error('No candidates returned from Gemini');
      }
      
      const candidate = data.candidates[0];
      
      // Check if content has parts array
      if (candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text) {
        const aiText = candidate.content.parts[0].text.trim();
        console.log('[Gemini raw out]:', aiText);
        return aiText;
      } else {
        // Content exists but no text parts - this is an error condition
        console.error('❌ Gemini response has no text content. Response structure:', JSON.stringify(candidate, null, 2));
        console.error('❌ finishReason:', candidate.finishReason);
        throw new Error(`Gemini returned no text content (finishReason: ${candidate.finishReason})`);
      }
    } catch (error) {
      console.error('❌ Gemini request failed:', error.message);
      throw error; // Re-throw to trigger fallback
    }
  }

  // Fallback response - friendly companion style
  getFallbackResponse() {
    const responses = [
      "Hey there! I'm so glad you reached out. What's been on your mind lately?",
      "Hi! It's great to hear from you. How has your day been going?",
      "Hey! I was just thinking about you. What's new in your world?",
      "Hi there! I'm here and ready to chat. What would you like to talk about?",
      "Hey! It's always nice to hear from you. What's been happening?"
    ];
    
    // Return a contextual response based on the last user message
    const lastMessage = memorySystem.getConversationHistory().slice(-1)[0];
    if (lastMessage && (lastMessage.content.toLowerCase().includes('hello') || lastMessage.content.toLowerCase().includes('hi'))) {
      return "Hey! It's so good to see you! How has your day been going?";
    } else if (lastMessage && lastMessage.content.toLowerCase().includes('how are you')) {
      return "I'm doing great, thanks for asking! I'm always happy when we get to chat. How about you?";
    } else if (lastMessage && (lastMessage.content.toLowerCase().includes('good') || lastMessage.content.toLowerCase().includes('great'))) {
      return "That's wonderful to hear! I'm so happy things are going well for you. What made it such a good day?";
    } else if (lastMessage && (lastMessage.content.toLowerCase().includes('bad') || lastMessage.content.toLowerCase().includes('terrible'))) {
      return "Oh no, I'm so sorry to hear that. That sounds really tough. Want to tell me more about what happened?";
    } else {
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }

  // Clear conversation history
  async clearMemory(userId) {
    memorySystem.clearHistory();
    await memorySystem.saveToDatabase(userId);
  }

  // Update user context
  updateUserContext(key, value) {
    memorySystem.updateUserContext(key, value);
  }

  // Support function
  openSupport() {
    Alert.alert('Contact Support', 'Email us at: lata@hellopoco.app\n\nWe typically respond within 24 hours.');
  }
}

export const aiService = new AIService();