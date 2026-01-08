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
    // Use ordering + limit to ensure PostgREST returns at most one row
    const { data, error } = await supabase
      .from('user_memory')
      .select('conversation_history, user_context')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    // Supabase returns an array when limit is used; pick the first element if present
    let row = null;
    if (Array.isArray(data)) {
      row = data.length > 0 ? data[0] : null;
    } else {
      row = data || null;
    }

    if (row) {
      this.conversationHistory = row.conversation_history || [];
      this.userContext = row.user_context || {};
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

// PerformGeminiVisionOCR for base64 images
export async function performGeminiVisionOCR(base64Image) {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ performGeminiVisionOCR: Gemini API key not set');
    return null;
  }

  const MEDICINE_OCR_BASE_PROMPT = `You are an expert OCR and medical text understanding system specialized in extracting structured data from medicine prescriptions, medication labels, and pharmacy documents.

Task: Extract all information from this medicine prescription/label and return it as structured JSON.

Requirements:
1. Extract ALL visible text and data from the document or image
2. Maintain original context and relationships between fields
3. Handle handwritten and printed prescriptions
4. Normalize medical terms where possible without guessing
5. Extract dates in ISO format (YYYY-MM-DD) when possible
6. Extract dosage, strength, and frequency accurately
7. Do NOT hallucinate missing information — return null if unclear
8. Return clean, well-structured JSON output

IMPORTANT: Return ONLY a JSON object with these keys: "medicine_name", "dosage", "instructions", "raw_text". Use null for unknown values. Do not include any explanation—only JSON.`;

  try {
    // FIXED: Use correct endpoint
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-vision:generateContent?key=${apiKey}`;

    // Validate base64 size (Gemini has limits)
    const estimatedBytes = Math.ceil((base64Image.length * 3) / 4);
    if (estimatedBytes > 20000000) { // ~20MB limit
      console.error(`❌ performGeminiVisionOCR: base64 image too large (${estimatedBytes} bytes)`);
      return null;
    }

    // FIXED: Use correct request format
    const body = {
      contents: [
        {
          parts: [
            {
              text: MEDICINE_OCR_BASE_PROMPT
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image // base64 string
              }
            }
          ]
        }
      ]
    };

    console.log('📡 performGeminiVisionOCR: sending base64 image to Gemini Vision');
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('❌ performGeminiVisionOCR: request failed', res.status);
      console.error('❌ Error details:', text);
      return null;
    }

    const data = await res.json();
    console.log('✅ performGeminiVisionOCR: received response');

    let extracted = null;
    try {
      if (data.candidates && 
          data.candidates[0] && 
          data.candidates[0].content && 
          data.candidates[0].content.parts && 
          data.candidates[0].content.parts[0]) {
        extracted = data.candidates[0].content.parts[0].text;
      } else if (data.error) {
        console.error('❌ Gemini API error:', data.error);
        return null;
      }
    } catch (e) {
      console.error('❌ performGeminiVisionOCR: parse error', e);
      return null;
    }

    if (!extracted) {
      return null;
    }

    const trimmed = typeof extracted === 'string' ? extracted.trim() : extracted;
    
    if (typeof trimmed === 'string') {
      const jsonStart = trimmed.indexOf('{');
      const jsonEnd = trimmed.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonText = trimmed.slice(jsonStart, jsonEnd + 1);
        try {
          return JSON.parse(jsonText);
        } catch (e) {
          console.warn('⚠️ performGeminiVisionOCR: JSON parse failed, returning raw text');
          return trimmed;
        }
      }
    }

    return trimmed;
  } catch (error) {
    console.error('❌ performGeminiVisionOCR error:', error.message);
    return null;
  }
}

// Helper: perform OCR by sending an accessible image URL to Gemini Vision
export async function performGeminiVisionOCRFromUrl(imageUrl) {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('performGeminiVisionOCRFromUrl: Gemini API key not set');
    return null;
  }

  const MEDICINE_OCR_BASE_PROMPT = `You are an expert OCR and medical text understanding system specialized in extracting structured data from medicine prescriptions, medication labels, and pharmacy documents.

Task: Extract all information from this medicine prescription/label and return it as structured JSON.

Requirements:
1. Extract ALL visible text and data from the document or image
2. Maintain original context and relationships between fields
3. Handle handwritten and printed prescriptions
4. Normalize medical terms where possible without guessing
5. Extract dates in ISO format (YYYY-MM-DD) when possible
6. Extract dosage, strength, and frequency accurately
7. Do NOT hallucinate missing information — return null if unclear
8. Return clean, well-structured JSON output

IMPORTANT: Return ONLY a JSON object with these keys: "medicine_name", "dosage", "instructions", "raw_text". Use null for unknown values. Do not include any explanation—only JSON.`;

  try {
    // Use the correct Gemini 1.5 Flash Vision endpoint
    const endpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    console.log('performGeminiVisionOCRFromUrl: endpoint set to', endpoint);
    // If it's a URL, use a different approach with inline_data containing the URL
    let requestBody;
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // For URLs, we must download and convert to base64 because inlineData expects base64
      try {
        console.log('⬇️ Downloading image from URL for OCR...', imageUrl);
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        requestBody = {
          contents: [{
            parts: [
              { text: MEDICINE_OCR_BASE_PROMPT },
              { inlineData: { mimeType: "image/jpeg", data: base64Data } }
            ]
          }]
        };
      } catch (err) {
        console.error('❌ Error downloading/converting image URL:', err);
        return null;
      }
    } else {
      // For base64 images
      requestBody = {
        contents: [
          {
            parts: [
              {
                text: MEDICINE_OCR_BASE_PROMPT
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: imageUrl // base64 string
                }
              }
            ]
          }
        ]
      };
    }

    console.log('performGeminiVisionOCRFromUrl: sending request to Gemini Vision');
    console.log('📡 Endpoint:', endpoint);
    // console.log('📡 Image URL:', imageUrl.substring(0, 50) + '...');

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('❌ performGeminiVisionOCRFromUrl: request failed', res.status);
      console.error('❌ Error details:', text);
      return null;
    }

    const data = await res.json();
    console.log('✅ performGeminiVisionOCRFromUrl: received response from Gemini');

    // Extract text/JSON from Gemini response
    let extracted = null;
    try {
      if (data.candidates && 
          data.candidates[0] && 
          data.candidates[0].content && 
          data.candidates[0].content.parts && 
          data.candidates[0].content.parts[0]) {
        extracted = data.candidates[0].content.parts[0].text;
        console.log('📝 Extracted text from candidates');
      } else if (data.error) {
        console.error('❌ Gemini API error:', data.error);
        return null;
      } else {
        console.error('❌ Unexpected response structure:', JSON.stringify(data));
        return null;
      }
    } catch (e) {
      console.error('❌ performGeminiVisionOCRFromUrl: parse error', e);
      return null;
    }

    if (!extracted) {
      console.error('❌ No extracted text found');
      return null;
    }

    const trimmed = typeof extracted === 'string' ? extracted.trim() : extracted;
    
    // Try to parse JSON from response
    if (typeof trimmed === 'string') {
      const jsonStart = trimmed.indexOf('{');
      const jsonEnd = trimmed.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonText = trimmed.slice(jsonStart, jsonEnd + 1);
        try {
          const parsed = JSON.parse(jsonText);
          console.log('✅ Successfully parsed JSON from OCR response');
          return parsed;
        } catch (e) {
          console.warn('⚠️ performGeminiVisionOCRFromUrl: detected JSON but failed to parse, returning raw text');
          return trimmed;
        }
      }
    }

    return trimmed;
  } catch (error) {
    console.error('❌ performGeminiVisionOCRFromUrl error:', error.message);
    return null;
  }
}

// Best-effort parser that extracts a primary medicine name and dosage from
// noisy OCR text. It returns a structured object { name, dosage, confidence }
// where confidence is an integer percentage (0-100). The function implements
// the parsing rules from docs/reminder_feature.md (3A): prefer repeated or
// prominent name lines, normalize dosage text, and provide a confidence
// heuristic so callers can decide whether to pre-fill the Add Medication UI.
export function parseMedicationFromOCR(ocrText) {
  if (!ocrText) return { name: null, dosage: null, confidence: 0 };

  const text = typeof ocrText === 'string' ? ocrText : JSON.stringify(ocrText);
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Dosage detection (best-effort): numbers + units or pill counts + frequency
  const dosageRegex = /\b(?:\d+(?:\.\d+)?\s?(?:mg|g|mcg|ml)|\d+\s?(?:tablet|tablets|pills|tabs)|\d+\/\d+)(?:[^\n,\.]*)/i;
  const dosageMatch = text.match(dosageRegex);
  let dosage = dosageMatch ? dosageMatch[0].trim() : '';

  // Candidate name lines: prefer lines that contain letters, have no digits,
  // and do not look like instruction/label lines (expire, batch, use, take, mg etc.)
  const noisePattern = /(mg|g|mcg|ml|tablet|tablets|pill|pills|capsule|take|use|dose|expiry|exp|batch|lot|manufactured|manufacturer)/i;
  const candidateNames = lines.filter(l => l.length > 1 && !/\d/.test(l) && !noisePattern.test(l));

  let name = '';

  if (candidateNames.length > 0) {
    // Prefer a repeated or most common line (most prominent). Fall back to the
    // longest candidate (often brand + formulation).
    const freq = {};
    candidateNames.forEach(l => { freq[l] = (freq[l] || 0) + 1; });
    const sorted = Object.keys(freq).sort((a, b) => freq[b] - freq[a] || b.length - a.length);
    name = sorted[0];
  } else if (lines.length > 0) {
    // No clean candidate -> try the first non-noise line
    name = lines.find(l => !noisePattern.test(l)) || lines[0];
  }

  // Remove dosage text if accidentally included in the name
  if (dosage && name) {
    try { name = name.replace(new RegExp(dosage.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&'), 'i'), '').trim(); } catch (e) { /* ignore */ }
  }

  // Normalize dosage text: unify spacing and casing
  let normalizedDosage = dosage ? dosage.replace(/\s+/g, ' ') : '';
  normalizedDosage = normalizedDosage.replace(/MG/ig, 'mg').replace(/MCG/ig, 'mcg').replace(/\bG\b/ig, 'g');

  // Heuristic confidence scoring:
  // - name presence: 60%
  // - dosage presence: 30%
  // - repetition or multiple supporting lines: +10%
  let confidence = 0;
  if (name) confidence += 0.6;
  if (normalizedDosage) confidence += 0.3;

  // If multiple candidate names and one repeats, boost confidence
  if (candidateNames.length > 1) {
    const counts = candidateNames.reduce((acc, l) => { acc[l] = (acc[l] || 0) + 1; return acc; }, {});
    const maxCount = Math.max(...Object.values(counts));
    if (maxCount > 1) confidence += 0.1;
  }

  if (confidence > 1) confidence = 1;

  return {
    name: name || null,
    dosage: normalizedDosage || null,
    confidence: Math.round(confidence * 100),
  };
}

// New helper: robustly extract medication fields from various OCR response shapes
// Accepts either a raw string (model output) or an object (parsed JSON from Gemini)
// and returns a normalized object: { name, dosage, raw_text, confidence }
export function extractMedicationFieldsFromOCR(ocrResponse) {
  if (!ocrResponse) return { name: null, dosage: null, raw_text: null, confidence: 0 };

  // If the response is already a parsed object, attempt to find common keys
  if (typeof ocrResponse === 'object') {
    // Prefer direct structured keys when available
    const candidates = [];

    // If model returned an array of medicines
    if (Array.isArray(ocrResponse.medicines) && ocrResponse.medicines.length > 0) {
      const m = ocrResponse.medicines[0];
      const name = m.medicine_name || m.name || m.medicine || null;
      const dosage = m.dosage || m.strength || m.dose || null;
      const raw_text = ocrResponse.raw_text || ocrResponse.text || JSON.stringify(m);
      const parsed = parseMedicationFromOCR(raw_text || `${name || ''} ${dosage || ''}`);
      return {
        name: name || parsed.name,
        dosage: dosage || parsed.dosage,
        raw_text: raw_text || JSON.stringify(ocrResponse),
        confidence: parsed.confidence || 0,
      };
    }

    // Top-level structured fields
    const nameKeys = ['medicine_name', 'medicine', 'name', 'drug_name'];
    const dosageKeys = ['dosage', 'strength', 'dose', 'amount'];

    let name = null;
    let dosage = null;

    for (const k of nameKeys) {
      if (ocrResponse[k]) { name = ocrResponse[k]; break; }
    }
    for (const k of dosageKeys) {
      if (ocrResponse[k]) { dosage = ocrResponse[k]; break; }
    }

    const raw_text = ocrResponse.raw_text || ocrResponse.text || (typeof ocrResponse.output === 'string' ? ocrResponse.output : JSON.stringify(ocrResponse));

    // Use parser on raw_text to compute confidence and fill missing pieces
    const parsedFromText = parseMedicationFromOCR(raw_text);

    return {
      name: name || parsedFromText.name,
      dosage: dosage || parsedFromText.dosage,
      raw_text: raw_text || JSON.stringify(ocrResponse),
      confidence: parsedFromText.confidence || 0,
    };
  }

  // If it's a string, try to detect JSON inside and otherwise parse text
  if (typeof ocrResponse === 'string') {
    const trimmed = ocrResponse.trim();

    // Try to parse JSON substring if present
    const jsonStart = trimmed.indexOf('{');
    const jsonEnd = trimmed.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      const jsonText = trimmed.slice(jsonStart, jsonEnd + 1);
      try {
        const obj = JSON.parse(jsonText);
        return extractMedicationFieldsFromOCR(obj);
      } catch (e) {
        // ignore parse failure and fallback to text parsing
      }
    }

    // Fallback: use text parser
    const parsed = parseMedicationFromOCR(trimmed);
    return {
      name: parsed.name,
      dosage: parsed.dosage,
      raw_text: trimmed,
      confidence: parsed.confidence || 0,
    };
  }

  // Unknown shape - return minimal
  return { name: null, dosage: null, raw_text: String(ocrResponse), confidence: 0 };
}

export const aiService = new AIService();