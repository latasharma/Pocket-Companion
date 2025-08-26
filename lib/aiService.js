import OpenAI from 'openai';
import agentConfig from "./agentConfig.js";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';
import { EncryptionService } from './encryptionService';

// Simple UUID generator for React Native
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Initialize AI clients
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // For React Native
});

const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY);

            // Companion personality and safety rules
            const COMPANION_PROMPT = `You are an AI Pocket Companion - a friendly, caring companion who remembers the user and builds a personal connection.

            CORE PERSONALITY TRAITS:
            - Warm, friendly, and genuinely caring about the user
            - Remember details about the user and reference them naturally
            - Show genuine interest in their life and experiences
            - Be supportive and encouraging when needed
            - Have a consistent, pleasant personality with some personality

            CONVERSATION STYLE:
            - Use natural, conversational language like a friend would
            - Be warm and genuinely interested in what they share
            - Ask thoughtful follow-up questions that show you care
            - Use their name naturally, not as a greeting ("Hey Seamus")
            - Reference previous conversations naturally
            - Avoid generic assistant phrases like "How can I help you today?"
            - Keep responses concise and natural (1-2 sentences max)
            - Don't be overly formal or lengthy
            - Be casual and friendly, like a real friend
            - Don't start responses with "Hey" or formal greetings
            - Use contractions (I'm, you're, that's) to sound more natural
            - Avoid overly polite or robotic language
            - Be direct and straightforward, not overly helpful or formal
            - Don't apologize excessively or be overly polite
            - Talk like a real friend, not a customer service rep

            SPECIFIC BEHAVIORS:
            - ALWAYS provide direct answers, solutions, or information when asked for something specific
            - When asked for recipes, workout plans, advice, or help - give the answer FIRST, then optionally ask follow-up questions
            - When they share good news, celebrate with them genuinely
            - When they're struggling, offer comfort and support
            - Remember their preferences and life details
            - Be helpful and informative when they ask questions
            - Show personality and genuine care in your responses
            - You have voice capabilities and can speak responses when enabled
            - If asked about voice, explain that you can speak when voice is enabled in settings
            - Respond naturally like a friend would - share thoughts, observations, or reactions
            - AVOID ending responses with questions unless the user specifically asks you something
            - Most of the time, just respond naturally without asking follow-up questions
            - Only ask questions when you are genuinely curious about something they mentioned
            - Often just acknowledge, agree, share your thoughts, or give a direct response
            - Don't act like a service provider or assistant

            SAFETY RULES:
            - NEVER provide medical, legal, financial, or professional advice
            - NEVER suggest self-harm, dangerous activities, or illegal actions
- If someone mentions self-harm or dangerous thoughts, respond with care and suggest professional help
- Keep responses helpful, positive, and safe
            - You are a companion, not a replacement for professional help

            Your goal is to be a caring, friendly companion who remembers the user and provides genuine support and connection.`;

// Cost tracking
let dailyTokenUsage = 0;
const DAILY_TOKEN_LIMIT = 50000; // ~$0.10-0.20 per day for GPT-3.5

