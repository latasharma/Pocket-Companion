import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { supabase } from '@/lib/supabase';

export default function AddMedicationsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isEditing = !!params.id;

  const scrollViewRef = useRef(null);
  const background = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  const uiFontFamily = Platform.select({ ios: 'AtkinsonHyperlegible', android: 'AtkinsonHyperlegible', default: undefined });

  // Robust parsing of incoming OCR/navigation params so we can prefill fields
  const tryParseJSON = (val) => {
    if (!val) return null;
    if (typeof val === 'object') return val;
    if (typeof val !== 'string') return null;
    try {
      // Some callers pass a stringified JSON inside the `name` param
      return JSON.parse(val);
    } catch (e) {
      return null;
    }
  };

  // Look for structured OCR payload in multiple possible param keys
  const parsedOCR = (() => {
    const keysToCheck = ['ocrResult', 'ocr', 'ocrJson', 'ocrText', 'name'];
    for (const k of keysToCheck) {
      if (!params[k]) continue;
      const parsed = tryParseJSON(params[k]);
      // If parsed is an object and contains expected OCR keys, return it
      if (parsed && (parsed.medicine_name || parsed.raw_text || parsed.dosage || parsed.name || parsed.instructions)) {
        return parsed;
      }
      // If the param itself is a plain string (not JSON) and we are checking 'name', we skip here
    }
    return null;
  })();
  
  // Normalize OCR text: remove extra newlines and escaped "\\n" sequences so it displays nicely on a single line
  const cleanOCRText = (val) => {
    if (!val) return '';
    if (typeof val !== 'string') {
      try { return String(val); } catch { return ''; }
    }
    // Convert escaped backslash-n sequences to real newlines, normalize CRLF to LF
    let s = val.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
    // Split on newlines, trim each line, drop empty lines and join with a single space
    s = s.split('\n').map(line => line.trim()).filter(Boolean).join(' ');
    // Collapse multiple whitespace into single space
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  };
  
  // Derive initial values: prefer structured OCR, otherwise use raw params
  const initialName = parsedOCR?.medicine_name || parsedOCR?.name || (typeof params.name === 'string' && !params.name.trim().startsWith('{') ? params.name : '') || '';
  const initialDosage = parsedOCR?.dosage || parsedOCR?.strength || '' || params.dosage || '';
  const initialNotes = cleanOCRText(parsedOCR?.raw_text) || cleanOCRText(parsedOCR?.instructions) || params.notes || '';

  const [name, setName] = useState(initialName);
  const [dosage, setDosage] = useState(initialDosage);
  // Support any number of times per day. Internally we store an array of selected times.
  const parseTimesParam = (p) => {
    if (!p) return [];
    try {
      if (typeof p === 'string') {
        const trimmed = p.trim();
        // Accept JSON string (e.g. "[\"08:00\",\"18:00\"]") or comma-separated string
        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
          return JSON.parse(trimmed);
        }
        return trimmed.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (Array.isArray(p)) return p;
      return [];
    } catch (e) {
      return [];
    }
  };
  const [times, setTimes] = useState(parseTimesParam(params.times ?? params.time));
  const [notes, setNotes] = useState(initialNotes);

  // Track whether fields were auto-populated by OCR so UI can subtly highlight them
  const [isNamePrefilled, setIsNamePrefilled] = useState(!!initialName);
  const [isDosagePrefilled, setIsDosagePrefilled] = useState(!!initialDosage);

  const [verification, setVerification] = useState(() => {
    if (params.verification) {
      try {
        return typeof params.verification === 'string' ? JSON.parse(params.verification) : params.verification;
      } catch (e) {
        return { nameChecked: false, dosageChecked: false, instructionsChecked: false };
      }
    }
    return { nameChecked: false, dosageChecked: false, instructionsChecked: false };
  });

  // Task 4.4.1: Critical Medication Toggle state
  const [isCritical, setIsCritical] = useState(params.is_critical === 'true');
  const [caregiverName, setCaregiverName] = useState(params.caregiver_name || '');
  const [caregiverPhone, setCaregiverPhone] = useState(params.caregiver_phone || '');
  const [caregiverEmail, setCaregiverEmail] = useState(params.caregiver_email || '');
  const [caregiverConsent, setCaregiverConsent] = useState(params.caregiver_consent === 'true');
  
  // User's phone number for SMS confirmations
  const [userPhone, setUserPhone] = useState(params.user_phone || '');

  const [saving, setSaving] = useState(false);

  // Prefill caregiver contact from profile so users don’t re-enter
  useEffect(() => {
    const loadCaregiverFromProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from('profiles')
          .select('caregiver_name, caregiver_phone, caregiver_email, phone')
          .eq('id', user.id)
          .single();
        if (error) return;
        if (!caregiverName && data?.caregiver_name) setCaregiverName(data.caregiver_name);
        if (!caregiverPhone && data?.caregiver_phone) setCaregiverPhone(data.caregiver_phone);
        if (!caregiverEmail && data?.caregiver_email) setCaregiverEmail(data.caregiver_email);
        if (!userPhone && data?.phone) setUserPhone(data.phone);
      } catch (e) {
        console.error('Error preloading caregiver info:', e);
      }
    };
    loadCaregiverFromProfile();
  }, []);

  // Get current time + 2 minutes for testing
  const testTime = new Date();
  testTime.setMinutes(testTime.getMinutes() + 2);
  const testTimeStr = `${String(testTime.getHours()).padStart(2, '0')}:${String(testTime.getMinutes()).padStart(2, '0')}`;
  const testTimeDisplay = testTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  const timeOptions = [
    { label: '🧪 TEST (2 min)', value: testTimeStr, display: testTimeDisplay, icon: 'flask-outline' },
    { label: 'Before Breakfast', value: '07:00', display: '07:00 AM', icon: 'sunny-outline' },
    { label: 'After Breakfast', value: '08:00', display: '08:00 AM', icon: 'sunny' },
    { label: 'Lunch', value: '12:30', display: '12:30 PM', icon: 'restaurant-outline' },
    { label: 'Dinner', value: '18:00', display: '06:00 PM', icon: 'moon-outline' },
    { label: 'Bedtime', value: '21:00', display: '09:00 PM', icon: 'bed-outline' },
  ];

  const handleBack = () => router.back();

  const toggleVerification = (key) => {
    setVerification((p) => ({ ...p, [key]: !p[key] }));
  };

  const handleToggleCritical = () => {
    if (!isCritical) {
      Alert.alert(
        'Enable Critical Escalation?',
        'For critical medications, you will receive an SMS to confirm. Reply TAKEN or SKIP. Your caregiver will be notified if you don\'t respond within 60 minutes.\n\nYou need a phone number for SMS confirmations.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', onPress: () => setIsCritical(true) }
        ]
      );
    } else {
      setIsCritical(false);
    }
  };

  const saveMedicine = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter the medicine name.');
      return;
    }

    if (isCritical) {
      // Validate user has phone number for SMS confirmations
      if (!userPhone.trim()) {
        Alert.alert(
          'Phone Number Required',
          'Critical medications require SMS confirmation. Please enter your phone number below.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Validate phone number format (basic)
      const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
      if (!phoneRegex.test(userPhone.trim())) {
        Alert.alert(
          'Invalid Phone Number',
          'Please enter a valid phone number (e.g., +1234567890)',
          [{ text: 'OK' }]
        );
        return;
      }

      // Validate caregiver info
      if (!caregiverName.trim() || !caregiverPhone.trim() || !caregiverEmail.trim()) {
        Alert.alert('Validation', 'Please provide Caregiver Name, Phone, and Email for critical escalation.');
        return;
      }
      if (!caregiverConsent) {
        Alert.alert('Validation', 'You must consent to share alerts with the caregiver.');
        return;
      }
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    console.log('Saving medication with details:', { name, dosage, times, notes, verification });
    try {
      const payload = {
        user_id: user.id,
        name: name.trim(),
        dosage: dosage.trim() || null,
        // Preserve backward compatibility: store first selected time in `time` and all selections in `times` (JSON string)
        time: (times && times.length > 0) ? times[0] : null,
        times: (times && times.length > 0) ? JSON.stringify(times) : null,
        notes: notes.trim() || null,
        verification: JSON.stringify(verification),
        is_critical: isCritical,
        caregiver_name: isCritical ? caregiverName.trim() : null,
        caregiver_phone: isCritical ? caregiverPhone.trim() : null,
        caregiver_email: isCritical ? caregiverEmail.trim() : null,
        caregiver_consent: isCritical ? caregiverConsent : false,
      };

      let error;
      if (isEditing) {
        const { error: updateError } = await supabase.from('medications').update(payload).eq('id', params.id);
        error = updateError;
      } else {
        payload.created_at = new Date().toISOString();
        const { error: insertError } = await supabase.from('medications').insert([payload]);
        error = insertError;
      }

      if (error) {
        console.error('Supabase insert error:', error);
        Alert.alert('Error', 'Failed to save medication.');
        return;
      }

      // Persist user phone and caregiver contact to profile for reuse
      try {
        const profileUpdate = {
          id: user.id,
          caregiver_name: caregiverName?.trim() || null,
          caregiver_phone: caregiverPhone?.trim() || null,
          caregiver_email: caregiverEmail?.trim() || null,
        };
        
        // Only update phone if user entered one (don't overwrite with null)
        if (userPhone?.trim()) {
          profileUpdate.phone = userPhone.trim();
        }
        
        await supabase.from('profiles').upsert(profileUpdate);
      } catch (profileErr) {
        console.error('Warning: failed to update profile', profileErr);
      }

      // Navigate back to the medications list
      router.dismiss();
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('Error', 'An unexpected error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]}> 
      <ThemedView style={styles.container}>
        <View style={styles.appBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton} accessibilityLabel="Back">
            <Ionicons name='arrow-back' size={24} color="#10b981" />
          </TouchableOpacity>
          <ThemedText type="title" style={[styles.title, { fontFamily: uiFontFamily }]}>{isEditing ? 'Edit Medication' : 'Add Reminder'}</ThemedText>
          <View style={styles.appBarRight} />
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
        <ScrollView 
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.content} 
          keyboardShouldPersistTaps="handled"
        >
          <ThemedText type="subtitle" style={[styles.sectionTitle, { fontFamily: uiFontFamily, color: textColor }]}>Medicine Details</ThemedText>

          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { fontFamily: uiFontFamily }]}>Medicine name</ThemedText>
            <TextInput
              value={name}
              onChangeText={(v) => { setName(v); if (isNamePrefilled) setIsNamePrefilled(false); }}
              placeholder="e.g. Paracetamol"
              placeholderTextColor="#9ca3af"
              style={[
                styles.input,
                { fontFamily: uiFontFamily, color: textColor, borderColor: '#e5e7eb' }
              ]}
              accessibilityLabel="Medicine name"
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { fontFamily: uiFontFamily }]}>Dosage</ThemedText>
            <TextInput
              value={dosage}
              onChangeText={(v) => { setDosage(v); if (isDosagePrefilled) setIsDosagePrefilled(false); }}
              placeholder="e.g. 1 tablet, 500 mg"
              placeholderTextColor="#9ca3af"
              style={[
                styles.input,
                { fontFamily: uiFontFamily, color: textColor, borderColor: '#e5e7eb' }
              ]}
              accessibilityLabel="Dosage"
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { fontFamily: uiFontFamily }]}>Time</ThemedText>
            <View style={styles.timeOptionsContainer}>
              {timeOptions.map((option) => {
                const idx = times.indexOf(option.value);
                const selected = idx !== -1;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.timeOption,
                      selected && styles.timeOptionSelected,
                      { borderColor: selected ? '#10b981' : '#e5e7eb' }
                    ]}
                    onPress={() => {
                      if (selected) {
                        setTimes((prev) => prev.filter((t) => t !== option.value));
                      } else {
                        setTimes((prev) => [...prev, option.value]);
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${option.label} at ${option.display}`}
                  >
                    <Ionicons
                      name={option.icon}
                      size={24}
                      color={selected ? '#10b981' : '#6b7280'}
                    />
                    <ThemedText style={[
                      styles.timeOptionLabel,
                      { fontFamily: uiFontFamily, color: selected ? '#10b981' : '#6b7280' }
                    ]}>
                      {option.label}
                    </ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ThemedText style={[
                        styles.timeOptionValue,
                        { fontFamily: uiFontFamily, color: selected ? '#10b981' : '#9ca3af' }
                      ]}>
                        {option.display}
                      </ThemedText>
                    </View>
                    {selected ? <View style={styles.selectedCheckmark}><Ionicons name="checkmark-circle" size={24} color="#10b981" /></View> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { fontFamily: uiFontFamily }]}>Notes / Instructions</ThemedText>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes"
              placeholderTextColor="#9ca3af"
              style={[styles.textarea, { fontFamily: uiFontFamily, color: textColor, borderColor: '#e5e7eb' }]}
              multiline
              numberOfLines={4}
              accessibilityLabel="Notes"
            />
          </View>

          {/* Verification checklist - placed above the Save button as requested */}
          <View style={styles.checklistCard}>
            <ThemedText type="subtitle" style={[styles.checklistTitle, { fontFamily: uiFontFamily, color: textColor }]}>Verification Checklist</ThemedText>

            <TouchableOpacity style={styles.checkItem} onPress={() => toggleVerification('nameChecked')} accessibilityRole="button">
              <View style={[styles.checkbox, verification.nameChecked ? { backgroundColor: "#10b981" } : { borderColor: '#111827' }]}>
                {verification.nameChecked ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
              </View>
              <ThemedText style={[styles.checkLabel, { fontFamily: uiFontFamily }]}>Medicine name is correct</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkItem} onPress={() => toggleVerification('dosageChecked')} accessibilityRole="button">
              <View style={[styles.checkbox, verification.dosageChecked ? { backgroundColor: "#10b981" } : { borderColor: '#111827' }]}>
                {verification.dosageChecked ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
              </View>
              <ThemedText style={[styles.checkLabel, { fontFamily: uiFontFamily }]}>Dosage / strength confirmed</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkItem} onPress={() => toggleVerification('instructionsChecked')} accessibilityRole="button">
              <View style={[styles.checkbox, verification.instructionsChecked ? { backgroundColor: "#10b981" } : { borderColor: '#111827' }]}>
                {verification.instructionsChecked ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
              </View>
              <ThemedText style={[styles.checkLabel, { fontFamily: uiFontFamily }]}>Read and understood instructions</ThemedText>
            </TouchableOpacity>

            {/* Task 4.4.1: Critical Medication Toggle */}
            <TouchableOpacity style={styles.checkItem} onPress={handleToggleCritical} accessibilityRole="button">
              <View style={[styles.checkbox, isCritical ? { backgroundColor: "#ef4444", borderColor: "#ef4444" } : { borderColor: '#111827' }]}>
                {isCritical ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
              </View>
              <ThemedText style={[styles.checkLabel, { fontFamily: uiFontFamily, color: '#ef4444', fontWeight: '600' }]}>
                Escalate to caregiver if I don’t confirm this dose
              </ThemedText>
            </TouchableOpacity>

            {isCritical && (
              <View style={{ marginTop: 8, paddingLeft: 4, paddingRight: 4 }}>
                {/* User Phone Number for SMS Confirmations */}
                <ThemedText style={[styles.fieldLabel, { fontFamily: uiFontFamily, fontSize: 14, fontWeight: '600', color: '#ef4444' }]}>
                  Your Phone Number (for SMS confirmations)
                </ThemedText>
                <TextInput
                  value={userPhone}
                  onChangeText={setUserPhone}
                  style={[styles.input, { fontFamily: uiFontFamily, color: textColor, borderColor: '#ef4444', borderWidth: 2, marginBottom: 12, fontSize: 16, padding: 10 }]}
                  placeholder="e.g. +1234567890"
                  keyboardType="phone-pad"
                  placeholderTextColor="#9ca3af"
                />
                <ThemedText style={[styles.fieldLabel, { fontFamily: uiFontFamily, fontSize: 12, color: '#6b7280', marginBottom: 12 }]}>
                  You will receive an SMS to confirm this medication. Reply TAKEN or SKIP.
                </ThemedText>

                {/* Caregiver Contact */}
                <ThemedText style={[styles.fieldLabel, { fontFamily: uiFontFamily, fontSize: 14 }]}>Caregiver Name</ThemedText>
                <TextInput
                  value={caregiverName}
                  onChangeText={setCaregiverName}
                  style={[styles.input, { fontFamily: uiFontFamily, color: textColor, borderColor: '#e5e7eb', marginBottom: 10, fontSize: 16, padding: 10 }]}
                  placeholder="e.g. Jane Doe"
                  placeholderTextColor="#9ca3af"
                />
                <ThemedText style={[styles.fieldLabel, { fontFamily: uiFontFamily, fontSize: 14 }]}>Caregiver Phone</ThemedText>
                <TextInput
                  value={caregiverPhone}
                  onChangeText={setCaregiverPhone}
                  style={[styles.input, { fontFamily: uiFontFamily, color: textColor, borderColor: '#e5e7eb', marginBottom: 10, fontSize: 16, padding: 10 }]}
                  placeholder="e.g. +1234567890"
                  keyboardType="phone-pad"
                  placeholderTextColor="#9ca3af"
                />
                <ThemedText style={[styles.fieldLabel, { fontFamily: uiFontFamily, fontSize: 14 }]}>Caregiver Email</ThemedText>
                <TextInput
                  value={caregiverEmail}
                  onChangeText={setCaregiverEmail}
                  style={[styles.input, { fontFamily: uiFontFamily, color: textColor, borderColor: '#e5e7eb', marginBottom: 10, fontSize: 16, padding: 10 }]}
                  placeholder="e.g. jane@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#9ca3af"
                  onFocus={() => {
                    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
                  }}
                />
                <TouchableOpacity style={[styles.checkItem, { paddingVertical: 4 }]} onPress={() => setCaregiverConsent(!caregiverConsent)}>
                  <View style={[styles.checkbox, caregiverConsent ? { backgroundColor: "#10b981" } : { borderColor: '#111827' }]}>
                    {caregiverConsent ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
                  </View>
                  <ThemedText style={[styles.checkLabel, { fontFamily: uiFontFamily, fontSize: 14, flex: 1 }]}>
                    I consent to sharing alerts with this caregiver.
                  </ThemedText>
                </TouchableOpacity>

            {(caregiverName || caregiverPhone || caregiverEmail) && (
              <View style={styles.caregiverSummaryCard}>
                <ThemedText style={[styles.caregiverLabel, { fontFamily: uiFontFamily }]}>Caregiver contact</ThemedText>
                {caregiverName ? (
                  <ThemedText style={[styles.caregiverValue, { fontFamily: uiFontFamily }]}>
                    {caregiverName}
                  </ThemedText>
                ) : null}
                {caregiverPhone ? (
                  <ThemedText style={[styles.caregiverValue, { fontFamily: uiFontFamily }]}>
                    {caregiverPhone}
                  </ThemedText>
                ) : null}
                {caregiverEmail ? (
                  <ThemedText style={[styles.caregiverValue, { fontFamily: uiFontFamily }]}>
                    {caregiverEmail}
                  </ThemedText>
                ) : null}
                <ThemedText style={[styles.escalationNote, { fontFamily: uiFontFamily }]}>
                  Escalation: caregiver will be notified if you don’t confirm within 60 minutes.
                </ThemedText>
              </View>
            )}
              </View>
            )}
          </View>

          <View style={{ height: 24 }} />

          {/* Single action button at the bottom */}
          <View style={[styles.footer, { paddingHorizontal: 0 }]}> 
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: "#10b981" }]}
              onPress={saveMedicine}
              accessibilityLabel="Save Medicine"
              disabled={saving}
            >
              <ThemedText type="defaultSemiBold" style={[styles.saveText, { fontFamily: uiFontFamily, color: '#fff' }]}>{saving ? 'Saving…' : (isEditing ? 'Update Medicine' : 'Save Medicine')}</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  appBar: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  backButton: { padding: 8 },
  appBarRight: { width: 32 },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
},
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 60 },
  referenceImage: { width: '100%', height: 180, resizeMode: 'contain', marginBottom: 12 },
  sectionTitle: { marginBottom: 10, paddingHorizontal: 2 },
  field: { marginBottom: 12 },
  fieldLabel: { marginBottom: 6, fontSize: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 18, backgroundColor: '#fff' },
  textarea: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 18, backgroundColor: '#fff', minHeight: 90, textAlignVertical: 'top' },
  checklistCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 6, marginHorizontal: 20 },
  checklistTitle: { marginBottom: 8 },
  checkItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  checkbox: { width: 30, height: 30, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderColor: '#111827' },
  checkLabel: { fontSize: 16 },
  timeOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  timeOption: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 10,
    position: 'relative',
  },
  timeOptionSelected: {
    backgroundColor: '#ecfdf5',
  },
  timeOptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  timeOptionValue: {
    fontSize: 12,
    marginTop: 2,
  },
  footer: { padding: 20, borderTopWidth: 0 },
  saveButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  saveText: { fontSize: 18 },
  // Checkmark for selected time slots
  selectedCheckmark: { position: 'absolute', bottom: 8, right: 8 },
  caregiverSummaryCard: {
    marginTop: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#10b981',
    gap: 2,
  },
  caregiverLabel: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  caregiverValue: {
    fontSize: 14,
    color: '#1f2937',
  },
  escalationNote: {
    marginTop: 4,
    fontSize: 12,
    color: '#ef4444',
  },

});
