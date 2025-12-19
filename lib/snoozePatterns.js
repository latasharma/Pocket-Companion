/**
 * File: [`lib/snoozePatterns.js`](lib/snoozePatterns.js:1)
 *
 * Story 7.1 — Snooze pattern detection job
 *
 * - Records snooze events (anchor + target time)
 * - Detects pattern: same anchor snoozed to same later time 3 days in a row
 * - On the 4th occurrence (when previous 3 consecutive days exist), shows a prompt
 *   asking the user to update the routine anchor to the snoozed time.
 * - If user accepts, calls RoutineAnchors.setAnchor(...) which triggers rescheduling.
 *
 * Notes:
 * - Persistent store: AsyncStorage under key '@poco:snooze_patterns'
 * - This module uses RN Alert for a minimal in-app prompt; it intentionally keeps
 *   behavior conservative (only prompt once per sequence day).
 * - Integration: call recordSnooze(...) after a snooze is recorded in the DB.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import RoutineAnchors from './routineAnchors';

const STORAGE_KEY = '@poco:snooze_patterns';

// Helper: format a Date instance into local YYYY-MM-DD
function formatLocalDate(d) {
  if (!(d instanceof Date)) d = new Date(d);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Helper: extract HH:MM:SS time part from ISO string or Date
function extractTimePart(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

// Load stored pattern map
async function loadMap() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('snoozePatterns.loadMap failed', err);
    return {};
  }
}

// Save pattern map
async function saveMap(map) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('snoozePatterns.saveMap failed', err);
  }
}

/**
 * recordSnooze(reminder, newReminderTimeISO)
 *
 * - reminder: DB reminder object that was snoozed. Expected fields:
 *    - id
 *    - routine_anchor (e.g., 'Breakfast')  <-- required for pattern detection
 * - newReminderTimeISO: ISO timestamp string representing the snoozed-to time
 *
 * Behavior:
 * - Records today's snooze occurrence under map[anchor][time] -> dates[]
 * - Trims history to last 14 days
 * - If the previous 3 calendar days (immediately preceding today) each have an
 *   occurrence for the same anchor+time, and we have not already prompted today,
 *   show a prompt to update the anchor to that time.
 */
export async function recordSnooze(reminder, newReminderTimeISO) {
  try {
    if (!reminder || !newReminderTimeISO) return null;
    const anchor = reminder.routine_anchor || reminder.anchor || null;
    if (!anchor) {
      // Not tied to a routine anchor — nothing to track
      return null;
    }

    const targetTime = extractTimePart(newReminderTimeISO);
    if (!targetTime) return null;

    const map = await loadMap();
    if (!map[anchor]) map[anchor] = {};
    if (!map[anchor][targetTime]) map[anchor][targetTime] = { dates: [], lastPrompted: null };

    const entry = map[anchor][targetTime];

    const today = formatLocalDate(new Date()); // use today's local date
    // Ensure unique dates
    if (!entry.dates.includes(today)) {
      entry.dates.push(today);
    }

    // Keep only the last 14 days to bound growth
    if (entry.dates.length > 14) {
      entry.dates = entry.dates.slice(-14);
    }

    // Helper: check whether a date string exists in the dates array
    const dateSet = new Set(entry.dates);

    // Check previous 3 consecutive days immediately before today:
    // e.g., if today is 2025-12-10, check 2025-12-09, 2025-12-08, 2025-12-07
    const now = new Date();
    let threeBackPresent = true;
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const ds = formatLocalDate(d);
      if (!dateSet.has(ds)) {
        threeBackPresent = false;
        break;
      }
    }

    // If the previous 3 days all had the same snooze target, and we haven't prompted today,
    // show a prompt now (this is the "on day 4" prompt).
    if (threeBackPresent && entry.lastPrompted !== today) {
      // Prepare friendly text
      const friendlyAnchor = anchor;
      const friendlyTime = targetTime.slice(0,5); // HH:MM
      // Show prompt. Use Alert with Update / Cancel.
      setTimeout(() => {
        Alert.alert(
          'Adjust routine anchor?',
          `We've noticed you snoozed ${friendlyAnchor} to ${friendlyTime} several days in a row. Would you like to update your ${friendlyAnchor} anchor to ${friendlyTime}?`,
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'Update',
              onPress: async () => {
                try {
                  // Apply the anchor update. RoutineAnchors.setAnchor will trigger rescheduling.
                  await RoutineAnchors.setAnchor(friendlyAnchor, targetTime);
                  Alert.alert('Updated', `${friendlyAnchor} anchor updated to ${friendlyTime}. Future reminders have been rescheduled.`);
                  // Mark prompted today to avoid repeat prompts
                  entry.lastPrompted = today;
                  await saveMap(map);
                } catch (err) {
                  console.error('snoozePatterns: failed to set anchor', err);
                  Alert.alert('Error', 'Could not update routine anchor.');
                }
              },
            },
          ],
          { cancelable: true }
        );
      }, 500); // slight delay so prompt doesn't interrupt immediate UX

      // record lastPrompted so we don't repeat prompt in same day
      entry.lastPrompted = today;
    }

    // Persist changes
    await saveMap(map);
    return entry;
  } catch (err) {
    console.error('snoozePatterns.recordSnooze error', err);
    return null;
  }
}

/**
 * clearHistory(anchor, time)
 * - utility to clear tracked history for testing or reset.
 */
export async function clearHistory(anchor, time) {
  try {
    const map = await loadMap();
    if (anchor && time) {
      if (map[anchor] && map[anchor][time]) {
        delete map[anchor][time];
      }
    } else if (anchor) {
      delete map[anchor];
    } else {
      // clear all
      await saveMap({});
      return;
    }
    await saveMap(map);
  } catch (err) {
    console.warn('snoozePatterns.clearHistory failed', err);
  }
}

const SnoozePatterns = {
  recordSnooze,
  clearHistory,
};

export default SnoozePatterns;