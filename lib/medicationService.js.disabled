import { supabase } from './supabase';
import { AIService } from './aiService';

class MedicationService {
  constructor() {
    this.aiService = new AIService();
  }

  // Get all medications for a user
  async getMedications(userId) {
    try {
      const { data, error } = await supabase
        .from('user_medications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching medications:', error);
      return [];
    }
  }

  // Check medication interactions using AI
  async checkMedicationInteractions(medications) {
    try {
      const medicationNames = medications.map(m => m.name).join(', ');
      const prompt = `Check for potential drug interactions between these medications: ${medicationNames}. 
      Provide a brief analysis of any potential interactions, side effects, or warnings. 
      If no interactions are found, simply state that no known interactions were detected.`;

      const response = await this.aiService.getAIResponse(prompt);
      return response;
    } catch (error) {
      console.error('Error checking medication interactions:', error);
      return 'Unable to check for interactions at this time.';
    }
  }

  // Generate personalized reminder message using AI
  async generateReminderMessage(userId, medication) {
    try {
      const userProfile = await this.getUserProfile(userId);
      const prompt = `Generate a friendly, personalized reminder message for ${userProfile.first_name || 'the user'} to take their medication: ${medication.name} (${medication.dosage}) at ${medication.time}. 
      Include the medication name, dosage, and any special instructions. Make it warm and encouraging but not patronizing.`;

      const response = await this.aiService.getAIResponse(prompt);
      return response;
    } catch (error) {
      console.error('Error generating reminder message:', error);
      return `Time to take your ${medication.name} (${medication.dosage})!`;
    }
  }

  // Get user profile
  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return { first_name: 'User' };
    }
  }

  // Get adherence report
  async getAdherenceReport(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('medication_logs')
        .select(`
          *,
          user_medications(name, dosage, frequency)
        `)
        .eq('user_id', userId)
        .gte('taken_at', startDate.toISOString())
        .order('taken_at', { ascending: false });

      if (error) throw error;

      // Calculate adherence statistics
      const totalScheduled = data.length;
      const taken = data.filter(log => log.status === 'taken').length;
      const missed = data.filter(log => log.status === 'missed').length;
      const adherenceRate = totalScheduled > 0 ? (taken / totalScheduled) * 100 : 0;

      return {
        totalScheduled,
        taken,
        missed,
        adherenceRate: Math.round(adherenceRate),
        logs: data
      };
    } catch (error) {
      console.error('Error getting adherence report:', error);
      return {
        totalScheduled: 0,
        taken: 0,
        missed: 0,
        adherenceRate: 0,
        logs: []
      };
    }
  }
}

export const medicationService = new MedicationService();
