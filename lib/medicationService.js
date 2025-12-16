/**
 * File: [`lib/medicationService.js`](lib/medicationService.js:1)
 *
 * Purpose:
 * - Provide clean wrappers around Supabase for medications
 * - Save medications with only essential fields shown in the UI
 * - Expose: createMedication, updateMedication, fetchMedication, fetchMedications, softDeleteMedication
 */

import * as SupabaseLib from './supabase';
const supabase = SupabaseLib.supabase || SupabaseLib.default || SupabaseLib;

/**
 * createMedication(payload)
 * - payload: object with fields matching the UI
 *
 * Example payload:
 * {
 *   medication_name: 'Aspirin',
 *   medication_type: 'Tablet',
 *   dosage_value: 500,
 *   instructions: 'Take with water',
 *   frequency_type: 'daily',
 *   times_per_day: 1,
 *   dose_times: ['08:00'],
 *   start_date: '2025-12-17',
 *   end_date: null,
 *   repeat_days: null,
 *   timezone: 'Asia/Kolkata',
 * }
 */
async function createMedication(payload = {}) {
  try {
    // Get authenticated user
    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData?.user;

    if (!authUser) {
      throw new Error('User not authenticated');
    }

    // Normalize dose_times: convert "HH:MM" to "HH:MM:00" for database
    const normalizedDoseTimes = Array.isArray(payload.dose_times)
      ? payload.dose_times
          .map((t) => {
            if (!t) return null;
            const timeStr = String(t).trim();
            // Accept "HH:MM" -> convert to "HH:MM:00"
            if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
              const parts = timeStr.split(':');
              const hh = parts[0].padStart(2, '0');
              return `${hh}:${parts[1]}:00`;
            }
            // Accept "HH:MM:SS"
            if (/^\d{1,2}:\d{2}:\d{2}$/.test(timeStr)) {
              const parts = timeStr.split(':');
              const hh = parts[0].padStart(2, '0');
              return `${hh}:${parts[1]}:${parts[2]}`;
            }
            return null;
          })
          .filter(Boolean)
      : null;

    // Build insert payload
    const insertPayload = {
      user_id: authUser.id,
      medication_name: String(payload.medication_name || '').trim(),
      medication_type: String(payload.medication_type || '').trim(),
      dosage_value: Number(payload.dosage_value || 0),
      instructions: payload.instructions ? String(payload.instructions).trim() : null,
      frequency_type: String(payload.frequency_type || 'once').toLowerCase(),
      times_per_day: Number(payload.times_per_day || 1),
      dose_times: normalizedDoseTimes && normalizedDoseTimes.length ? normalizedDoseTimes : null,
      start_date: payload.start_date || new Date().toISOString().slice(0, 10),
      end_date: payload.end_date || null,
      repeat_days: Array.isArray(payload.repeat_days) && payload.repeat_days.length ? payload.repeat_days : null,
      timezone: payload.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    };

    console.log('medicationService.createMedication - insert payload:', insertPayload);

    // Insert into database
    const { data, error } = await supabase
      .from('medications')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error('medicationService.createMedication - insert error:', error);
      throw error;
    }

    console.log('medicationService.createMedication - success:', data);
    return data;
  } catch (err) {
    console.error('medicationService.createMedication - unexpected error:', err);
    throw err;
  }
}

/**
 * updateMedication(id, patch)
 * - patch: partial fields to update
 */
async function updateMedication(id, patch = {}) {
  if (!id) throw new Error('updateMedication: id is required');
  try {
    const toUpdate = { ...patch, updated_at: new Date().toISOString() };
    const { data, error } = await supabase
      .from('medications')
      .update(toUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('updateMedication error', error);
      throw error;
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
async function fetchMedication(id) {
  if (!id) return null;
  try {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('id', id)
      .single();

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
 * - Returns user's active, non-deleted medications
 */
async function fetchMedications(opts = {}) {
  try {
    const { limit = 100, offset = 0 } = opts;

    // Use range for compatibility (some environments / client builds do not expose .limit/.offset)
    const start = Number(offset) || 0;
    const end = start + (Number(limit) || 100) - 1;

    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('is_deleted', false)
      .order('start_date', { ascending: true })
      .range(start, end);

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
 * - Marks is_deleted = true and sets deleted_at timestamp
 */
async function softDeleteMedication(id) {
  if (!id) throw new Error('softDeleteMedication: id required');
  try {
    const { data, error } = await supabase
      .from('medications')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('softDeleteMedication error', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('softDeleteMedication: unexpected error', err);
    throw err;
  }
}

/* Default export only */
const MedicationService = {
  createMedication,
  updateMedication,
  fetchMedication,
  fetchMedications,
  softDeleteMedication,
};

export default MedicationService;