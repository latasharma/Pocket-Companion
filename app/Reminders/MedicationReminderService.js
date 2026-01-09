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

    // Update Supabase: Set status to 'Taken' and record timestamp
    const { error } = await supabase
      .from('medication_logs') // Assuming a logs table exists for instances
      .update({ 
        status: 'Taken', 
        confirmed_at: new Date().toISOString(),
        escalation_stopped: true 
      })
      .eq('id', reminderId);

    if (error) throw error;

    // Cancel any pending notifications for this specific reminder ID if necessary
    await Notifications.dismissNotificationAsync(reminderId);
  },

  /**
   * Marks a medication reminder as Skipped.
   * This action stops further escalation.
   */
  markAsSkipped: async (reminderId) => {
    if (!reminderId) return;

    const { error } = await supabase
      .from('medication_logs')
      .update({ 
        status: 'Skipped', 
        confirmed_at: new Date().toISOString(),
        escalation_stopped: true 
      })
      .eq('id', reminderId);

    if (error) throw error;

    await Notifications.dismissNotificationAsync(reminderId);
  },

  /**
   * Snoozes the reminder for a specific duration.
   * This updates the log to indicate interaction (stopping immediate escalation)
   * but schedules a new local notification.
   */
  snoozeReminder: async (reminderId, minutes, details) => {
    // Schedule a new local notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Snoozed Medication Reminder",
        body: `Time to take ${details.medicationName || 'your medication'}.`,
        data: { reminderId, ...details },
      },
      trigger: {
        seconds: minutes * 60,
      },
    });

    // Optionally update backend to reflect "Snoozed" state if tracking is required
    // For Task 4.3, user action stops *escalation*, so we might want to flag it
    // or simply reset the escalation timer in the backend logic.
    // Here we assume updating 'last_interaction' stops the immediate critical alert.
    const { error } = await supabase
      .from('medication_logs')
      .update({ 
        status: 'Snoozed',
        last_snoozed_at: new Date().toISOString(),
        escalation_stopped: true // Task 4.3: Any user action immediately stops further escalation.
      })
      .eq('id', reminderId);

    if (error) throw error;
  },

  /**
   * Task 4.4.6: Escalation Job (Background Logic)
   * Checks for unconfirmed medications and handles escalation logic.
   * Runs every 1-5 minutes via background fetch.
   */
  checkAndEscalateReminders: async () => {
    try {
      // 1. Fetch unconfirmed dose events
      // Select logs that are 'Pending', escalation not stopped, and caregiver not notified.
      const { data: pendingDoses, error } = await supabase
        .from('medication_logs')
        .select(`
          id,
          scheduled_time,
          retry_1_sent,
          retry_2_sent,
          medications (
            name,
            is_critical,
            caregiver_contact,
            caregiver_consent
          )
        `)
        .eq('status', 'Pending')
        .eq('escalation_stopped', false)
        .is('caregiver_notified_at', null);

      if (error) throw error;

      const now = new Date();

      for (const dose of pendingDoses) {
        const scheduledTime = new Date(dose.scheduled_time);
        const diffInMinutes = (now - scheduledTime) / (1000 * 60);

        // Task 4.4.2: Escalation Timing Rules
        
        // T+10 min: Reminder retry
        if (diffInMinutes >= 10 && diffInMinutes < 30 && !dose.retry_1_sent) {
          await MedicationReminderService.sendLocalRetry(dose.id, "It's time to take your medication.");
          await supabase.from('medication_logs').update({ retry_1_sent: true }).eq('id', dose.id);
        }
        // T+30 min: Final reminder
        else if (diffInMinutes >= 30 && diffInMinutes < 60 && !dose.retry_2_sent) {
          await MedicationReminderService.sendLocalRetry(dose.id, "Reminder: Please take your medication.");
          await supabase.from('medication_logs').update({ retry_2_sent: true }).eq('id', dose.id);
        }
        // T+60 min: Escalate to caregiver
        else if (diffInMinutes >= 60) {
          // Task 4.4.3: Conditions to Escalate
          // 1. Dose status is pending (Checked in query)
          // 2. Medication is marked as Critical
          // 3. Confirmation window has expired (>= 60 mins)
          // 4. Caregiver contact exists
          // 5. Caregiver consent is given
          // 6. Caregiver has not already been notified (Checked in query)

          const med = dose.medications;

          // Task 4.4.4: When NOT to Escalate
          // - Medication is not marked as Critical (Checked below)
          // - User confirms Taken / Skipped before escalation (Checked in query via status/escalation_stopped)
          // - Caregiver consent is missing (Checked below)
          // - Caregiver was already notified for this dose (Checked in query)
          if (med && med.is_critical && med.caregiver_contact && med.caregiver_consent) {
            await MedicationReminderService.escalateToCaregiver(dose.id, med.caregiver_contact);
          }
        }
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
  escalateToCaregiver: async (reminderId, contact) => {
    // Task 4.4.5: Privacy-First Message
    const message = "PoCo Alert: The user has not confirmed a scheduled medication reminder. Please check in with them.";
    
    // In a real app, invoke a backend function here to send SMS/Email.
    console.log(`[Escalation] Sending to ${contact}: "${message}"`);

    // Mark as notified to ensure idempotency
    const { error } = await supabase
      .from('medication_logs')
      .update({ 
        caregiver_notified_at: new Date().toISOString()
      })
      .eq('id', reminderId);

    if (error) console.error("Failed to mark caregiver notified", error);
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