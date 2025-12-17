import { GoogleGenerativeAI } from '@google/generative-ai';
import agentConfig from './agentConfig.js';
import {
  circuitBreakers,
  healthMonitor,
  ModelCache,
  requestQueue,
  RetryManager
} from './apiStability.js';
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
    this.geminiClient = null; // GoogleGenerativeAI client instance
    this.currentProvider = 'gemini';
    this.fallbackProvider = 'openai'; // Gemini is primary, OpenAI is fallback
    
    // Initialize supervisor agent if enabled
    this.supervisorAgent = null;
    
    // Load API keys (now async)
    this.loadApiKeys().catch(err => console.error('Error loading API keys:', err));
    
    // Initialize supervisor agent (will be called when first needed)
    this.initializeSupervisorAgent();
  }

  // Static method for compatibility with existing code
  static async sendMessage(userMessage, conversationHistory = [], companionName = null, userId = null) {
    console.log('🔄 sendMessage called - using enhanced AI service');
    console.log('🔄 User message:', userMessage);
    console.log('🔄 Conversation history length:', conversationHistory.length);
    
    // If userId not provided, try to get it from Supabase
    if (!userId) {
      try {
        const { supabase } = await import('./supabase.js');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
          console.log('✅ Got userId from Supabase:', userId);
        }
      } catch (error) {
        console.log('⚠️ Could not get userId:', error.message);
      }
    }
    
    // Create a temporary instance for this request
    const aiService = new AIService();
    
    // Convert conversation history to our format
    const messages = conversationHistory.map(msg => ({
      role: msg.sender_type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    // CRITICAL FIX: Load conversation history into memorySystem before generating response
    // This ensures the AI has context from previous conversations
    const finalUserId = userId || '00000000-0000-0000-0000-000000000000';
    
    // Load existing memory from database first (if userId is valid)
    if (finalUserId !== '00000000-0000-0000-0000-000000000000') {
      try {
        await memorySystem.loadFromDatabase(finalUserId);
        console.log('✅ Loaded conversation history from database:', memorySystem.getConversationHistory().length, 'messages');
      } catch (error) {
        console.log('⚠️ Could not load from database, using passed history:', error.message);
      }
    }
    
    // Merge passed conversation history with loaded history
    // Add messages from conversationHistory that aren't already in memorySystem
    const existingHistory = memorySystem.getConversationHistory();
    const existingContentSet = new Set(existingHistory.map(msg => msg.content));
    
    for (const msg of messages) {
      // Only add if not already in memory system (avoid duplicates)
      if (!existingContentSet.has(msg.content)) {
        memorySystem.addMessage(msg.role, msg.content);
      }
    }
    
    console.log('✅ Memory system populated with', memorySystem.getConversationHistory().length, 'total messages');
    
    // Use the enhanced chat method with real userId (or temp UUID if unavailable)
    const response = await aiService.chat(userMessage, finalUserId);
    
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
  async loadApiKeys() {
    this.openaiApiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    this.geminiApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    
    // Try to load cached working model
    const cachedGeminiModel = await ModelCache.getWorkingModel('gemini');
    this.availableGeminiModel = cachedGeminiModel?.model || null;
    this.availableGeminiVersion = cachedGeminiModel?.version || null;
    
    // Initialize Google Generative AI client if API key is available
    if (this.geminiApiKey) {
      try {
        this.geminiClient = new GoogleGenerativeAI(this.geminiApiKey);
        console.log('✅ Google Generative AI client initialized');
        if (this.availableGeminiModel) {
          console.log(`✅ Using cached Gemini model: ${this.availableGeminiModel}${this.availableGeminiVersion ? ` (${this.availableGeminiVersion})` : ''}`);
        }
      } catch (error) {
        console.error('❌ Failed to initialize Gemini client:', error);
        this.geminiClient = null;
      }
    }
    
    console.log('🔑 API Keys Status:', {
      openai: this.openaiApiKey ? 'Present' : 'Missing',
      gemini: this.geminiApiKey ? 'Present' : 'Missing',
      geminiClient: this.geminiClient ? 'Initialized' : 'Not initialized',
      cachedModel: this.availableGeminiModel || 'None'
    });
  }

  // Check which Gemini models are available by trying them
  async checkAvailableModels() {
    if (!this.geminiClient) return;
    
    // Try models in order of preference - will be tested on first use
    // We'll discover the working model during the first API call
    this.availableGeminiModel = null; // Will be set when we find a working model
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
        console.log('🔄 Supervisor agent file not found - falling back to standard AI service');
        console.log('🔄 This is expected in current build - agent architecture will be available in future');
        this.supervisorAgent = null;
      }
    } else {
      console.log('🔄 Agent architecture disabled - skipping supervisor agent initialization');
    }
  }

  // Initialize memory for a user
  async initializeMemory(userId) {
    await memorySystem.loadFromDatabase(userId);
  }

  // Get user profile for context
  async getUserProfile(userId) {
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

  // Enhanced chat function with memory and agent architecture
  async chat(message, userId) {
    try {
      // Initialize supervisor agent if not already done
      if (!this.supervisorAgent && agentConfig.isAgentArchitectureEnabled()) {
        await this.initializeSupervisorAgent();
      }
      
      // Get user profile for context (skip if using temp UUID)
      const userProfile = userId === '00000000-0000-0000-0000-000000000000' ? null : await this.getUserProfile(userId);
      
      // Load memory from database if empty (safety check - should already be loaded in sendMessage)
      if (userId !== '00000000-0000-0000-0000-000000000000' && memorySystem.getConversationHistory().length === 0) {
        try {
          await memorySystem.loadFromDatabase(userId);
          console.log('✅ Loaded conversation history in chat() (backup):', memorySystem.getConversationHistory().length, 'messages');
        } catch (error) {
          console.log('⚠️ Could not load memory in chat():', error.message);
        }
      }
      
      // Add user message to memory
      memorySystem.addMessage('user', message);
      
      // Check if agent architecture is enabled
      if (this.supervisorAgent && agentConfig.isAgentArchitectureEnabled()) {
        console.log('🎯 Using agent architecture for response');
        
        // Build context for agents
        const context = {
          userProfile,
          conversationHistory: memorySystem.getConversationHistory(),
          userContext: memorySystem.getUserContext(),
          userId
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
        console.log('🔄 Using current AI service for response');
        
        // Build context-aware prompt
        const contextPrompt = this.buildContextPrompt(message, userProfile);
        
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
  buildContextPrompt(message, userProfile) {
    const conversationHistory = memorySystem.getConversationHistory();
    const userContext = memorySystem.getUserContext();
    const aiRules = memorySystem.getAIRules();
    
    // Replace [COMPANION_NAME] with actual companion name
    let contextPrompt = SYSTEM_PROMPT;
    if (userProfile && userProfile.companion_name) {
      contextPrompt = contextPrompt.replace('[COMPANION_NAME]', userProfile.companion_name);
    } else {
      contextPrompt = contextPrompt.replace('[COMPANION_NAME]', 'your AI companion');
    }
    
    contextPrompt += '\n\n';
    
    // Add user profile context
    if (userProfile) {
      contextPrompt += `USER CONTEXT:
- Name: ${userProfile.first_name} ${userProfile.last_name}
- AI Companion Name: ${userProfile.companion_name}
- Use the user's first name (${userProfile.first_name}) when appropriate
- Refer to yourself as ${userProfile.companion_name}

`;
    }
    
    // Add conversation history
    if (conversationHistory.length > 0) {
      contextPrompt += `RECENT CONVERSATION HISTORY:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

`;
    }
    
    // Add user context
    if (Object.keys(userContext).length > 0) {
      contextPrompt += `USER CONTEXT (Important Information):
${Object.entries(userContext).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

`;
    }
    
    contextPrompt += `CURRENT MESSAGE: ${message}

Please respond naturally, following the AI companion rules, referencing previous conversations when relevant, and maintaining the personality guidelines.`;
    
    return contextPrompt;
  }

  // Get AI response with enhanced fallback and stability features
  async getAIResponse(prompt) {
    try {
      // Use supervisor agent if enabled
      if (this.supervisorAgent) {
        console.log('🎯 Using agent architecture for response');
        
        // Get user profile for correct names
        const userProfile = await this.getUserProfile(memorySystem.userId);
        
        const context = {
          conversationHistory: memorySystem.getConversationHistory(),
          userContext: memorySystem.getUserContext(),
          userId: memorySystem.userId,
          userProfile: userProfile || {} // Include userProfile with names
        };
        return await this.supervisorAgent.processRequest(prompt, context);
      }

      // Queue request for better stability
      return await requestQueue.enqueue(async () => {
        return await this._getAIResponseWithFallback(prompt);
      }, 1); // Priority 1
    } catch (error) {
      // Silent error handling - never show errors to users
      // Check circuit breaker states
      const geminiState = circuitBreakers.gemini.getState();
      const openaiState = circuitBreakers.openai.getState();
      
      // If both circuits are open, use fallback response (silently)
      if (geminiState.state === 'open' && openaiState.state === 'open') {
        if (__DEV__) {
          console.log('⚠️ All APIs unavailable, using fallback response');
        }
        return this.getFallbackResponse();
      }
      
      // Try fallback provider silently
      try {
        if (this.currentProvider === 'gemini' && this.openaiApiKey) {
          return await this.getOpenAIResponse(prompt);
        } else if (this.currentProvider === 'openai' && this.geminiApiKey) {
          return await this.getGeminiResponse(prompt);
        }
      } catch (fallbackError) {
        // Final fallback - return friendly response
        return this.getFallbackResponse();
      }
      
      // Last resort - always return something friendly
      return this.getFallbackResponse();
    }
  }

  // Internal method with enhanced fallback logic
  async _getAIResponseWithFallback(prompt) {
    // Reload API keys if needed
    if (!this.openaiApiKey || !this.geminiApiKey) {
      await this.loadApiKeys();
    }
    
    // Try primary provider first
    if (this.currentProvider === 'gemini') {
        if (!this.geminiApiKey) {
          // Silent fallback to OpenAI
          this.currentProvider = 'openai';
          if (this.openaiApiKey) {
            return await this.getOpenAIResponse(prompt);
          }
          return this.getFallbackResponse();
        }
      
      try {
        return await this.getGeminiResponse(prompt);
      } catch (error) {
        // Silent fallback - try OpenAI if available
        if (circuitBreakers.gemini.getState().state !== 'open' && this.openaiApiKey) {
          try {
            return await this.getOpenAIResponse(prompt);
          } catch (fallbackError) {
            // Both failed - return fallback response
            return this.getFallbackResponse();
          }
        }
        // Gemini circuit open or no OpenAI key - return fallback
        return this.getFallbackResponse();
      }
    } else {
        if (!this.openaiApiKey) {
          // Silent fallback to Gemini
          this.currentProvider = 'gemini';
          if (this.geminiApiKey) {
            return await this.getGeminiResponse(prompt);
          }
          return this.getFallbackResponse();
        }
      
      try {
        return await this.getOpenAIResponse(prompt);
      } catch (error) {
        // Silent fallback - try Gemini if available
        if (circuitBreakers.openai.getState().state !== 'open' && this.geminiApiKey) {
          try {
            return await this.getGeminiResponse(prompt);
          } catch (fallbackError) {
            // Both failed - return fallback response
            return this.getFallbackResponse();
          }
        }
        // OpenAI circuit open or no Gemini key - return fallback
        return this.getFallbackResponse();
      }
    }
  }

  // Get API health metrics (for monitoring/debugging)
  getAPIHealth() {
    return healthMonitor.getAllHealth();
  }

  // OpenAI response with stability features
  async getOpenAIResponse(prompt) {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Trying OpenAI with prompt length:', prompt.length);
      
      // Use circuit breaker with minimal retry (faster)
      const result = await circuitBreakers.openai.execute(async () => {
        return await RetryManager.executeWithRetry(async () => {
          return await this._makeOpenAIRequest(prompt);
        }, {
          maxRetries: 1, // Only 1 retry for speed
          initialDelay: 300,
          retryableErrors: ['500', '502', '503', '504', '429', 'timeout', 'network']
        });
      });

      const responseTime = Date.now() - startTime;
      healthMonitor.recordRequest('openai', true, responseTime);
      
      console.log('✅ OpenAI response received');
      console.log('[AI raw out]:', result);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      healthMonitor.recordRequest('openai', false, responseTime);
      
      // Silent error handling - only log in development
      if (__DEV__) {
        console.log('⚠️ OpenAI request failed:', error.message);
      }
      throw error;
    }
  }

  // Internal method to make actual OpenAI API request
  async _makeOpenAIRequest(prompt) {
    // Try cached model first, then fallback
    const modelsToTry = [
      await ModelCache.getWorkingModel('openai')?.model || 'gpt-4o-mini',
      'gpt-4o-mini',
      'gpt-3.5-turbo'
    ].filter(Boolean);

    let lastError;

    for (const model of modelsToTry) {
      try {
        console.log(`🔄 Trying OpenAI model: ${model}`);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openaiApiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: prompt }
            ],
            max_tokens: 300,
            temperature: 0.7,
          }),
          signal: this._createTimeoutSignal(30000) // 30 second timeout
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const aiText = data.choices[0].message.content.trim();
        
        // Cache successful model
        if (model !== this.availableOpenAIModel) {
          await ModelCache.setWorkingModel('openai', model);
          console.log(`✅ Cached working OpenAI model: ${model}`);
        }
        
        return aiText;
      } catch (error) {
        lastError = error;
        
        // If model not found, try next model
        if (error.message.includes('404') || error.message.includes('model_not_found')) {
          console.log(`⚠️ Model ${model} not available, trying next...`);
          continue;
        }
        
        // For other errors, throw to trigger retry
        throw error;
      }
    }

    throw lastError || new Error('All OpenAI models failed');
  }

  // Gemini response - fast fail on 404s, no retries
  async getGeminiResponse(prompt) {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Trying Gemini with prompt length:', prompt.length);
      
      if (!this.geminiApiKey) {
        throw new Error('Gemini API key not available');
      }

      // Try to get response - 404s fail immediately, no retries
      const result = await this._makeGeminiRequest(prompt);

      const responseTime = Date.now() - startTime;
      healthMonitor.recordRequest('gemini', true, responseTime);
      
      console.log('✅ Gemini response received');
      console.log('[AI raw out]:', result);
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Don't count 404s as failures (they're expected when models don't exist)
      const is404Error = error.message.includes('All Gemini models failed') || 
                        error.message.includes('404') || 
                        error.message.includes('NOT_FOUND');
      
      if (!is404Error) {
        healthMonitor.recordRequest('gemini', false, responseTime);
      }
      
      // Log but don't show to users
      console.log('⚠️ Gemini unavailable, will use fallback');
      throw error;
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

  // Internal method to make actual Gemini API request
  async _makeGeminiRequest(prompt) {
    // Build models to try - prioritize cached model if available
    const modelsToTry = [];
    
    if (this.availableGeminiModel && this.availableGeminiVersion) {
      // Try cached model first
      modelsToTry.push({ 
        name: this.availableGeminiModel, 
        version: this.availableGeminiVersion 
      });
    }
    
    // Add other models as fallbacks - try v1beta first (more stable)
    modelsToTry.push(
      { name: 'gemini-pro', version: 'v1beta' }, // Most stable, available in v1beta
      { name: 'gemini-1.5-flash', version: 'v1beta' }, // Try v1beta for flash too
      { name: 'gemini-1.5-flash', version: 'v1' }, // Then try v1
      { name: 'gemini-1.5-pro', version: 'v1beta' }, // Try v1beta for pro
      { name: 'gemini-1.5-pro', version: 'v1' } // Last resort
    );

    // Try models sequentially but quickly (skip 404s immediately, no retries)
    for (const { name, version } of modelsToTry) {
      try {
        console.log(`🔄 Trying Gemini model: ${name} (${version})`);
        
        const apiUrl = `https://generativelanguage.googleapis.com/${version}/models/${name}:generateContent?key=${this.geminiApiKey}`;
        
        const response = await fetch(apiUrl, {
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
            generationConfig: {
              maxOutputTokens: 300,
              temperature: 0.7,
            }
          }),
          signal: this._createTimeoutSignal(10000) // 10 second timeout
        });

        if (!response.ok) {
          const status = response.status;
          
          // 404 means model doesn't exist - skip immediately (no retry)
          if (status === 404) {
            console.log(`⚠️ Model ${name} (${version}) not found - trying next`);
            continue; // Try next model immediately
          }
          
          // For other errors, throw (but don't retry 404s)
          const errorText = await response.text();
          throw new Error(`HTTP ${status}: ${errorText}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
          const aiText = data.candidates[0].content.parts[0].text;
          
          // Cache successful model for future use
          if (this.availableGeminiModel !== name || this.availableGeminiVersion !== version) {
            this.availableGeminiModel = name;
            this.availableGeminiVersion = version;
            await ModelCache.setWorkingModel('gemini', name, version);
            console.log(`✅ Using Gemini model: ${name} (${version})`);
          }
          
          return aiText;
        } else {
          throw new Error('Invalid response format from Gemini API');
        }
      } catch (error) {
        // Skip 404s immediately, throw others (but circuit breaker won't retry 404s)
        if (error.message.includes('404') || error.message.includes('NOT_FOUND') || 
            error.message.includes('Model') && error.message.includes('not available')) {
          console.log(`⚠️ Model ${name} (${version}) not found - trying next`);
          continue; // Skip to next model
        }
        // For real errors (network, timeout, etc), throw to circuit breaker
        throw error;
      }
    }

    // All models failed (all 404s)
    throw new Error('All Gemini models failed - all returned 404');
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
    if (lastMessage && lastMessage.content.toLowerCase().includes('hello') || lastMessage.content.toLowerCase().includes('hi')) {
      return "Hey! It's so good to see you! How has your day been going?";
    } else if (lastMessage && lastMessage.content.toLowerCase().includes('how are you')) {
      return "I'm doing great, thanks for asking! I'm always happy when we get to chat. How about you?";
    } else if (lastMessage && lastMessage.content.toLowerCase().includes('good') || lastMessage.content.toLowerCase().includes('great')) {
      return "That's wonderful to hear! I'm so happy things are going well for you. What made it such a good day?";
    } else if (lastMessage && lastMessage.content.toLowerCase().includes('bad') || lastMessage.content.toLowerCase().includes('terrible')) {
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