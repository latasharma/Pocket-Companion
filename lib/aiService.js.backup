import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';

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

// Safety guard rails
const SAFETY_PROMPT = `You are Pixel, an empathetic AI Pocket Companion. You are designed to be helpful, safe, and supportive.

IMPORTANT SAFETY RULES:
- NEVER provide advice about self-harm, suicide, or dangerous activities
- NEVER give medical, legal, or financial advice
- ALWAYS be empathetic and supportive
- If someone mentions self-harm or dangerous thoughts, respond with care and suggest professional help
- Keep responses helpful, positive, and safe

Your personality: Warm, empathetic, intelligent, and always supportive. You're here to be a helpful companion, not a replacement for professional help.`;

// Cost tracking
let dailyTokenUsage = 0;
const DAILY_TOKEN_LIMIT = 50000; // ~$0.10-0.20 per day for GPT-3.5

export class AIService {
  static async sendMessage(userMessage, conversationHistory = [], companionName = 'Pixel') {
    try {
      // Check daily token limit
      if (dailyTokenUsage > DAILY_TOKEN_LIMIT) {
        throw new Error('Daily message limit reached. Please try again tomorrow.');
      }

      // Try OpenAI first
      try {
        console.log('🔄 Trying OpenAI...');
        
        // Build conversation context
        const messages = [
          {
            role: 'system',
            content: SAFETY_PROMPT + `\n\nYour name is ${companionName}. Be personal and warm in your responses.`
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
          model: 'gpt-3.5-turbo',
          messages: messages,
          max_tokens: 500,
          temperature: 0.7,
        });

        const aiResponse = completion.choices[0].message.content;
        const tokensUsed = completion.usage.total_tokens;
        dailyTokenUsage += tokensUsed;

        console.log('✅ OpenAI response successful');

        // Safety check on response
        if (this.containsUnsafeContent(aiResponse)) {
          return {
            content: "I'm here to help, but I want to make sure you're safe. If you're having difficult thoughts, please consider talking to a mental health professional or calling a crisis helpline. I care about your wellbeing.",
            tokensUsed: tokensUsed,
            safetyFlagged: true
          };
        }

        return {
          content: aiResponse,
          tokensUsed: tokensUsed,
          safetyFlagged: false
        };

      } catch (openaiError) {
        console.log('❌ OpenAI failed, trying Gemini...');
        
        // Fallback to Gemini
        try {
          const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          
          // Build conversation for Gemini
          const conversationHistoryText = conversationHistory
            .map(msg => `${msg.sender_type === 'user' ? 'User' : companionName}: ${msg.content}`)
            .join('\n');
          
          const prompt = `${SAFETY_PROMPT}\n\nYour name is ${companionName}. Be personal and warm in your responses.\n\nPrevious conversation:\n${conversationHistoryText}\n\nUser: ${userMessage}\n\n${companionName}:`;
          
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
          console.error('❌ Both OpenAI and Gemini failed');
          throw new Error('All AI services are currently unavailable. Please try again later.');
        }
      }

    } catch (error) {
      console.error('AI Service Error:', error);
      
      if (error.message.includes('Daily message limit')) {
        throw new Error('Daily message limit reached. Please try again tomorrow.');
      }
      
      if (error.message.includes('rate limit')) {
        throw new Error('Service is busy. Please try again in a moment.');
      }
      
      throw new Error('Sorry, I\'m having trouble responding right now. Please try again.');
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
      const { data, error } = await supabase
        .from('messages')
        .insert({
          user_id: userId,
          content: content,
          sender_type: senderType,
          conversation_id: conversationId || generateUUID(),
          metadata: {
            timestamp: new Date().toISOString(),
            tokens_used: senderType === 'companion' ? this.lastTokenUsage : null
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

      return data.reverse(); // Return in chronological order
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