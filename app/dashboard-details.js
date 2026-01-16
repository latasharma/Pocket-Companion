import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, SafeAreaView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BottomNav from '../components/BottomNav';

export default function DashboardDetailsScreen() {
  const router = useRouter();

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          'Weekly snapshot: Adherence 92%, Missed critical 0, Next appointments: Annual Checkup Tue 10:00 AM.'
      });
    } catch (error) {
      Alert.alert('Share failed', 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#10b981" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="heart-outline" size={20} color="#10b981" />
            <Text style={styles.cardTitle}>Vitals</Text>
          </View>
          <Text style={styles.cardValue}>BP 124/78 · Weight 148 lb</Text>
          <Text style={styles.cardSubtext}>Last updated: Today</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="happy-outline" size={20} color="#10b981" />
            <Text style={styles.cardTitle}>Mood & Cognition</Text>
          </View>
          <Text style={styles.cardValue}>Mood: Good</Text>
          <Text style={styles.cardSubtext}>Check-in completed</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="walk-outline" size={20} color="#10b981" />
            <Text style={styles.cardTitle}>Activity & Sleep</Text>
          </View>
          <Text style={styles.cardValue}>2,500 steps · 7h sleep</Text>
          <Text style={styles.cardSubtext}>Last night</Text>
        </View>

        <View style={styles.snapshotCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={20} color="#10b981" />
            <Text style={styles.cardTitle}>Caregiver Snapshot</Text>
          </View>
          <Text style={styles.cardValue}>Adherence 92% · Missed critical 0</Text>
          <Text style={styles.cardSubtext}>Next appointment: Tue 10:00 AM</Text>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={18} color="#10b981" />
            <Text style={styles.shareText}>Share snapshot</Text>
          </TouchableOpacity>
        </View>
      </View>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: { padding: 8 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  headerSpacer: { width: 32 },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 110 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  snapshotCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardValue: { fontSize: 16, color: '#1f2937', marginBottom: 4 },
  cardSubtext: { fontSize: 13, color: '#6b7280' },
  shareButton: {
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  shareText: { color: '#10b981', fontWeight: '600' },
});
