import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../lib/supabase';
const DRAFT_KEY = 'poco:reminder_draft';

export default function HomeScreen() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(null);
  const [doneToday, setDoneToday] = useState([]);

  const router = useRouter();

  // Load today's completed reminders (Done Today)
  async function loadDoneToday() {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('is_deleted', false)
        .eq('status', 'taken')
        .gte('completed_at', start.toISOString())
        .lt('completed_at', end.toISOString())
        .order('completed_at', { ascending: false });

      if (error) {
        console.warn('loadDoneToday:', error);
        setDoneToday([]);
        return;
      }
      setDoneToday(data || []);
    } catch (e) {
      console.warn('loadDoneToday failed', e);
      setDoneToday([]);
    }
  }

  useEffect(() => {
    let unsub = null;
    if (router && router.addListener) {
      unsub = router.addListener('focus', loadDoneToday);
    }
    loadDoneToday();
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [router]);

  useEffect(() => {
    checkAuthAndProfile();
  }, []);

  // Load any saved incomplete reminder draft and refresh on focus
  useEffect(() => {
    let unsub = null;
    async function loadDraft() {
      try {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (!raw) {
          setDraft(null);
          return;
        }
        const parsed = JSON.parse(raw);
        setDraft(parsed);
      } catch (e) {
        console.warn('Failed to load draft', e);
      }
    }
    loadDraft();
    if (router && router.addListener) {
      unsub = router.addListener('focus', loadDraft);
    }
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [router]);

  const checkAuthAndProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
          router.replace('/signin');
        return;
      }

      setUser(authUser);

      // Check if user has completed onboarding
        const { data: profile } = await supabase
          .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();
        
      if (!profile || !profile.first_name || !profile.companion_name) {
          router.replace('/onboarding');
          return;
        }
        
      setUserProfile(profile);
      } catch (error) {
      console.error('Error checking auth:', error);
        router.replace('/signin');
      } finally {
      setLoading(false);
      }
    };

  const handleStartChat = () => {
    router.push('/chat');
  };

  const handleProfileSettings = () => {
    router.push('/profile');
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              router.replace('/signin');
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerSpacer} />
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.avatarSection}>
        <Image
          source={require('../assets/poco-avatar.png')}
            style={styles.avatar}
          />
          <Text style={styles.userName}>
            {userProfile?.first_name || 'User'}
          </Text>
          <Text style={styles.companionText}>
            Your companion: <Text style={styles.companionName}>{userProfile?.companion_name || 'Pixel'}</Text>
          </Text>
        </View>

        {draft && (
          <View style={styles.floatingNoteCard}>
            <Text style={styles.floatingNoteTitle}>{draft.title || 'Untitled draft'}</Text>
            <Text style={styles.floatingNoteText}>
              {draft.description
                ? (String(draft.description).length > 120 ? `${String(draft.description).slice(0, 120)}…` : draft.description)
                : 'You started a reminder but didn\'t finish. Set a time or delete this draft.'}
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <TouchableOpacity
                style={styles.setTimeBtn}
                onPress={() => router.push({ pathname: '/Reminders/ReminderFormScreen', params: { loadDraft: true } })}
              >
                <Text style={styles.setTimeBtnText}>Set Time</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteDraftBtn}
                onPress={async () => {
                  try {
                    await AsyncStorage.removeItem(DRAFT_KEY);
                    setDraft(null);
                  } catch (e) {
                    console.warn('Failed to delete draft', e);
                    Alert.alert('Error', 'Could not delete draft.');
                  }
                }}
              >
                <Text style={styles.deleteDraftText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Done Today section: displays completed items for the current day */}
        <View style={styles.doneTodayContainer}>
          <Text style={styles.sectionTitle}>Done Today</Text>
          {doneToday.length === 0 ? (
            <Text style={styles.doneEmpty}>No completed items yet.</Text>
          ) : (
            doneToday.map((d) => (
              <View key={d.id} style={styles.doneItem}>
                <View style={styles.doneLeft}>
                  <View style={styles.greenCheck}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                </View>
                <View style={styles.doneContent}>
                  <Text style={styles.doneTitle}>{d.title || d.description || 'Reminder'}</Text>
                  <Text style={styles.doneTime}>{d.completed_at ? new Date(d.completed_at).toLocaleTimeString() : ''}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity style={styles.optionCard} onPress={handleStartChat}>
            <View style={styles.optionIcon}>
              <Ionicons name="chatbubbles" size={32} color="#10b981" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Start Chatting</Text>
              <Text style={styles.optionDescription}>
                Chat with {userProfile?.companion_name || 'Pixel'} about anything
        </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionCard} onPress={handleProfileSettings}>
            <View style={styles.optionIcon}>
              <Ionicons name="person-circle" size={32} color="#10b981" />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Profile & Settings</Text>
              <Text style={styles.optionDescription}>
                Manage your profile and app preferences
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Your AI companion is ready to help!
          </Text>
        </View>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/Reminders/ReminderFormScreen')}
          accessibilityRole="button"
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.fabText}>Add</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  signOutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  avatar: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  companionText: {
    fontSize: 16,
    color: '#6b7280',
  },
  companionName: {
    color: '#10b981',
    fontWeight: '600',
  },
  floatingNoteCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fbd38d',
  },
  floatingNoteTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 6,
  },
  floatingNoteText: {
    fontSize: 13,
    color: '#92400e',
  },
  setTimeBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginTop: 6,
  },
  setTimeBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  deleteDraftBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  deleteDraftText: {
    color: '#fff',
    fontWeight: '600',
  },
  optionsContainer: {
    flex: 1,
  },
  optionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: '#10b981',
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  fabText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },

  /* Done Today styles */
  doneTodayContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#064e3b',
    marginBottom: 8,
  },
  doneEmpty: {
    fontSize: 13,
    color: '#6b7280',
  },
  doneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  doneLeft: {
    width: 36,
    height: 36,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greenCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneContent: {
    flex: 1,
  },
  doneTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  doneTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
});
