/**
 * File: [`lib/medicationService.js`](lib/medicationService.js:1)
 *
 * Purpose:
 * - Provide clean wrappers around Supabase for medications and medication_intake_logs.
 * - Use the RPC `insert_medication` (created in create-medications-table-with-function.sql) for safe inserts
 *   so user_id is set server-side (auth.uid()) and RLS is respected.
 * - Expose: createMedication, updateMedication, fetchMedication, fetchMedications, softDeleteMedication,
 *   createIntakeLog.
 * - After create/update we attempt to schedule the reminder via lib/reminderScheduler.js (best-effort).
 */

import ReminderScheduler from './reminderScheduler';
import * as SupabaseLib from './supabase';
const supabase = SupabaseLib.supabase || SupabaseLib.default || SupabaseLib;

/**
 * createMedication(payload)
 * - payload: object matching fields described in the SQL RPC insert_medication parameters.
 *   Use keys matching RPC parameter names (without the `p_` prefix) OR call the RPC with correct arg names.
 *
 * Example payload minimal:
 * {
 *   entry_method: 'manual',
 *   medication_name: 'Aspirin',
 *   medication_type: 'Tablet',
 *   dosage_value: 500,
 *   dosage_unit: 'mg',
 *   frequency_type: 'daily',
 *   times_per_day: 1,
 *   dose_times: ['08:00:00'],
 *   start_date: '2025-12-17',
 *   timezone: 'Asia/Kolkata',
 *   notification_type: ['push'],
 * }
 */
