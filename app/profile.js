import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VoiceSelector from '../components/VoiceSelector';
import { supabase } from '../lib/supabase';
import { VoiceService } from '../lib/voiceService';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companionName, setCompanionName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [dataCollection, setDataCollection] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceInputEnabled, setVoiceInputEnabled] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

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
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.quickActionButton} onPress={() => router.push('/chat')}>
              <View style={styles.settingInfo}>
                <Ionicons name="chatbubbles" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Chat with {companionName || 'Pixel'}</Text>
                  <Text style={styles.settingDescription}>Start a conversation with your AI companion</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminders</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/Reminders/ReminderOnBoardingScreen')}>
              <View style={styles.settingInfo}>
                <Ionicons name="medkit" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Manage Medications</Text>
                  {/* <Text style={styles.settingDescription}>Add, edit, or remove your medication reminders</Text> */}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
 
            <View style={styles.divider} />
 
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/reminder-settings')}>
              <View style={styles.settingInfo}>
                <Ionicons name="time" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Appointments</Text>
                  {/* <Text style={styles.settingDescription}>Configure medication and other reminders</Text> */}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/reminder-settings')}>
              <View style={styles.settingInfo}>
                <Ionicons name="calendar" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Important Dates</Text>
                  {/* <Text style={styles.settingDescription}>Configure medication and other reminders</Text> */}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
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
    paddingBottom: 20,
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
    paddingVertical: 12,
    paddingHorizontal: 0,
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
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 12,
    flex: 1,
  },
  menuIcon: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
});
