import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, SafeAreaView, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { supabase } from '@/lib/supabase';

export default function AddMedicationsScreen() {
  const router = useRouter();
  const background = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  const uiFontFamily = Platform.select({ ios: 'AtkinsonHyperlegible', android: 'AtkinsonHyperlegible', default: undefined });

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [notes, setNotes] = useState('');
  const [verification, setVerification] = useState({ nameChecked: false, dosageChecked: false, instructionsChecked: false });
  const [saving, setSaving] = useState(false);

  const handleBack = () => router.back();

  const toggleVerification = (key) => {
    setVerification((p) => ({ ...p, [key]: !p[key] }));
  };

  const saveMedicine = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Please enter the medicine name.');
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    try {
      const payload = {
        user_id: user.id,
        name: name.trim(),
        dosage: dosage.trim() || null,
        notes: notes.trim() || null,
        verification: JSON.stringify(verification),
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('medications').insert([payload]);
      if (error) {
        console.error('Supabase insert error:', error);
        Alert.alert('Error', 'Failed to save medication.');
        return;
      }

      // Navigate back to the medications list and let it refresh
      router.push('/Reminders/Medications');
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
          <ThemedText type="title" style={[styles.title, { fontFamily: uiFontFamily }]}>Add Reminder</ThemedText>
          <View style={styles.appBarRight} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Reference image - exact UI reference per design doc */}
          {/* <Image source={require('../../docs/Add_Medication_Manual.jpeg')} style={styles.referenceImage} /> */}

          <ThemedText type="subtitle" style={[styles.sectionTitle, { fontFamily: uiFontFamily, color: textColor }]}>Medicine Details</ThemedText>

          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { fontFamily: uiFontFamily }]}>Medicine name</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Paracetamol"
              placeholderTextColor="#9ca3af"
              style={[styles.input, { fontFamily: uiFontFamily, color: textColor, borderColor: '#e5e7eb' }]}
              accessibilityLabel="Medicine name"
            />
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.fieldLabel, { fontFamily: uiFontFamily }]}>Dosage</ThemedText>
            <TextInput
              value={dosage}
              onChangeText={setDosage}
              placeholder="e.g. 1 tablet, 500 mg"
              placeholderTextColor="#9ca3af"
              style={[styles.input, { fontFamily: uiFontFamily, color: textColor, borderColor: '#e5e7eb' }]}
              accessibilityLabel="Dosage"
            />
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
              <View style={[styles.checkbox, verification.nameChecked ? { backgroundColor: "#10b981" } : { borderColor: '#d1d5db' }]}>
                {verification.nameChecked ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
              </View>
              <ThemedText style={[styles.checkLabel, { fontFamily: uiFontFamily }]}>Medicine name is correct</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkItem} onPress={() => toggleVerification('dosageChecked')} accessibilityRole="button">
              <View style={[styles.checkbox, verification.dosageChecked ? { backgroundColor: "#10b981" } : { borderColor: '#d1d5db' }]}>
                {verification.dosageChecked ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
              </View>
              <ThemedText style={[styles.checkLabel, { fontFamily: uiFontFamily }]}>Dosage / strength confirmed</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkItem} onPress={() => toggleVerification('instructionsChecked')} accessibilityRole="button">
              <View style={[styles.checkbox, verification.instructionsChecked ? { backgroundColor: "#10b981" } : { borderColor: '#d1d5db' }]}>
                {verification.instructionsChecked ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
              </View>
              <ThemedText style={[styles.checkLabel, { fontFamily: uiFontFamily }]}>Read and understood instructions</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Single action button at the bottom */}
        <View style={styles.footer}> 
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: "#10b981" }]}
            onPress={saveMedicine}
            accessibilityLabel="Save Medicine"
            disabled={saving}
          >
            <ThemedText type="defaultSemiBold" style={[styles.saveText, { fontFamily: uiFontFamily, color: '#fff' }]}>{saving ? 'Saving…' : 'Save Medicine'}</ThemedText>
          </TouchableOpacity>
        </View>
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
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  referenceImage: { width: '100%', height: 180, resizeMode: 'contain', marginBottom: 12 },
  sectionTitle: { marginBottom: 10, paddingHorizontal: 2 },
  field: { marginBottom: 12 },
  fieldLabel: { marginBottom: 6, fontSize: 16 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 18, backgroundColor: '#fff' },
  textarea: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 18, backgroundColor: '#fff', minHeight: 90, textAlignVertical: 'top' },
  checklistCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 6, marginHorizontal: 20 },
  checklistTitle: { marginBottom: 8 },
  checkItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  checkbox: { width: 30, height: 30, borderRadius: 6, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkLabel: { fontSize: 16 },
  footer: { padding: 20, borderTopWidth: 0 },
  saveButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
  saveText: { fontSize: 18 },
});