export async function createMedication(payload = {}) {
  // Normalize keys for RPC: our RPC expects p_ prefixed names, but supabase.rpc accepts named params
  // We'll pass the parameter names without prefix; the RPC function uses the same names as in the migration.
  try {
    // Normalize and strongly-typed params to improve PostgREST/RPC signature matching.
    // Postgres function expects time[] for dose_times and integer/numeric types for numeric fields.
    const normalizedDoseTimes = Array.isArray(payload.dose_times)
      ? payload.dose_times
          .map((t) => {
            if (!t) return null;
            const m = String(t).trim();
            // Accept "HH:MM" -> convert to "HH:MM:00"
            if (/^\d{1,2}:\d{2}$/.test(m)) {
              const parts = m.split(':');
              const hh = parts[0].padStart(2, '0');
              return `${hh}:${parts[1]}:00`;
            }
            // Accept "HH:MM:SS" (normalize hour padding)
            if (/^\d{1,2}:\d{2}:\d{2}$/.test(m)) {
              const parts = m.split(':');
              const hh = parts[0].padStart(2, '0');
              return `${hh}:${parts[1]}:${parts[2]}`;
            }
            // If format unexpected, drop the value
            return null;
          })
          .filter(Boolean)
      : null;

    const asNumberOrNull = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
    const asBool = (v) => !!v;

    // Stronger type coercion & normalized RPC params. Use null for absent numerics so Postgres
    // can accept the value types and we avoid accidental empty-string inserts.
    const rpcParams = {
      p_entry_method: String(payload.entry_method || 'manual'),
      p_medication_name: String(payload.medication_name || ''),
      p_medication_type: String(payload.medication_type || ''),
      p_dosage_value: asNumberOrNull(payload.dosage_value) ?? 0,
      // Pass dosage_unit to match the RPC signature in the DB migration (dosage_unit is NOT NULL there).
      p_dosage_unit: payload.dosage_unit ? String(payload.dosage_unit) : '',
      p_instructions: payload.instructions ? String(payload.instructions) : null,
      p_frequency_type: String(payload.frequency_type || 'once'),
      p_times_per_day: asNumberOrNull(payload.times_per_day) || 1,
      p_dose_times: Array.isArray(normalizedDoseTimes) && normalizedDoseTimes.length ? normalizedDoseTimes : null,
      p_repeat_days: Array.isArray(payload.repeat_days) && payload.repeat_days.length ? payload.repeat_days.map(String) : null,
      p_start_date: payload.start_date || new Date().toISOString().slice(0, 10),
      p_end_date: payload.end_date || null,
      p_timezone: payload.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      p_notification_type: Array.isArray(payload.notification_type)
        ? payload.notification_type.map(String)
        : payload.notification_type
        ? [String(payload.notification_type)]
        : Array.isArray(payload.notification_types)
        ? payload.notification_types.map(String)
        : ['push'],
      p_pre_reminder_time: asNumberOrNull(payload.pre_reminder_time),
      p_snooze_enabled: asBool(payload.snooze_enabled),
      p_snooze_interval: asNumberOrNull(payload.snooze_interval),
      p_missed_dose_alert: asBool(payload.missed_dose_alert),
      p_total_quantity: asNumberOrNull(payload.total_quantity),
      p_dose_consumption: asNumberOrNull(payload.dose_consumption),
      p_refill_threshold: asNumberOrNull(payload.refill_threshold),
      p_refill_reminder_enabled: asBool(payload.refill_reminder_enabled),
      p_prescribed_by: payload.prescribed_by ? String(payload.prescribed_by) : null,
      p_hospital_or_clinic: payload.hospital_or_clinic ? String(payload.hospital_or_clinic) : null,
      p_prescription_notes: payload.prescription_notes ? String(payload.prescription_notes) : null,
    };

    // Try RPC first (preferred because it sets user_id = auth.uid() server-side).
    let data;
    let error;
    try {
      const res = await supabase.rpc('insert_medication', rpcParams);
      data = res.data;
      error = res.error;
    } catch (rpcErr) {
      // Some runtimes may throw — normalize to error handling below.
      console.warn('createMedication: rpc threw', rpcErr);
      data = null;
      error = rpcErr;
    }

    // If RPC fails because the function signature isn't found in the schema cache,
    // attempt a few fallbacks:
    // 1) Try alternate RPC parameter shapes (single-json/jsonb param variants)
    // 2) If still failing, fall back to direct insert with column-pruning resilience.
    let medication;
    if (error) {
      const details = String(error?.details || error?.message || '').toLowerCase();

      // Try some alternate RPC shapes (single-arg json/jsonb parameter variants) before falling back.
      const altParamVariants = [
        // common single-arg names we've seen in different migrations
        { p_payload: JSON.stringify(rpcParams) },
        { payload: JSON.stringify(rpcParams) },
        { data: JSON.stringify(rpcParams) },
        // also try sending the original params again in case the error was transient
        rpcParams,
      ];

      for (const paramsVariant of altParamVariants) {
        try {
          const altRes = await supabase.rpc('insert_medication', paramsVariant);
          if (!altRes.error && altRes.data) {
            data = altRes.data;
            error = null;
            break;
          }
        } catch (altErr) {
          // swallow and continue to next variant
          console.warn('createMedication: alternate RPC attempt failed', altErr);
        }
      }

      // If RPC is still failing, fall back to direct insert when it's an RPC-not-found type error
      if (error && (error?.code === 'PGRST202' || details.includes('insert_medication'))) {
        console.warn('createMedication: RPC not available after alternate attempts, falling back to direct insert', error);

        // Get authenticated user id
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          console.error('createMedication: no authenticated user for fallback insert');
          throw error;
        }

        const insertPayload = {
          user_id: authUser.id,
          entry_method: rpcParams.p_entry_method,
          medication_name: rpcParams.p_medication_name,
          medication_type: rpcParams.p_medication_type,
          dosage_value: rpcParams.p_dosage_value,
          // Include dosage_unit to match the DB schema / RPC behavior.
          dosage_unit: rpcParams.p_dosage_unit,
          instructions: rpcParams.p_instructions,
          frequency_type: rpcParams.p_frequency_type,
          times_per_day: rpcParams.p_times_per_day,
          dose_times: rpcParams.p_dose_times,
          repeat_days: rpcParams.p_repeat_days,
          start_date: rpcParams.p_start_date,
          end_date: rpcParams.p_end_date,
          timezone: rpcParams.p_timezone,
          notification_type: rpcParams.p_notification_type,
          pre_reminder_time: rpcParams.p_pre_reminder_time,
          snooze_enabled: rpcParams.p_snooze_enabled,
          snooze_interval: rpcParams.p_snooze_interval,
          missed_dose_alert: rpcParams.p_missed_dose_alert,
          total_quantity: rpcParams.p_total_quantity,
          dose_consumption: rpcParams.p_dose_consumption,
          refill_threshold: rpcParams.p_refill_threshold,
          refill_reminder_enabled: rpcParams.p_refill_reminder_enabled,
          prescribed_by: rpcParams.p_prescribed_by,
          hospital_or_clinic: rpcParams.p_hospital_or_clinic,
          prescription_notes: rpcParams.p_prescription_notes,
        };

        // Resilient insert: try inserting, and if PostgREST complains about a missing column (PGRST204),
        // remove that column from the payload and retry. This allows the client to work against
        // databases with different schemas without hard-failing on first insert attempt.
        const tryInsertWithColumnPrune = async (payloadObj, maxRetries = 10) => {
          let current = { ...payloadObj };
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            const { data: insertData, error: insertError } = await supabase
              .from('medications')
              .insert([current])
              .select()
              .single();

            if (!insertError) {
              return { data: insertData, error: null };
            }

            // Detect missing-column errors reported by PostgREST (various formats)
            const msg = String(insertError?.message || insertError?.details || insertError?.hint || '');
            // Try multiple regex forms that PostgREST/Postgres may produce
            const patterns = [
              /Could not find the '([^']+)' column of 'medications'/i,
              /column "([^"]+)" of relation "medications" does not exist/i,
              /missing column(?:s)?[:\s]*([a-zA-Z0-9_,\s"]+)/i,
            ];
            let missingCol = null;
            for (const pat of patterns) {
              const m = msg.match(pat);
              if (m && m[1]) {
                // If the match contains a list, pick first column name and strip quotes/spaces
                missingCol = String(m[1]).split(/[,"]+/).map((s) => s.trim()).find(Boolean);
                if (missingCol) break;
              }
            }

            if (insertError?.code === 'PGRST204' && missingCol) {
              if (missingCol in current) {
                // Remove offending column and retry
                console.warn(`createMedication: detected missing column '${missingCol}', removing and retrying insert`);
                delete current[missingCol];
                // continue to next attempt
                continue;
              } else {
                // Column mentioned but not present in payload — nothing to prune; return error
                return { data: null, error: insertError };
              }
            }

            // If error isn't a missing-column case or column not in payload, return the error
            return { data: null, error: insertError };
          }

          return {
            data: null,
            error: new Error('createMedication: exceeded retries while pruning missing columns'),
          };
        };

        const { data: insertData, error: insertError } = await tryInsertWithColumnPrune(insertPayload);

        if (insertError) {
          console.error('createMedication: direct insert failed after retries', insertError);
          throw insertError;
        }

        medication = insertData;
      } else {
        // Not an RPC-not-found case — surface the RPC error
        console.error('createMedication: rpc insert_medication error', error);
        throw error;
      }
    } else {
      // RPC succeeded - normalize result
      medication = Array.isArray(data) ? data[0] : data;
    }

    // Best-effort: schedule notification if reminder_enabled is truthy
    try {
      if (medication?.reminder_enabled) {
        await ReminderScheduler.scheduleReminder(medication);
      }
    } catch (schedErr) {
      // Don't fail the create on scheduling problems; log and continue
      console.warn('createMedication: scheduling failed (continuing)', schedErr);
    }

    return medication;
  } catch (err) {
    console.error('createMedication: unexpected error', err);
    throw err;
  }
}

