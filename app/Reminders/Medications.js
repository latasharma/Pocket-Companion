import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Platform, SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { supabase } from '@/lib/supabase';

export default function MedicationsScreen() {
  const router = useRouter();
  const [photo, setPhoto] = useState(null);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Theme-aware colors
  const background = useThemeColor({}, 'background')
  const textColor = useThemeColor({}, 'text');

  // Prefer a humanist sans-serif if available; fallback to system font.
  const uiFontFamily = Platform.select({ ios: 'AtkinsonHyperlegible', android: 'AtkinsonHyperlegible', default: undefined });

  useEffect(() => {
    fetchMedications();
  }, []);

  const fetchMedications = async () => {
    try {
      const { data, error } = await supabase.from('medications').select('*');
      if (error) throw error;
      setMedications(data || []);
    } catch (err) {
      console.error('Error fetching medications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => router.back();

  const handleScan = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.granted === false) {
        Alert.alert('Permission required', 'Camera permission is required to scan a medicine');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7, base64: false });
      // Handle both older (cancelled) and newer (canceled) keys
      const cancelled = result.cancelled === undefined ? result.canceled : result.cancelled;
      if (!cancelled) {
        // result.uri for older SDKs, result.assets[0].uri for newer
        const uri = result.uri ?? (result.assets && result.assets[0] && result.assets[0].uri);
        if (uri) setPhoto(uri);
      }
    } catch (err) {
      console.error('Camera error:', err);
    }
  };

  const removePhoto = () => setPhoto(null);

  const goToManual = () => router.push('/Reminders/AddMedications');

  const handleContinue = () => {
    // Move forward in the flow. Adjust destination as needed.
    router.push('/Reminders/AddMedications');
  };

  const handleAddLater = () => {
    // Skip adding meds for now — go back to previous screen
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: background }}>
      <ThemedView style={styles.container}>
        <View style={styles.appBar}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#10b981" />
          </TouchableOpacity>
          <ThemedText type="title" style={[styles.title, { fontFamily: uiFontFamily }]}>Add Medications</ThemedText>
          <View style={styles.appBarRight} />
        </View>

        <View style={styles.content}>
          <ThemedText type="title" style={[styles.headerTitleText, { fontFamily: uiFontFamily, color: textColor }]}>Add your medications or supplements</ThemedText>
          <ThemedText style={[styles.descriptionText, { fontFamily: uiFontFamily, color: textColor }]}>You can scan bottles or add them manually. This helps us personalize your experience.</ThemedText>

          <View style={styles.actionsRowTop}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#10b981" }]}
              onPress={handleScan}
              accessibilityLabel="Scan medicine"
            >
              <ThemedText type="defaultSemiBold" style={[styles.actionText, { fontFamily: uiFontFamily, color: '#fff' }]}>Scan</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#10b981" }]}
              onPress={goToManual}
              accessibilityLabel="Add medicine manually"
            >
              <ThemedText type="defaultSemiBold" style={[styles.actionText, { fontFamily: uiFontFamily, color: '#fff' }]}>Manual</ThemedText>
            </TouchableOpacity>
          </View>

          {/* Added medications list follows */}

          <View style={styles.addedSection}>
            <ThemedText type="subtitle" style={[styles.sectionTitle, { fontFamily: uiFontFamily, color: textColor }]}>Added Medications</ThemedText>

            {photo ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity style={styles.removePhotoButton} onPress={removePhoto} accessibilityLabel="Remove photo">
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : null}

            {loading ? (
              <ThemedText style={[styles.placeholderText, { fontFamily: uiFontFamily }]}>Loading...</ThemedText>
            ) : medications.length === 0 ? (
              <View style={styles.placeholderBox}>
                <ThemedText style={[styles.placeholderTitle, { fontFamily: uiFontFamily }]}>No medications yet</ThemedText>
                <ThemedText style={[styles.placeholderSubtitle, { fontFamily: uiFontFamily }]}>You can scan a medicine or add it manually</ThemedText>
              </View>
            ) : (
              medications.map((m) => (
                <View key={m.id} style={styles.medItem}>
                  <ThemedText style={[styles.medName, { fontFamily: uiFontFamily }]}>{m.name}</ThemedText>
                  <ThemedText style={[styles.medDetail, { fontFamily: uiFontFamily }]}>{m.dosage || ''}</ThemedText>
                </View>
              ))
            )}
          </View>

        </View>

        {/* Footer column with two stacked buttons */}
        <View style={[styles.footerColumn, { backgroundColor: 'transparent' }]}>
          <TouchableOpacity style={[styles.footerButton, styles.footerPrimary]} onPress={handleContinue} accessibilityLabel="Continue">
            <ThemedText type="defaultSemiBold" style={[styles.footerButtonText]}>Continue</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.footerButton, styles.footerSecondary]} onPress={handleAddLater} accessibilityLabel="Add later">
            <ThemedText type="defaultSemiBold" style={[styles.footerButtonText, styles.footerSecondaryText]}>Add Later</ThemedText>
          </TouchableOpacity>
        </View>

      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  appBar: { height: 56, flexDirection: 'row', alignItems: 'center' },
  backButton: { padding: 8 },
  appBarRight: { width: 32 },
  title: { 
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  content: { flex: 1, marginTop: 12, paddingBottom: 160 },
  headerTitleText: { fontSize: 22, fontWeight: '700', marginBottom: 6, textAlign: 'left' },
  // increased spacing below header description to visually separate it from action buttons
  descriptionText: { fontSize: 16, color: '#6b7280', marginBottom: 16 },
  // ensure enough gap between the description and the action buttons
  actionsRowTop: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  actionButton: { flex: 1, padding: 14, borderRadius: 10, marginHorizontal: 8, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '600' },
  // add more top margin so the "Added Medications" section sits comfortably below the action row
  addedSection: { marginTop: 20, marginBottom: 12 },
  sectionTitle: { marginBottom: 10 },
  placeholderBox: { backgroundColor: '#fff', borderRadius: 12, padding: 18, alignItems: 'center' },
  placeholderTitle: { fontSize: 18, fontWeight: '600', color: '#6b7280', marginBottom: 6 },
  placeholderSubtitle: { fontSize: 14, color: '#9ca3af' },
  placeholderText: { color: '#6b7280' },
  medItem: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10 },
  medName: { fontWeight: '600', color: '#1f2937' },
  medDetail: { color: '#6b7280' },
  photoPreview: { marginBottom: 12, alignSelf: 'stretch' },
  photo: { width: '100%', height: 200, borderRadius: 10 },
  removePhotoButton: { position: 'absolute', top: 8, right: 8, backgroundColor: '#ef4444', borderRadius: 16, padding: 6 },
 
  /* Footer column styles */
  footerColumn: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  footerButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  footerPrimary: {
    backgroundColor: '#10b981',
  },
  footerSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  footerButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  footerSecondaryText: {
    color: '#374151',
  },
});
