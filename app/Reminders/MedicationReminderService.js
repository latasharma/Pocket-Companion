import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
// NOTE: Adjust the import path below to match your project's Supabase client location
import { supabase } from '@/lib/supabase';

/**
 * MedicationReminderService
 * 
 * Handles logic for Task 4.3 and 4.4.
 * - Task 4.4.6: Background Escalation Job.
 * - Updates medication status (Taken, Skipped).
 * - Handles Snoozing (Rescheduling).
 * - Ensures escalation is stopped by updating the database.
 */
export const MedicationReminderService = {
  
  /**
   * Task 4.4.2: T0 (At scheduled time) - Normal reminder
   * Schedules the initial local notification for the medication.
   */
  scheduleMedicationReminder: async (reminderId, scheduledTime, details) => {
    const triggerDate = new Date(scheduledTime);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Medication Reminder",
        body: `It's time to take ${details.medicationName || 'your medication'}.`,
        data: { reminderId, ...details },
      },
      trigger: triggerDate,
    });
  },

  /**
   * Marks a medication reminder as Taken.
   * This action stops further escalation.
   */
  markAsTaken: async (reminderId) => {
    if (!reminderId) return;

    const { error } = await supabase
      .from('dose_events')
      .update({ 
        status: 'taken', 
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', reminderId);

    if (error) throw error;

    await Notifications.dismissNotificationAsync(reminderId);
  },

  /**
   * Marks a medication reminder as Skipped.
   * This action stops further escalation.
   */
  markAsSkipped: async (reminderId) => {
    if (!reminderId) return;

    const { error } = await supabase
      .from('dose_events')
      .update({ 
        status: 'skipped', 
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', reminderId);

    if (error) throw error;

    await Notifications.dismissNotificationAsync(reminderId);
  },


  /**
   * Task 4.4.6: Escalation Job (Background Logic)
   * Checks for unconfirmed medications and handles escalation logic.
   * Runs every 1-5 minutes via background fetch.
   */
  checkAndEscalateReminders: async () => {
    // Keep local retries client-side; caregiver escalation is handled server-side via Edge Function.
    try {
      const { data: pendingDoses, error } = await supabase
        .from('dose_events')
        .select('id, scheduled_at, retry_1_sent_at, retry_2_sent_at')
        .eq('status', 'pending');

      if (error) throw error;

      const now = new Date();

      for (const dose of pendingDoses || []) {
        const scheduledTime = new Date(dose.scheduled_at);
        const diffInMinutes = (now.getTime() - scheduledTime.getTime()) / (1000 * 60);

        // T+10 min: Reminder retry
        if (diffInMinutes >= 10 && diffInMinutes < 30 && !dose.retry_1_sent_at) {
          await MedicationReminderService.sendLocalRetry(dose.id, "It's time to take your medication.");
          await supabase.from('dose_events').update({ retry_1_sent_at: new Date().toISOString() }).eq('id', dose.id);
        }
        // T+30 min: Final reminder
        else if (diffInMinutes >= 30 && diffInMinutes < 60 && !dose.retry_2_sent_at) {
          await MedicationReminderService.sendLocalRetry(dose.id, "Reminder: Please take your medication.");
          await supabase.from('dose_events').update({ retry_2_sent_at: new Date().toISOString() }).eq('id', dose.id);
        }
        // T+60+ caregiver escalation: handled by server Edge Function.
      }
    } catch (err) {
      console.error("Escalation job failed:", err);
    }
  },

  sendLocalRetry: async (reminderId, body) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Medication Reminder",
        body: body,
        data: { reminderId },
      },
      trigger: null, // Immediate
    });
  },

  /**
   * Task 4.4.5: Caregiver Notification
   */
  escalateToCaregiver: async () => {
    // Intentionally left empty: caregiver escalation now handled server-side via Edge Function (cron).
    return;
  },

  /**
   * Registers the background task to run the escalation job periodically.
   * Should be called during app initialization.
   */
  registerBackgroundFetchAsync: async () => {
    const TASK_NAME = 'MEDICATION_ESCALATION_TASK';
    return BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 60, // 1 minute
      stopOnTerminate: false, // Android
      startOnBoot: true, // Android
    });
  }
};

// Define the background task in global scope
TaskManager.defineTask('MEDICATION_ESCALATION_TASK', async () => {
  try {
    // Ensure dependencies are ready if needed
    console.log("Running escalation background job...");
    await MedicationReminderService.checkAndEscalateReminders();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("Background escalation task failed:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});