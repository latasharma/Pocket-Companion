import { Ionicons } from '@expo/vector-icons';
import RNCalendarEvents from 'react-native-calendar-events';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BottomNav from '../components/BottomNav';
import { useThemeColor } from '../hooks/useThemeColor';
import { buildLocalMorningDate, computeNextOccurrence } from '../lib/dateUtils';
import { supabase } from '../lib/supabase';

export default function DashboardScreen() {
  const router = useRouter();
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverPhone, setCaregiverPhone] = useState('');
  const [summaryStats, setSummaryStats] = useState({
    takenToday: 0,
    missedToday: 0,
    streakDays: 0,
    adherenceRate: 0,
    missedCritical7: 0,
  });
  const [appointmentInfo, setAppointmentInfo] = useState({
    title: 'Loading…',
    timeLabel: '',
    status: 'loading',
  });
  const background = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardBg = '#ffffff';
  const mutedText = '#6b7280';
  const accent = '#10b981';

  useEffect(() => {
    const loadCaregiver = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('profiles')
          .select('caregiver_name, caregiver_phone')
          .eq('id', user.id)
          .single();
        setCaregiverName(data?.caregiver_name || '');
        setCaregiverPhone(data?.caregiver_phone || '');
      } catch (error) {
        console.error('Error loading caregiver:', error);
      }
    };

    loadCaregiver();
  }, []);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const now = new Date();
        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const { data: doseEvents, error: doseError } = await supabase
          .from('dose_events')
          .select('status, scheduled_at')
          .eq('user_id', user.id)
          .gte('scheduled_at', thirtyDaysAgo.toISOString())
          .lte('scheduled_at', now.toISOString());

        if (doseError) {
          console.error('Error fetching dose events:', doseError);
        }

        const events = doseEvents || [];
        const last7 = events.filter((e) => new Date(e.scheduled_at) >= sevenDaysAgo);
        const todayEvents = events.filter((e) => new Date(e.scheduled_at) >= startOfToday);

        const takenToday = todayEvents.filter((e) => e.status === 'taken').length;
        const missedToday = todayEvents.filter((e) => e.status === 'pending').length;

        const taken7 = last7.filter((e) => e.status === 'taken').length;
        const missed7 = last7.filter((e) => e.status === 'pending').length;
        const skipped7 = last7.filter((e) => e.status === 'skipped').length;
        const total7 = taken7 + missed7 + skipped7;
        const adherenceRate = total7 > 0 ? Math.round((taken7 / total7) * 100) : 0;

        const byDay = events.reduce((acc, e) => {
          const date = new Date(e.scheduled_at);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          if (!acc[key]) acc[key] = { due: 0, missed: 0 };
          acc[key].due += 1;
          if (e.status === 'pending') acc[key].missed += 1;
          return acc;
        }, {});

        let streakDays = 0;
        for (let i = 0; i < 30; i += 1) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const stats = byDay[key];
          if (!stats || stats.due === 0) {
            continue;
          }
          if (stats.missed === 0) {
            streakDays += 1;
          } else {
            break;
          }
        }

        const { data: criticalMissed, error: criticalError } = await supabase
          .from('dose_events')
          .select('id, scheduled_at, status, medications!inner(is_critical)')
          .eq('user_id', user.id)
          .eq('medications.is_critical', true)
          .eq('status', 'pending')
          .gte('scheduled_at', sevenDaysAgo.toISOString())
          .lt('scheduled_at', now.toISOString());

        if (criticalError) {
          console.error('Error fetching critical missed doses:', criticalError);
        }

        setSummaryStats({
          takenToday,
          missedToday,
          streakDays,
          adherenceRate,
          missedCritical7: (criticalMissed || []).length,
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };

    loadDashboardData();
  }, []);

  useEffect(() => {
    const loadNextAppointment = async () => {
      try {
        const permission = await RNCalendarEvents.checkPermissions();
        if (permission !== 'authorized') {
          setAppointmentInfo({
            title: 'Calendar access needed',
            timeLabel: 'Enable calendar in Appointments',
            status: 'permission',
          });
          return;
        }

        const start = new Date();
        const end = new Date();
        end.setDate(end.getDate() + 30);
        const events = await RNCalendarEvents.fetchAllEvents(start.toISOString(), end.toISOString());

        const upcoming = events
          .map((e) => ({ ...e, start: new Date(e.startDate) }))
          .filter((e) => e.start >= start)
          .sort((a, b) => a.start - b.start);

        if (upcoming.length === 0) {
          setAppointmentInfo({
            title: 'No upcoming appointments',
            timeLabel: 'Add one in Reminders',
            status: 'empty',
          });
          return;
        }

        const next = upcoming[0];
        const dateLabel = next.start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const timeLabel = next.start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        setAppointmentInfo({
          title: next.title || 'Upcoming appointment',
          timeLabel: `${dateLabel} · ${timeLabel}`,
          status: 'ready',
        });
      } catch (error) {
        console.error('Error loading calendar events:', error);

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          const { data } = await supabase
            .from('important_dates')
            .select('title, date, time, repeat_type')
            .eq('user_id', user.id);

          const now = new Date();
          const candidates = (data || []).map((item) => {
            const [hours, minutes] = (item.time || '08:00:00').split(':').map(Number);
            let baseDate = buildLocalMorningDate(item.date, hours || 8, minutes || 0);
            let nextDate = baseDate;
            let safety = 0;
            while (nextDate < now && safety < 365) {
              nextDate = computeNextOccurrence(nextDate, item.repeat_type);
              safety += 1;
            }
            return { title: item.title, nextDate };
          });

          const upcoming = candidates
            .filter((c) => c.nextDate >= now)
            .sort((a, b) => a.nextDate - b.nextDate);

          if (upcoming.length === 0) {
            setAppointmentInfo({
              title: 'No upcoming appointments',
              timeLabel: 'Add one in Reminders',
              status: 'empty',
            });
            return;
          }

          const next = upcoming[0];
          const dateLabel = next.nextDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const timeLabel = next.nextDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          setAppointmentInfo({
            title: next.title,
            timeLabel: `${dateLabel} · ${timeLabel}`,
            status: 'ready',
          });
        } catch (fallbackError) {
          console.error('Error loading fallback appointments:', fallbackError);
          setAppointmentInfo({
            title: 'Unable to load appointments',
            timeLabel: 'Try again later',
            status: 'error',
          });
        }
      }
    };

    loadNextAppointment();
  }, []);

  const handleEmergencyPress = async () => {
    if (!caregiverPhone) {
      Alert.alert('Caregiver not set', 'Add a caregiver phone number in Profile & Settings.');
      router.push('/profile');
      return;
    }

    const normalized = caregiverPhone.replace(/[^\d+]/g, '');
    const telUrl = `tel:${normalized}`;
    const supported = await Linking.canOpenURL(telUrl);

    if (!supported) {
      Alert.alert('Cannot dial', 'Your device cannot place a phone call.');
      return;
    }

    Linking.openURL(telUrl);
  };

  const summaryDateLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }, []);

  const adherenceWidth = `${Math.min(Math.max(summaryStats.adherenceRate, 0), 100)}%`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={accent} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Dashboard</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryTitle, { color: textColor }]}>Summary</Text>
          <Text style={[styles.summaryDate, { color: mutedText }]}>{summaryDateLabel}</Text>
          </View>
          <View style={styles.summaryVisualRow}>
            <View style={[styles.summaryPill, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="checkmark-circle" size={24} color={accent} />
              <Text style={[styles.summaryPillValue, { color: textColor }]}>{summaryStats.takenToday}</Text>
              <Text style={[styles.summaryPillLabel, { color: mutedText }]}>Taken</Text>
            </View>
            <View style={[styles.summaryPill, { backgroundColor: '#fef2f2' }]}>
              <Ionicons name="close-circle" size={24} color="#ef4444" />
              <Text style={[styles.summaryPillValue, { color: textColor }]}>{summaryStats.missedToday}</Text>
              <Text style={[styles.summaryPillLabel, { color: mutedText }]}>Missed</Text>
            </View>
            <View style={[styles.summaryPill, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="flame" size={24} color="#3b82f6" />
              <Text style={[styles.summaryPillValue, { color: textColor }]}>{summaryStats.streakDays}</Text>
              <Text style={[styles.summaryPillLabel, { color: mutedText }]}>Streak</Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="medkit-outline" size={20} color={accent} />
            <Text style={[styles.cardTitle, { color: textColor }]}>Medication Safety</Text>
          </View>
          <View style={styles.progressRow}>
            <Text style={[styles.cardValue, { color: textColor }]}>Adherence</Text>
            <Text style={[styles.progressValue, { color: textColor }]}>{summaryStats.adherenceRate}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: adherenceWidth }]} />
          </View>
          <Text style={[styles.cardSubtext, { color: mutedText }]}>Last 7 days</Text>
          <View style={styles.criticalRow}>
            <Ionicons name="alert-circle" size={18} color="#ef4444" />
            <Text style={[styles.criticalText, { color: '#ef4444' }]}>
              Missed critical doses: {summaryStats.missedCritical7}
            </Text>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={accent} />
            <Text style={[styles.cardTitle, { color: textColor }]}>Safety Check</Text>
          </View>
          <Text style={[styles.cardValue, { color: textColor }]}>
            {caregiverName ? `Caregiver: ${caregiverName}` : 'Caregiver on file'}
          </Text>
          <TouchableOpacity style={styles.emergencyButton} onPress={handleEmergencyPress}>
            <Ionicons name="call-outline" size={20} color="#fff" />
            <Text style={styles.emergencyText}>EMERGENCY CALL</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={20} color={accent} />
            <Text style={[styles.cardTitle, { color: textColor }]}>Appointments</Text>
          </View>
          <Text style={[styles.cardValue, { color: textColor }]}>{appointmentInfo.title}</Text>
          {appointmentInfo.timeLabel ? (
            <Text style={[styles.cardSubtext, { color: mutedText }]}>{appointmentInfo.timeLabel}</Text>
          ) : null}
          <TouchableOpacity style={styles.linkButton} onPress={() => router.push('/Reminders/Appointments')}>
            <Text style={styles.linkButtonText}>View appointments</Text>
            <Ionicons name="chevron-forward" size={16} color={accent} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.seeMoreButton} onPress={() => router.push('/dashboard-details')}>
          <Text style={styles.seeMoreText}>See more details</Text>
          <Ionicons name="chevron-forward" size={18} color={accent} />
        </TouchableOpacity>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryHeader: { marginBottom: 12 },
  summaryTitle: { fontSize: 22, fontWeight: '700' },
  summaryDate: { fontSize: 15 },
  summaryVisualRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  summaryPill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 4,
  },
  summaryPillValue: { fontSize: 22, fontWeight: '700' },
  summaryPillLabel: { fontSize: 13 },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700' },
  cardValue: { fontSize: 16, marginBottom: 4 },
  cardSubtext: { fontSize: 14 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressValue: { fontSize: 20, fontWeight: '700' },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    marginTop: 8,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#10b981',
  },
  criticalRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  criticalText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emergencyButton: {
    marginTop: 10,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  emergencyText: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },
  linkButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  linkButtonText: { color: '#10b981', fontWeight: '600', fontSize: 14 },
  seeMoreButton: {
    marginTop: 4,
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeMoreText: { color: '#10b981', fontWeight: '600' },
});
