import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import VoiceSelector from '../components/VoiceSelector';
import BottomNav from '../components/BottomNav';
import { supabase } from '../lib/supabase';
import { VoiceService } from '../lib/voiceService';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companionName, setCompanionName] = useState('');
  const [caregiverName, setCaregiverName] = useState('');
  const [caregiverPhone, setCaregiverPhone] = useState('');
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const [caregiverOrgName, setCaregiverOrgName] = useState('');
  const [caregiverOrgPhone, setCaregiverOrgPhone] = useState('');
  const [caregiverOrgEmail, setCaregiverOrgEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [dataCollection, setDataCollection] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceInputEnabled, setVoiceInputEnabled] = useState(true);
  const [prefLoading, setPrefLoading] = useState(false);
  const [proactiveFrequency, setProactiveFrequency] = useState('daily');
  const [quietStart, setQuietStart] = useState('21:00');
  const [quietEnd, setQuietEnd] = useState('08:00');
  const [quietStartDate, setQuietStartDate] = useState(() => {
    const d = new Date();
    d.setHours(21, 0, 0, 0);
    return d;
  });
  const [quietEndDate, setQuietEndDate] = useState(() => {
    const d = new Date();
    d.setHours(8, 0, 0, 0);
    return d;
  });
  const [showQuietStartPicker, setShowQuietStartPicker] = useState(false);
  const [showQuietEndPicker, setShowQuietEndPicker] = useState(false);
  const [topicNews, setTopicNews] = useState(true);
  const [topicGames, setTopicGames] = useState(true);
  const [topicImportantDates, setTopicImportantDates] = useState(true);
  const [newsKeywords, setNewsKeywords] = useState('');
  const [newsRss, setNewsRss] = useState('');

  useEffect(() => {
    fetchUserProfile();
    loadProactivePreferences();
  }, []);

  const normalizeTimeInput = (value) => {
    if (!value) return '';
    const trimmed = value.trim();
    if (trimmed.length >= 5) return trimmed.slice(0, 5);
    return trimmed;
  };

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const timeStringToDate = (value, fallback) => {
    if (!value) return fallback;
    const [h, m] = value.split(':').map(Number);
    const d = new Date();
    d.setHours(Number.isFinite(h) ? h : fallback.getHours(), Number.isFinite(m) ? m : fallback.getMinutes(), 0, 0);
    return d;
  };

  const loadProactivePreferences = async () => {
    try {
      const { data: { user: authUserData } } = await supabase.auth.getUser();
      if (!authUserData) return;

      const { data: prefData } = await supabase
        .from('proactive_preferences')
        .select('*')
        .eq('user_id', authUserData.id)
        .single();

      if (prefData) {
        setProactiveFrequency(prefData.frequency || 'daily');
        const start = normalizeTimeInput(prefData.quiet_hours_start) || '21:00';
        const end = normalizeTimeInput(prefData.quiet_hours_end) || '08:00';
        setQuietStart(start);
        setQuietEnd(end);
        setQuietStartDate(timeStringToDate(start, quietStartDate));
        setQuietEndDate(timeStringToDate(end, quietEndDate));
      }

      const { data: topics } = await supabase
        .from('proactive_topics')
        .select('topic_type, keywords, rss_sources')
        .eq('user_id', authUserData.id);

      if (topics && topics.length > 0) {
        setTopicNews(!!topics.find((t) => t.topic_type === 'news'));
        setTopicGames(!!topics.find((t) => t.topic_type === 'games'));
        setTopicImportantDates(!!topics.find((t) => t.topic_type === 'important_dates'));

        const newsTopic = topics.find((t) => t.topic_type === 'news');
        if (newsTopic) {
          setNewsKeywords((newsTopic.keywords || []).join(', '));
          setNewsRss((newsTopic.rss_sources || []).join(', '));
        }
      }
    } catch (error) {
      console.error('Error loading proactive preferences:', error);
    }
  };

  const handleSaveProactivePreferences = async () => {
    try {
      setPrefLoading(true);
      const { data: { user: authUserData } } = await supabase.auth.getUser();
      if (!authUserData) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      let timezone = 'America/New_York';
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz) timezone = tz;
      } catch (e) {
        // keep default
      }

      const { error: prefError } = await supabase
        .from('proactive_preferences')
        .upsert({
          user_id: authUserData.id,
          channels: ['sms'],
          quiet_hours_start: normalizeTimeInput(quietStart) || '21:00',
          quiet_hours_end: normalizeTimeInput(quietEnd) || '08:00',
          frequency: proactiveFrequency,
          timezone,
        }, { onConflict: 'user_id' });

      if (prefError) {
        console.error('Proactive preferences save error:', prefError);
        Alert.alert('Error', prefError.message || 'Failed to save preferences');
        return;
      }

      const { error: deleteError } = await supabase
        .from('proactive_topics')
        .delete()
        .eq('user_id', authUserData.id);

      if (deleteError) {
        console.error('Proactive topics delete error:', deleteError);
        Alert.alert('Error', deleteError.message || 'Failed to update topics');
        return;
      }

      const topicsToInsert = [];

      if (topicNews) {
        const keywords = newsKeywords.split(',').map((k) => k.trim()).filter(Boolean);
        const rssSources = newsRss.split(',').map((s) => s.trim()).filter(Boolean);
        topicsToInsert.push({
          user_id: authUserData.id,
          topic_type: 'news',
          keywords,
          rss_sources: rssSources,
        });
      }

      if (topicGames) {
        topicsToInsert.push({ user_id: authUserData.id, topic_type: 'games' });
      }

      if (topicImportantDates) {
        topicsToInsert.push({ user_id: authUserData.id, topic_type: 'important_dates' });
      }

      if (topicsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('proactive_topics')
          .insert(topicsToInsert);
        if (insertError) {
          console.error('Proactive topics insert error:', insertError);
          Alert.alert('Error', insertError.message || 'Failed to update topics');
          return;
        }
      }

      Alert.alert('Saved', 'Proactive preferences updated');
    } catch (error) {
      console.error('Error saving proactive preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setPrefLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user: authUserData } } = await supabase.auth.getUser();
      if (authUserData) {
        setAuthUser(authUserData);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUserData.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
          Alert.alert('Error', 'Failed to load profile');
          return;
        }

        if (data) {
        setUser(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
          setCompanionName(data.companion_name || 'Pixel');
          setCaregiverName(data.caregiver_name || '');
          setCaregiverPhone(data.caregiver_phone || '');
          setCaregiverEmail(data.caregiver_email || '');
          setCaregiverOrgName(data.caregiver_org_name || '');
          setCaregiverOrgPhone(data.caregiver_org_phone || '');
          setCaregiverOrgEmail(data.caregiver_org_email || '');
          setVoiceEnabled(data.voice_enabled !== false); // Default to true if not set
          setVoiceInputEnabled(data.voice_input_enabled !== false); // Default to true if not set
          
          // Set voice type if available
          if (data.voice_type) {
            VoiceService.setVoiceType(data.voice_type);
          }
        } else {
          // Create default profile if none exists
          setUser({
            id: authUserData.id,
            first_name: '',
            last_name: '',
            companion_name: 'Pixel',
            voice_enabled: true,
            voice_type: 'female'
          });
          setFirstName('');
          setLastName('');
          setCompanionName('Pixel');
          setCaregiverName('');
          setCaregiverPhone('');
          setCaregiverEmail('');
          setCaregiverOrgName('');
          setCaregiverOrgPhone('');
          setCaregiverOrgEmail('');
          setVoiceEnabled(true);
          setVoiceInputEnabled(true);
          
          // Set default voice type
          VoiceService.setVoiceType('female');
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    }
  };

  const handleOpenReminders = () => {
    router.push('/Reminders/ShowReminderOptionsScreen');
  };

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim() || !companionName.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: authUser.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          companion_name: companionName.trim(),
          caregiver_name: caregiverName.trim() || null,
          caregiver_phone: caregiverPhone.trim() || null,
          caregiver_email: caregiverEmail.trim() || null,
          caregiver_org_name: caregiverOrgName.trim() || null,
          caregiver_org_phone: caregiverOrgPhone.trim() || null,
          caregiver_org_email: caregiverOrgEmail.trim() || null,
          //voice_enabled: voiceEnabled,
        });

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully');
      setIsEditing(false);
      fetchUserProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
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

  const handleClearCaregiver = async () => {
    Alert.alert(
      'Remove caregiver',
      'Remove caregiver contact from your profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { data: { user: authUser } } = await supabase.auth.getUser();
              if (!authUser) return;
              await supabase
                .from('profiles')
                .upsert({
                  id: authUser.id,
                  caregiver_name: null,
                  caregiver_phone: null,
                  caregiver_email: null,
                });
              setCaregiverName('');
              setCaregiverPhone('');
              setCaregiverEmail('');
              Alert.alert('Removed', 'Caregiver contact removed.');
            } catch (err) {
              console.error('Error removing caregiver:', err);
              Alert.alert('Error', 'Failed to remove caregiver.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleClearSecondaryCaregiver = async () => {
    Alert.alert(
      'Remove secondary caregiver',
      'Remove secondary/organization caregiver contact from your profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { data: { user: authUser } } = await supabase.auth.getUser();
              if (!authUser) return;
              await supabase
                .from('profiles')
                .upsert({
                  id: authUser.id,
                  caregiver_org_name: null,
                  caregiver_org_phone: null,
                  caregiver_org_email: null,
                });
              setCaregiverOrgName('');
              setCaregiverOrgPhone('');
              setCaregiverOrgEmail('');
              Alert.alert('Removed', 'Secondary caregiver contact removed.');
            } catch (err) {
              console.error('Error removing secondary caregiver:', err);
              Alert.alert('Error', 'Failed to remove secondary caregiver.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { data: { user: authUser } } = await supabase.auth.getUser();
              if (authUser) {
                // Delete profile first
                const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                  .eq('id', authUser.id);

                if (profileError) {
                  console.error('Error deleting profile:', profileError);
                }

                // Note: User deletion requires admin privileges
                // For now, we'll just delete the profile and sign out
                console.log('Profile deleted. User account deletion requires admin privileges.');
              }

              Alert.alert('Success', 'Account deleted successfully');
              router.replace('/signin');
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const openPrivacyPolicy = () => {
    router.push('/privacy');
  };

  const openTermsOfService = () => {
    router.push('/terms');
  };

  const openSupport = () => {
    router.push('/support');
  };

  const openAbout = () => {
    router.push('/about');
  };

  const handleForgotPassword = async () => {
    if (!authUser?.email) {
      Alert.alert('Error', 'Email address not found');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(authUser.email, {
        redirectTo: 'https://www.hellopoco.app/reset-password',
        emailRedirectTo: 'https://www.hellopoco.app/reset-password',
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert(
        'Reset Link Sent', 
        'Check your email for a password reset link. Click the link to reset your password within the app.',
        [
          { text: 'OK', onPress: () => console.log('Password reset email sent') }
        ]
      );
    } catch (error) {
      console.error('Password reset error:', error);
      Alert.alert('Error', 'Failed to send password reset email. Please try again.');
    }
  };

  const handleVoiceChange = async (voiceType, enabled) => {
    try {
      // Update voice service
      VoiceService.setVoiceType(voiceType);
      setVoiceEnabled(enabled);
      
      // Save to database
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await supabase
          .from('profiles')
          .upsert({
            id: authUser.id,
            voice_enabled: enabled,
            voice_type: voiceType
          });
      }
      
      console.log(`Voice changed to: ${voiceType}, enabled: ${enabled}`);
    } catch (error) {
      console.error('Error saving voice settings:', error);
      Alert.alert('Error', 'Failed to save voice settings');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#10B981" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile & Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          <View style={styles.settingsCard}>
            <View style={styles.profileHeader}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditing(!isEditing)}
              >
                <Ionicons name={isEditing ? "close" : "create"} size={20} color="#10b981" />
                <Text style={styles.editButtonText}>
                  {isEditing ? 'Cancel' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>

            {isEditing ? (
              <View style={styles.editForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <TextInput
                    style={styles.input}
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Enter first name"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <TextInput
                    style={styles.input}
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Enter last name"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Companion Name</Text>
                  <TextInput
                    style={styles.input}
                    value={companionName}
                    onChangeText={setCompanionName}
                    placeholder="Enter companion name"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Caregiver Name</Text>
                  <TextInput
                    style={styles.input}
                    value={caregiverName}
                    onChangeText={setCaregiverName}
                    placeholder="Enter caregiver name"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Caregiver Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={caregiverPhone}
                    onChangeText={setCaregiverPhone}
                    placeholder="Enter caregiver phone"
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Caregiver Email</Text>
                  <TextInput
                    style={styles.input}
                    value={caregiverEmail}
                    onChangeText={setCaregiverEmail}
                    placeholder="Enter caregiver email"
                    placeholderTextColor="#9ca3af"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>


                <TouchableOpacity
                  style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                  onPress={handleSaveProfile}
                  disabled={loading}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.profileInfo}>
                <Text style={styles.nameText}>
                  {firstName || 'Not set'} {lastName || ''}
                </Text>
                <Text style={styles.emailText}>{authUser?.email || 'Loading...'}</Text>
                <Text style={styles.companionText}>
                  Your AI Companion: <Text style={styles.companionName}>{companionName || 'Pixel'}</Text>
                </Text>
                <View style={styles.caregiverCard}>
                  <View style={styles.caregiverHeader}>
                    <Text style={styles.caregiverTitle}>Caregiver contact</Text>
                    {caregiverName || caregiverPhone || caregiverEmail ? (
                      <TouchableOpacity onPress={handleClearCaregiver} style={styles.caregiverAction}>
                        <Ionicons name="trash" size={18} color="#ef4444" />
                        <Text style={[styles.caregiverActionText, { color: '#ef4444' }]}>Remove</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.caregiverAction}>
                        <Ionicons name="add" size={18} color="#10b981" />
                        <Text style={styles.caregiverActionText}>Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {caregiverName || caregiverPhone || caregiverEmail ? (
                    <>
                      <Text style={styles.caregiverText}>{caregiverName || 'Not set'}</Text>
                      <Text style={styles.caregiverText}>{caregiverPhone || 'Phone not set'}</Text>
                      <Text style={styles.caregiverText}>{caregiverEmail || 'Email not set'}</Text>
                    </>
                  ) : (
                    <Text style={styles.caregiverText}>No caregiver on file. Tap Add to set one.</Text>
                  )}
                </View>

                <View style={styles.caregiverCard}>
                  <View style={styles.caregiverHeader}>
                    <Text style={styles.caregiverTitle}>Secondary / Org caregiver</Text>
                    {caregiverOrgName || caregiverOrgPhone || caregiverOrgEmail ? (
                      <TouchableOpacity onPress={handleClearSecondaryCaregiver} style={styles.caregiverAction}>
                        <Ionicons name="trash" size={18} color="#ef4444" />
                        <Text style={[styles.caregiverActionText, { color: '#ef4444' }]}>Remove</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.caregiverAction}>
                        <Ionicons name="add" size={18} color="#10b981" />
                        <Text style={styles.caregiverActionText}>Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {caregiverOrgName || caregiverOrgPhone || caregiverOrgEmail ? (
                    <>
                      <Text style={styles.caregiverText}>{caregiverOrgName || 'Not set'}</Text>
                      <Text style={styles.caregiverText}>{caregiverOrgPhone || 'Phone not set'}</Text>
                      <Text style={styles.caregiverText}>{caregiverOrgEmail || 'Email not set'}</Text>
                    </>
                  ) : (
                    <Text style={styles.caregiverText}>No secondary caregiver on file. Tap Add to set one.</Text>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/chat')}>
              <View style={styles.quickActionContent}>
                <Ionicons name="chatbubbles" size={24} color="#10b981" />
                <Text style={styles.quickActionText}>Chat with {companionName || 'Pixel'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminders</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.quickActionButton} onPress={handleOpenReminders}>
              <Ionicons name="alarm" size={24} color="#10b981" />
              <Text style={styles.menuItemText}>Manage Reminders</Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proactive Preferences</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="calendar-clear" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Frequency</Text>
                  <Text style={styles.settingDescription}>How often PoCo checks in</Text>
                </View>
              </View>
            </View>
            <View style={styles.choiceRow}>
              <TouchableOpacity
                style={[styles.choiceButton, proactiveFrequency === 'daily' && styles.choiceButtonActive]}
                onPress={() => setProactiveFrequency('daily')}
              >
                <Text style={[styles.choiceText, proactiveFrequency === 'daily' && styles.choiceTextActive]}>Daily</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.choiceButton, proactiveFrequency === 'weekly' && styles.choiceButtonActive]}
                onPress={() => setProactiveFrequency('weekly')}
              >
                <Text style={[styles.choiceText, proactiveFrequency === 'weekly' && styles.choiceTextActive]}>Weekly</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="moon" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Quiet Hours</Text>
                  <Text style={styles.settingDescription}>No SMS during these times</Text>
                </View>
              </View>
            </View>
            <View style={styles.inlineInputs}>
              <TouchableOpacity
                style={[styles.input, styles.inlineInput, styles.timeInput]}
                onPress={() => setShowQuietStartPicker(true)}
              >
                <Text style={styles.timeInputText}>{quietStart}</Text>
              </TouchableOpacity>
              <Text style={styles.inlineLabel}>to</Text>
              <TouchableOpacity
                style={[styles.input, styles.inlineInput, styles.timeInput]}
                onPress={() => setShowQuietEndPicker(true)}
              >
                <Text style={styles.timeInputText}>{quietEnd}</Text>
              </TouchableOpacity>
            </View>

            {Platform.OS === 'android' && showQuietStartPicker && (
              <DateTimePicker
                value={quietStartDate}
                mode="time"
                display="default"
                onChange={(_, selected) => {
                  setShowQuietStartPicker(false);
                  if (!selected) return;
                  setQuietStartDate(selected);
                  setQuietStart(formatTime(selected));
                }}
              />
            )}

            {Platform.OS === 'android' && showQuietEndPicker && (
              <DateTimePicker
                value={quietEndDate}
                mode="time"
                display="default"
                onChange={(_, selected) => {
                  setShowQuietEndPicker(false);
                  if (!selected) return;
                  setQuietEndDate(selected);
                  setQuietEnd(formatTime(selected));
                }}
              />
            )}

            {Platform.OS === 'ios' && (
              <>
                <Modal
                  visible={showQuietStartPicker}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setShowQuietStartPicker(false)}
                >
                  <View style={styles.pickerModalOverlay}>
                    <View style={styles.pickerContainer}>
                      <View style={styles.pickerHeader}>
                        <TouchableOpacity onPress={() => setShowQuietStartPicker(false)}>
                          <Text style={styles.pickerDoneText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={quietStartDate}
                        mode="time"
                        display="spinner"
                        onChange={(_, selected) => {
                          if (!selected) return;
                          setQuietStartDate(selected);
                          setQuietStart(formatTime(selected));
                        }}
                      />
                    </View>
                  </View>
                </Modal>

                <Modal
                  visible={showQuietEndPicker}
                  transparent
                  animationType="slide"
                  onRequestClose={() => setShowQuietEndPicker(false)}
                >
                  <View style={styles.pickerModalOverlay}>
                    <View style={styles.pickerContainer}>
                      <View style={styles.pickerHeader}>
                        <TouchableOpacity onPress={() => setShowQuietEndPicker(false)}>
                          <Text style={styles.pickerDoneText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={quietEndDate}
                        mode="time"
                        display="spinner"
                        onChange={(_, selected) => {
                          if (!selected) return;
                          setQuietEndDate(selected);
                          setQuietEnd(formatTime(selected));
                        }}
                      />
                    </View>
                  </View>
                </Modal>
              </>
            )}

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="newspaper" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>News Updates</Text>
                  <Text style={styles.settingDescription}>Headlines via SMS</Text>
                </View>
              </View>
              <Switch
                value={topicNews}
                onValueChange={setTopicNews}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor="#ffffff"
              />
            </View>
            {topicNews ? (
              <View style={styles.preferenceGroup}>
                <Text style={styles.inputLabel}>Keywords (comma separated)</Text>
                <TextInput
                  style={styles.input}
                  value={newsKeywords}
                  onChangeText={setNewsKeywords}
                  placeholder="health, tech, science"
                  placeholderTextColor="#9ca3af"
                />
                <Text style={styles.inputLabel}>RSS Sources (comma separated)</Text>
                <TextInput
                  style={styles.input}
                  value={newsRss}
                  onChangeText={setNewsRss}
                  placeholder="https://example.com/rss"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            ) : null}

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="game-controller" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Games</Text>
                  <Text style={styles.settingDescription}>Trivia, word, memory</Text>
                </View>
              </View>
              <Switch
                value={topicGames}
                onValueChange={setTopicGames}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="gift" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Important Dates</Text>
                  <Text style={styles.settingDescription}>Birthdays & anniversaries</Text>
                </View>
              </View>
              <Switch
                value={topicImportantDates}
                onValueChange={setTopicImportantDates}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor="#ffffff"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, prefLoading && styles.saveButtonDisabled]}
              onPress={handleSaveProactivePreferences}
              disabled={prefLoading}
            >
              <Text style={styles.saveButtonText}>{prefLoading ? 'Saving...' : 'Save Preferences'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Companion Settings</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="volume-high" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Voice Responses</Text>
                  <Text style={styles.settingDescription}>
                    {voiceEnabled ? 'Companion will speak responses' : 'Text-only responses'}
                  </Text>
                </View>
              </View>
              <Switch
                value={voiceEnabled}
                onValueChange={async (value) => {
                  setVoiceEnabled(value);
                  // Save to database
                  try {
                    const { data: { user: authUser } } = await supabase.auth.getUser();
                    if (authUser) {
                      await supabase
                        .from('profiles')
                        .update({ voice_enabled: value })
                        .eq('id', authUser.id);
                    }
                  } catch (error) {
                    console.error('Error saving voice preference:', error);
                  }
                }}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor={voiceEnabled ? '#ffffff' : '#ffffff'}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="mic" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Voice Input</Text>
                  <Text style={styles.settingDescription}>
                    {voiceInputEnabled ? 'Speak to your companion' : 'Text input only'}
                  </Text>
                </View>
              </View>
              <Switch
                value={voiceInputEnabled}
                onValueChange={async (value) => {
                  setVoiceInputEnabled(value);
                  // Save to database
                  try {
                    const { data: { user: authUser } } = await supabase.auth.getUser();
                    if (authUser) {
                      await supabase
                        .from('profiles')
                        .update({ voice_input_enabled: value })
                        .eq('id', authUser.id);
                    }
                  } catch (error) {
                    console.error('Error saving voice input preference:', error);
                  }
                }}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor={voiceInputEnabled ? '#ffffff' : '#ffffff'}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Settings</Text>
          <View style={styles.settingsCard}>
            <VoiceSelector 
              onVoiceChange={handleVoiceChange}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="analytics" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Analytics</Text>
                  <Text style={styles.settingDescription}>
                    Help us improve by sharing anonymous usage data
                  </Text>
                </View>
              </View>
              <Switch
                value={analytics}
                onValueChange={setAnalytics}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor={analytics ? '#ffffff' : '#ffffff'}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Receive notifications about your companion
                  </Text>
                </View>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#d1d5db', true: '#10b981' }}
                thumbColor={notifications ? '#ffffff' : '#ffffff'}
              />
            </View>
          </View>
        </View>



        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.forgotPasswordButton} 
            onPress={handleForgotPassword}
          >
            <Ionicons name="key" size={24} color="#10b981" />
            <Text style={styles.forgotPasswordText}>Reset Password</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Legal</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.menuItem} onPress={openPrivacyPolicy}>
              <Ionicons name="shield-checkmark" size={24} color="#10b981" />
              <Text style={styles.menuItemText}>Privacy Policy</Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={openTermsOfService}>
              <Ionicons name="document-text" size={24} color="#10b981" />
              <Text style={styles.menuItemText}>Terms of Service</Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.menuItem} onPress={openSupport}>
              <Ionicons name="help-circle" size={24} color="#10b981" />
              <Text style={styles.menuItemText}>Support</Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={openAbout}>
              <Ionicons name="information-circle" size={24} color="#10b981" />
              <Text style={styles.menuItemText}>About PoCo</Text>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out" size={24} color="#ef4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
            <TouchableOpacity 
              style={[styles.deleteAccountButton, loading && styles.deleteAccountButtonDisabled]} 
              onPress={handleDeleteAccount}
              disabled={loading}
            >
            <Ionicons name="trash" size={24} color="#ef4444" />
              <Text style={styles.deleteAccountText}>
                {loading ? 'Deleting Account...' : 'Delete Account'}
              </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 32,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  editButtonText: {
    marginLeft: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  profileInfo: {
    alignItems: 'center',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  companionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  companionName: {
    color: '#10b981',
    fontWeight: '600',
  },
  caregiverCard: {
    marginTop: 8,
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
    width: '100%',
  },
  caregiverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  caregiverTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  caregiverText: {
    fontSize: 14,
    color: '#1f2937',
    marginTop: 2,
  },
  caregiverAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  caregiverActionText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
  },
  editForm: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  choiceButton: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#f3f4f6',
  },
  choiceButtonActive: {
    backgroundColor: '#10b981',
  },
  choiceText: {
    color: '#374151',
    fontWeight: '600',
  },
  choiceTextActive: {
    color: '#fff',
  },
  inlineInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  inlineInput: {
    flex: 1,
  },
  inlineLabel: {
    color: '#6b7280',
    fontWeight: '600',
  },
  timeInput: {
    justifyContent: 'center',
  },
  timeInputText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pickerDoneText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  preferenceGroup: {
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  deleteAccountButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  deleteAccountText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  forgotPasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#10b981',
    gap: 8,
  },
  forgotPasswordText: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    gap: 8,
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 12,
    flex: 1,
  },
});