/**
 * updateMedication(id, patch)
 * - patch: partial fields to update. Returns updated medication row.
 * - Ensures updated_at is set server-side as well by including updated_at timestamp.
 */
export async function updateMedication(id, patch = {}) {
  if (!id) throw new Error('updateMedication: id is required');
  try {
    const toUpdate = { ...patch, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from('medications').update(toUpdate).eq('id', id).select().single();

    if (error) {
      console.error('updateMedication error', error);
      throw error;
    }

    // Best-effort: reschedule/cancel based on reminder_enabled & reminder_time
    try {
      if (data?.reminder_enabled) {
        await ReminderScheduler.scheduleReminder(data);
      } else {
        // If reminders are disabled, cancel any scheduled notification
        await ReminderScheduler.cancelScheduledReminder(id);
      }
    } catch (schedErr) {
      console.warn('updateMedication: scheduling update failed (continuing)', schedErr);
    }

    return data;
  } catch (err) {
    console.error('updateMedication: unexpected error', err);
    throw err;
  }
}

/**
 * fetchMedication(id)
 * - Returns single medication row or null
 */
export async function fetchMedication(id) {
  if (!id) return null;
  try {
    const { data, error } = await supabase.from('medications').select('*').eq('id', id).single();
    if (error) {
      console.error('fetchMedication error', error);
      throw error;
    }
    return data;
  } catch (err) {
    console.error('fetchMedication: unexpected error', err);
    throw err;
  }
}

/**
 * fetchMedications(opts)
 * - opts: { limit, offset, upcomingOnly (bool), status }
 * - By default returns user's active, non-deleted medications ordered by start_date asc.
 */
export async function fetchMedications(opts = {}) {
  try {
    const { limit = 100, offset = 0, upcomingOnly = false, status = ['active'] } = opts;

    let query = supabase.from('medications').select('*').neq('is_deleted', true);

    if (Array.isArray(status)) {
      query = query.in('status', status);
    } else if (status) {
      query = query.eq('status', status);
    }

    if (upcomingOnly) {
      const nowISO = new Date().toISOString();
      query = query.gte('start_date', nowISO.slice(0, 10));
    }

    const { data, error } = await query.order('start_date', { ascending: true }).limit(limit).offset(offset);

    if (error) {
      console.error('fetchMedications error', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('fetchMedications: unexpected error', err);
    throw err;
  }
}

/**
 * softDeleteMedication(id)
 * - Marks is_deleted = true and sets deleted_at timestamp.
 */
export async function softDeleteMedication(id) {
  if (!id) throw new Error('softDeleteMedication: id required');
  try {
    const { data, error } = await supabase
      .from('medications')
      .update({ is_deleted: true, deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('softDeleteMedication error', error);
      throw error;
    }

    // Cancel scheduled notification(s) for this medication
    try {
      await ReminderScheduler.cancelScheduledReminder(id);
    } catch (err) {
      console.warn('softDeleteMedication: failed to cancel scheduled reminder', err);
    }

    return data;
  } catch (err) {
    console.error('softDeleteMedication: unexpected error', err);
    throw err;
  }
}

/**
 * createIntakeLog(opts)
 * - opts: { medicationId, scheduledTime (ISO/timestamp), takenTime (ISO/timestamp|null), doseStatus, notes }
 * - Returns inserted log row.
 */
export async function createIntakeLog({ medicationId, scheduledTime, takenTime = null, doseStatus = 'taken', notes = null } = {}) {
  if (!medicationId || !scheduledTime || !doseStatus) throw new Error('createIntakeLog: missing required fields');

  try {
    const insert = {
      medication_id: medicationId,
      scheduled_time: scheduledTime,
      taken_time: takenTime,
      dose_status: doseStatus,
      notes,
    };

    const { data, error } = await supabase.from('medication_intake_logs').insert([insert]).select().single();

    if (error) {
      console.error('createIntakeLog error', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('createIntakeLog: unexpected error', err);
    throw err;
  }
}

/* Default export: helper object */
const MedicationService = {
  createMedication,
  updateMedication,
  fetchMedication,
  fetchMedications,
  softDeleteMedication,
  createIntakeLog,
};

export default MedicationService;