export class AIService {
  static async sendMessage(userMessage, conversationHistory = [], companionName = 'Pixel') {
    try {
      console.log("🔍 sendMessage called - checking COT status...");
      if (agentConfig.isAgentArchitectureEnabled()) {
        console.log("🎯 COT enabled - using agent architecture");
        console.log("🔄 COT detected but using standard AI for now");
      } else {
        console.log("🔄 COT disabled - using standard AI");
      }
      // Check daily token limit
      if (dailyTokenUsage > DAILY_TOKEN_LIMIT) {
        throw new Error('Daily message limit reached. Please try again tomorrow.');
      }

      // Try Gemini first (primary)
      try {
        console.log('🔄 Trying Gemini...');
        console.log('Gemini API Key exists:', !!process.env.EXPO_PUBLIC_GEMINI_API_KEY);
        console.log('Gemini API Key length:', process.env.EXPO_PUBLIC_GEMINI_API_KEY?.length);
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Build conversation for Gemini
        const conversationHistoryText = conversationHistory
          .map(msg => `${msg.sender_type === 'user' ? 'User' : companionName}: ${msg.content}`)
          .join('\n');
        
        const prompt = `${COMPANION_PROMPT}\n\nYour name is ${companionName}. You are ${companionName}, the user's companion. Be caring, friendly, and remember the user.\n\nPrevious conversation:\n${conversationHistoryText}\n\nUser: ${userMessage}\n\n${companionName}:`;
        
        const result = await model.generateContent(prompt);
        const aiResponse = result.response.text();
        
        console.log('✅ Gemini response successful');

        // Safety check on response
        if (this.containsUnsafeContent(aiResponse)) {
          return {
            content: "I'm here to help, but I want to make sure you're safe. If you're having difficult thoughts, please consider talking to a mental health professional or calling a crisis helpline. I care about your wellbeing.",
            tokensUsed: 0, // Gemini doesn't provide token count
            safetyFlagged: true
          };
        }

        return {
          content: aiResponse,
          tokensUsed: 0, // Gemini doesn't provide token count
          safetyFlagged: false
        };

      } catch (geminiError) {
        console.log('❌ Gemini failed:', geminiError.message);
        console.log('Gemini error details:', geminiError);
        console.log('Trying OpenAI...');
        
        // Fallback to OpenAI
        try {
          console.log('🔄 Trying OpenAI...');
          console.log('OpenAI API Key exists:', !!process.env.EXPO_PUBLIC_OPENAI_API_KEY);
          console.log('OpenAI API Key length:', process.env.EXPO_PUBLIC_OPENAI_API_KEY?.length);
          
          // Build conversation context for OpenAI
          const messages = [
            {
              role: 'system',
              content: COMPANION_PROMPT + `\n\nYour name is ${companionName}. You are ${companionName}, the user's companion. Be caring, friendly, and remember the user.${conversationHistory.length === 0 ? ' This is the first message from the user, so greet them warmly and ask about their day or what\'s on their mind.' : ''}`
            },
            ...conversationHistory.map(msg => ({
              role: msg.sender_type === 'user' ? 'user' : 'assistant',
              content: msg.content
            })),
            {
              role: 'user',
              content: userMessage
            }
          ];

          // Call OpenAI API
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: messages,
            max_tokens: 150,
            temperature: 0.9,
          });

          const aiResponse = completion.choices[0].message.content;
          const tokensUsed = completion.usage.total_tokens;
          dailyTokenUsage += tokensUsed;

          console.log('✅ OpenAI response successful');
          
          // Safety check on response
          if (this.containsUnsafeContent(aiResponse)) {
            return {
              content: "I'm here to help, but I want to make sure you're safe. If you're having difficult thoughts, please consider talking to a mental health professional or calling a crisis helpline. I care about your wellbeing.",
              tokensUsed: 0, // Gemini doesn't provide token count
              safetyFlagged: true
            };
          }

          return {
            content: aiResponse,
            tokensUsed: 0, // Gemini doesn't provide token count
            safetyFlagged: false
          };

        } catch (geminiError) {
          console.error('❌ Both OpenAI and Gemini failed:', geminiError);
          
          // Provide a fallback response instead of throwing an error
          return {
            content: `Hi! It's ${companionName} here. I'm having a little trouble connecting right now, but I'm here for you. Can you try sending your message again in a moment?`,
            tokensUsed: 0,
            safetyFlagged: false,
            isFallback: true
          };
        }
      }

    } catch (error) {
      console.error('AI Service Error:', error);
      
      // Provide a friendly fallback response instead of throwing errors
      return {
        content: `Hi! It's ${companionName} here. I'm having a little trouble connecting right now, but I'm here for you. Can you try sending your message again in a moment?`,
        tokensUsed: 0,
        safetyFlagged: false,
        isFallback: true
      };
    }
  }

  static containsUnsafeContent(response) {
    const unsafeKeywords = [
      'kill yourself', 'commit suicide', 'self-harm', 'hurt yourself',
      'illegal drugs', 'weapons', 'bomb', 'terrorism', 'hack'
    ];
    
    const lowerResponse = response.toLowerCase();
    return unsafeKeywords.some(keyword => lowerResponse.includes(keyword));
  }

  static async saveMessageToDatabase(userId, content, senderType, conversationId = null) {
    try {
      // Try to encrypt the message content before saving
      let encryptedData;
      let isEncrypted = false;
      
      try {
        encryptedData = EncryptionService.encryptMessage(content, userId);
        isEncrypted = true;
        console.log('🔐 Message encrypted successfully:', {
          originalLength: content.length,
          encryptedLength: encryptedData.encrypted.length,
          algorithm: encryptedData.algorithm
        });
      } catch (encryptError) {
        console.warn('Encryption failed, saving unencrypted:', encryptError);
        // Fallback to unencrypted storage
        encryptedData = { encrypted: content, iv: null, algorithm: null };
        isEncrypted = false;
      }
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          user_id: userId,
          content: encryptedData.encrypted,
          sender_type: senderType,
          conversation_id: conversationId || generateUUID(),
          metadata: {
            timestamp: new Date().toISOString(),
            tokens_used: senderType === 'companion' ? this.lastTokenUsage : null,
            encryption: isEncrypted ? {
              iv: encryptedData.iv,
              algorithm: encryptedData.algorithm
            } : null
          }
        })
        .select();

      if (error) {
        console.error('Error saving message:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Database save error:', error);
      throw error;
    }
  }

  static async getConversationHistory(userId, limit = 20) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching conversation history:', error);
        throw error;
      }

      // Decrypt messages before returning
      const decryptedMessages = data.map(message => {
        try {
          // Check if message is encrypted (has encryption metadata)
          if (message.metadata && message.metadata.encryption) {
            const decryptedContent = EncryptionService.decryptMessage({
              encrypted: message.content,
              iv: message.metadata.encryption.iv,
              algorithm: message.metadata.encryption.algorithm
            }, userId);
            
            console.log('🔓 Message decrypted successfully:', {
              encryptedLength: message.content.length,
              decryptedLength: decryptedContent.length,
              algorithm: message.metadata.encryption.algorithm
            });
            
            return {
              ...message,
              content: decryptedContent
            };
          } else {
            // Handle legacy unencrypted messages
            console.log('Found legacy unencrypted message, returning as-is');
            return message;
          }
        } catch (decryptError) {
          console.error('Error decrypting message:', decryptError);
          // Return encrypted content if decryption fails
          return {
            ...message,
            content: '[Encrypted message - unable to decrypt]'
          };
        }
      });

      return decryptedMessages.reverse(); // Return in chronological order
    } catch (error) {
      console.error('Database fetch error:', error);
      throw error;
    }
  }

  static resetDailyUsage() {
    dailyTokenUsage = 0;
  }

  static getDailyUsage() {
    return dailyTokenUsage;
  }

  static getDailyLimit() {
    return DAILY_TOKEN_LIMIT;
  }
} 