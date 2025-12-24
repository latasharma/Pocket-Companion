import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import ReminderScheduler from '../../lib/reminderScheduler';
import RoutineAnchors from '../../lib/routineAnchors';
import { supabase } from '../../lib/supabase';

/**
 * File: [`app/Reminders/RoutineSetupWizard.js`](app/Reminders/RoutineSetupWizard.js:1)
 *
 * Reminders Setup Wizard
 * - Collects Breakfast / Lunch / Dinner / Bedtime times
 * - Persists locally via RoutineAnchors (existing behavior)
 * - Also persists to Supabase user_preferences so anchors are available server-side
 * - Triggers ReminderScheduler.rescheduleAll() after saving
 *
 * Route: expo-router -> /Reminders/RoutineSetupWizard
 */

export default function RemindersRoutineSetupWizard() {
  const router = useRouter();
  const [anchors, setAnchors] = useState({
    Breakfast: '08:00:00',
    Lunch: '12:30:00',
    Dinner: '18:00:00',
    Bedtime: '21:00:00',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const existing = await RoutineAnchors.getAnchors();
        setAnchors(existing || anchors);
      } catch (e) {
        console.warn('RoutineSetupWizard: failed to load anchors, using defaults', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function display(hms) {
    if (!hms) return '--:--';
    const parts = String(hms).split(':');
    if (parts.length < 2) return hms;
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }

  function parseFlexibleTime(input) {
    if (!input || typeof input !== 'string') return null;
    const s = input.trim();
    // Accept "9:00", "09:00", "9:00 AM", "09:00pm", "21:30", "21:30:00"
    const re = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm|AM|PM)?$/;
    const m = s.match(re);
    if (!m) return null;
    let hh = Number(m[1]);
    const mm = Number(m[2]);
    const ss = m[3] ? Number(m[3]) : 0;
    const ampm = m[4] ? m[4].toLowerCase() : null;
    if (mm < 0 || mm > 59 || ss < 0 || ss > 59) return null;
    if (ampm) {
      if (hh < 1 || hh > 12) return null;
      if (ampm === 'pm' && hh < 12) hh += 12;
      if (ampm === 'am' && hh === 12) hh = 0;
    } else {
      if (hh < 0 || hh > 23) return null;
    }
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  async function saveAll(answers) {
    setSaving(true);
    try {
      // Persist locally first
      await RoutineAnchors.initialize();

      // Set each anchor using the library (triggers reschedule per-anchor)
      for (const k of Object.keys(answers)) {
        try {
          await RoutineAnchors.setAnchor(k, answers[k]);
        } catch (e) {
          console.warn('RoutineSetupWizard: setAnchor failed for', k, e);
        }
      }

      // Persist server-side for the authenticated user (best-effort)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.id) {
          // Upsert into user_preferences table so it's keyed to the user
          const payload = {
            user_id: user.id,
            category: 'reminders',
            key: 'routine_anchors',
            value: answers,
          };

          // Attempt upsert (onConflict enforced by DB unique constraint)
          const { data, error } = await supabase.from('user_preferences').upsert([payload], { onConflict: '(user_id,category,key)' }).select().single();
          if (error) {
            console.warn('RoutineSetupWizard: supabase upsert failed', error);
          }
        } else {
          console.info('RoutineSetupWizard: no authenticated user, skipping supabase save');
        }
      } catch (e) {
        console.warn('RoutineSetupWizard: supabase save failed', e);
      }

      // Final reschedule all (best-effort)
      try {
        await ReminderScheduler.rescheduleAll();
      } catch (e) {
        console.warn('RoutineSetupWizard: rescheduleAll failed', e);
      }

      Alert.alert('Saved', 'Your routine anchors have been saved.');
      // Return to reminders onboarding (or home)
      router.replace('/Reminders/ReminderOnBoardingScreen');
    } catch (err) {
      console.error('RoutineSetupWizard.saveAll error', err);
      Alert.alert('Error', 'Could not save routine anchors.');
    } finally {
      setSaving(false);
    }
  }

  function onSkip() {
    Alert.alert(
      'Skip setup?',
      'If you skip, default routine anchors will be used. You can change them later in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await RoutineAnchors.initialize(); // will persist defaults if none exist
              try {
                await ReminderScheduler.rescheduleAll();
              } catch (e) {
                console.warn('RoutineSetupWizard: rescheduleAll after skip failed', e);
              }
              router.replace('/Reminders/ReminderOnBoardingScreen');
            } catch (e) {
              console.error('RoutineSetupWizard.skip error', e);
              Alert.alert('Error', 'Could not complete setup.');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reminder Defaults — Quick Setup</Text>
      <Text style={styles.sub}>Set your usual times so PoCo can suggest better reminders.</Text>

      <View style={styles.form}>
        {['Breakfast', 'Lunch', 'Dinner', 'Bedtime'].map((k) => (
          <View key={k} style={styles.row}>
            <Text style={styles.label}>{k}</Text>
            <TextInput
              value={display(anchors[k])}
              onChangeText={(t) => {
                setAnchors((s) => ({ ...s, [k]: t }));
              }}
              placeholder={display(RoutineAnchors.DEFAULT_ANCHORS[k])}
              style={styles.input}
              keyboardType="default"
            />
            <Text style={styles.hint}>Example: 08:00 or 9:00 AM</Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 16 }}>
        <Button
          title={saving ? 'Saving...' : 'Save and continue'}
          onPress={async () => {
            // Validate and normalize answers
            const answers = {};
            for (const k of Object.keys(anchors)) {
              const raw = anchors[k];
              const parsed = parseFlexibleTime(String(raw));
              if (!parsed) {
                Alert.alert('Invalid time', `Please enter a valid time for ${k}, e.g. "09:00" or "9:00 AM".`);
                return;
              }
              answers[k] = parsed;
            }
            await saveAll(answers);
          }}
          disabled={saving}
        />
      </View>

      <View style={{ marginTop: 12 }}>
        <Button title="Skip for now" onPress={onSkip} color="#6b7280" disabled={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  sub: { color: '#6b7280', marginBottom: 12 },
  form: { marginTop: 8 },
  row: { marginBottom: 12 },
  label: { fontSize: 16, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
