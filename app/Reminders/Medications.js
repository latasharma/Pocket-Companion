import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { parseMedicationFromOCR, performGeminiVisionOCRFromUrl } from '@/lib/aiService';
import { supabase } from '@/lib/supabase';
import { requestNotificationPermission, scheduleNotification } from '../../lib/NotificationService';

export default function MedicationsScreen() {
  const router = useRouter();
  const [photo, setPhoto] = useState(null);
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const insets = useSafeAreaInsets();

  // Theme-aware colors
  const background = useThemeColor({}, 'background')
  const textColor = useThemeColor({}, 'text');

  // Prefer a humanist sans-serif if available; fallback to system font.
  const uiFontFamily = Platform.select({ ios: 'AtkinsonHyperlegible', android: 'AtkinsonHyperlegible', default: undefined });

  useEffect(() => {
    requestNotificationPermission();
    fetchMedications();
  }, []);

  useEffect(() => {
    medications.forEach((med) => {
      //console.log('Medications updated, scheduling notifications...', med);
      if (!med.time) return;

      console.log('Medications updated, scheduling notifications for', med.name, 'at', med.time);

      const [hour, minute] = med.time.split(':').map(Number);
      const date = new Date();
      date.setHours(hour, minute, 0);

      // If time already passed today → schedule tomorrow
      if (date < new Date()) {
        date.setDate(date.getDate() + 1);
      }

      console.log('Scheduling notification for', med.name, 'at', date);

      scheduleNotification({
        id: `medication-${med.id}`,
        title: 'Medication Reminder',
        body: `Time to take ${med.name}`,
        date,
        repeat: true,
        type: 'medication',
      });
    });
  }, [medications]);

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
    setScanning(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.granted === false) {
        Alert.alert('Permission required', 'Camera permission is required to scan a medicine');
        setScanning(false);
        return;
      }

      // Capture image from camera — prefer not to request base64 to keep payload small.
      // We will upload the captured file and send the generated Supabase image URL to Gemini Vision OCR.
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.3,
        exif: false,
        allowsEditing: false,
        base64: true
      });

      // Handle both older (cancelled) and newer (canceled) keys
      const cancelled = result.cancelled === undefined ? result.canceled : result.cancelled;
      if (cancelled) {
        setScanning(false);
        return;
      }

      const uri = result.uri ?? (result.assets && result.assets[0] && result.assets[0].uri);
      // base64 will be undefined unless the picker returned it; prefer URL-based OCR.
      const base64Image = result.base64 ?? (result.assets && result.assets[0] && result.assets[0].base64);

      if (uri) setPhoto(uri);

      // Upload captured image to Supabase Storage (medicine-ocr-images bucket)
      let uploadedPublicUrl = null;
      try {
        const filename = `ocr_${Date.now()}.jpg`;
        const filePath = `uploads/${filename}`; // put uploads in a dedicated folder

        // Fetch the captured file as an ArrayBuffer
        const fetchRes = await fetch(uri);
        const arrayBuffer = await fetchRes.arrayBuffer();

        // Upload to the specified bucket and path. Use upsert: false to avoid overwriting.
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('medicine-ocr-images')
          .upload(filePath, arrayBuffer, { contentType: 'image/jpeg', upsert: false });

        if (uploadError) {
          console.error('Supabase upload error:', uploadError);
        } else {
          const path = uploadData?.path || filePath;

          // Try to generate a public URL first (works if bucket is public)
          try {
            const { data: urlData, error: urlError } = await supabase.storage
              .from('medicine-ocr-images')
              .getPublicUrl(path);

            if (urlError) {
              console.error('Supabase getPublicUrl error:', urlError);
            } else {
              uploadedPublicUrl = urlData?.publicUrl || urlData?.publicURL || urlData?.public_url || null;
            }
          } catch (e) {
            console.error('Error generating public URL:', e);
          }

          // If the bucket is private or public URL not available, create a signed URL (valid for 1 hour)
          if (!uploadedPublicUrl) {
            try {
              const expiresIn = 60 * 60; // 1 hour
              const { data: signedData, error: signedError } = await supabase.storage
                .from('medicine-ocr-images')
                .createSignedUrl(path, expiresIn);

              if (signedError) {
                console.error('Supabase createSignedUrl error:', signedError);
              } else {
                // Signed URL property name can vary between SDK versions
                uploadedPublicUrl = signedData?.signedUrl || signedData?.signed_url || null;
              }
            } catch (e) {
              console.error('Error creating signed URL:', e);
            }
          }

          console.log('Uploaded image URL (public or signed):', uploadedPublicUrl);
        }
      } catch (uploadErr) {
        console.error('Upload error:', uploadErr);
      }

      // Prefer sending an accessible image URL to Gemini Vision (per docs). Fall back to base64 if URL OCR fails.
      let ocrRaw = null;
      if (uploadedPublicUrl && typeof performGeminiVisionOCRFromUrl === 'function') {
        try {
          ocrRaw = await performGeminiVisionOCRFromUrl(uploadedPublicUrl);
          console.log('OCR (from URL) raw output:', ocrRaw);
        } catch (err) {
          console.error('OCR from URL failed:', err);
          ocrRaw = null;
        }
      }

      // if (!ocrRaw && base64Image) {
      //   try {
      //     ocrRaw = await performGeminiVisionOCR(base64Image);
      //     console.log('OCR (from base64) raw output:', ocrRaw);
      //   } catch (ocrErr) {
      //     console.error('OCR error:', ocrErr);
      //   }
      // }

      if (ocrRaw) {
        const ocrText = typeof ocrRaw === 'string' ? ocrRaw : JSON.stringify(ocrRaw);

        try {
          const parsed = parseMedicationFromOCR(ocrText);
          console.log('OCR parsed result:', parsed);

          const confidence = parsed && typeof parsed.confidence === 'number' ? parsed.confidence : 0;

          // If confidence is sufficient, pre-fill the Add Medication form. Otherwise fallback to manual entry.
          if (confidence >= 50 && (parsed.name || parsed.dosage)) {
            setScanning(false);
            router.push({
              pathname: '/Reminders/AddMedications',
              params: {
                name: parsed.name || undefined,
                dosage: parsed.dosage || undefined,
                ocrText: ocrText || undefined,
                imageUrl: uploadedPublicUrl || undefined,
              },
            });
            return;
          } else {
            console.log('OCR confidence low or insufficient data (confidence=' + confidence + '), navigating without prefill');
          }
        } catch (parseErr) {
          console.error('OCR parse error:', parseErr);
        }
      }

      // Fallback: navigate without prefilled data
      setScanning(false);
      router.push('/Reminders/AddMedications');
    } catch (err) {
      console.error('Camera error:', err);
      setScanning(false);
      Alert.alert('Error', 'Failed to scan image.');
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

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Medication',
      'Are you sure you want to delete this medication?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('medications').delete().eq('id', id);
            if (!error) fetchMedications();
            else Alert.alert('Error', 'Failed to delete medication');
          },
        },
      ]
    );
  };

  const handleEdit = (item) => {
    router.push({
      pathname: '/Reminders/AddMedications',
      params: {
        id: item.id,
        name: item.name,
        dosage: item.dosage,
        time: item.time ? item.time.substring(0, 5) : '',
        notes: item.notes,
        verification: typeof item.verification === 'object' ? JSON.stringify(item.verification) : item.verification,
      },
    });
  };

  const renderMedItem = ({ item }) => (
    <View style={styles.medItem}>
      <View style={styles.medInfo}>
        <ThemedText style={[styles.medName, { fontFamily: uiFontFamily }]}>{item.name}</ThemedText>
        <ThemedText style={[styles.medDetail, { fontFamily: uiFontFamily }]}>{item.dosage || ''}</ThemedText>
      </View>
      <View style={styles.medActions}>
        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.iconButton} accessibilityLabel="Edit">
          <Ionicons name="pencil" size={20} color="#3b82f6" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconButton} accessibilityLabel="Delete">
          <Ionicons name="trash" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.placeholderBox}>
      <ThemedText style={[styles.placeholderTitle, { fontFamily: uiFontFamily }]}>No medications yet</ThemedText>
      <ThemedText style={[styles.placeholderSubtitle, { fontFamily: uiFontFamily }]}>You can scan a medicine or add it manually</ThemedText>
    </View>
  );

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
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="scan-sharp" size={18} color="#fff" style={{ marginRight: 8 }} />
                <ThemedText type="defaultSemiBold" style={[styles.actionText, { fontFamily: uiFontFamily, color: '#fff' }]}>Scan</ThemedText>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: "#10b981" }]}
              onPress={goToManual}
              accessibilityLabel="Add medicine manually"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="pencil" size={18} color="#fff" style={{ marginRight: 8 }} />
                <ThemedText type="defaultSemiBold" style={[styles.actionText, { fontFamily: uiFontFamily, color: '#fff' }]}>Manual</ThemedText>
              </View>
            </TouchableOpacity>
          </View>

          {/* Added medications list follows */}

          <View style={styles.addedSection}>
            <ThemedText type="subtitle" style={[styles.sectionTitle, { fontFamily: uiFontFamily, color: textColor }]}>Added Medications</ThemedText>


            {loading ? (
              <ThemedText style={[styles.placeholderText, { fontFamily: uiFontFamily }]}>Loading...</ThemedText>
            ) : (
              <FlatList
                data={medications}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderMedItem}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={medications.length === 0 ? { flex: 1 } : { paddingBottom: 8 }}
                showsVerticalScrollIndicator={false}
              />
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
    
        {scanning && (
          <View style={[styles.loadingOverlay, { top: -insets.top, bottom: -insets.bottom }]} pointerEvents="auto">
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        )}
    
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
  medItem: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  medInfo: { flex: 1 },
  medActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconButton: { padding: 4 },
  medName: { fontWeight: '600', color: '#1f2937' },
  medDetail: { color: '#6b7280' },
  photoPreview: { marginBottom: 12, alignSelf: 'stretch' },
  photo: { width: '100%', height: 200, borderRadius: 10 },
  removePhotoButton: { position: 'absolute', top: 8, right: 8, backgroundColor: '#ef4444', borderRadius: 16, padding: 6 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 20,
  },
  
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
