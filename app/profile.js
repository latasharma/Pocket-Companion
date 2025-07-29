import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';
import { aiService } from '../lib/aiService';

export default function ProfileScreen() {
  console.log('Profile screen loaded - version 3.0'); // Test log
  
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companionName, setCompanionName] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Privacy settings
  const [dataCollection, setDataCollection] = useState(true);
  const [analytics, setAnalytics] = useState(true);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setUser(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setCompanionName(data.companion_name || '');
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
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          companion_name: companionName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

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
    console.log('Sign out button pressed'); // Debug log
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            console.log('User confirmed sign out'); // Debug log
            try {
              console.log('Calling supabase.auth.signOut()'); // Debug log
              await supabase.auth.signOut();
              console.log('Sign out successful, navigating to signin'); // Debug log
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

  const openPrivacyPolicy = () => {
    router.push('/privacy');
  };

  const openTermsOfService = () => {
    router.push('/terms');
  };

  const openSupport = () => {
    router.push('/support');
  };

  const openFAQ = () => {
    router.push('/support');
  };

  const navigateToChat = () => {
    router.push('/(tabs)/chat');
  };

  const handleDeleteAccount = async () => {
    // First confirmation
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action will permanently delete:\n\n• Your profile information\n• All conversation history\n• Your AI companion settings\n• All stored data\n\nThis action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Final Confirmation',
              'This is your final warning. Deleting your account will permanently remove all your data and cannot be undone. Are you absolutely sure?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      setLoading(true);
                      console.log('Starting account deletion process...');
                      
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) {
                        Alert.alert('Error', 'User not found');
                        return;
                      }

                      // Delete conversation history
                      console.log('Deleting conversation history...');
                      const { error: messagesError } = await supabase
                        .from('messages')
                        .delete()
                        .eq('user_id', user.id);
                      
                      if (messagesError) {
                        console.error('Error deleting messages:', messagesError);
                      }

                      // Delete user profile
                      console.log('Deleting user profile...');
                      const { error: profileError } = await supabase
                        .from('profiles')
                        .delete()
                        .eq('id', user.id);
                      
                      if (profileError) {
                        console.error('Error deleting profile:', profileError);
                      }

                      // Delete auth account
                      console.log('Deleting auth account...');
                      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
                      
                      if (authError) {
                        console.error('Error deleting auth account:', authError);
                        // If admin delete fails, try user-initiated deletion
                        const { error: userDeleteError } = await supabase.auth.admin.deleteUser(user.id);
                        if (userDeleteError) {
                          console.error('User-initiated deletion also failed:', userDeleteError);
                          Alert.alert(
                            'Account Deletion Issue',
                            'We encountered an issue deleting your account. Please contact support at support@poco.ai for assistance.',
                            [
                              { text: 'OK', onPress: () => router.replace('/signin') }
                            ]
                          );
                          return;
                        }
                      }

                      console.log('Account deletion completed successfully');
                      Alert.alert(
                        'Account Deleted',
                        'Your account has been permanently deleted. Thank you for using POCO.',
                        [
                          { text: 'OK', onPress: () => router.replace('/signin') }
                        ]
                      );
                    } catch (error) {
                      console.error('Error during account deletion:', error);
                      Alert.alert(
                        'Error',
                        'An error occurred while deleting your account. Please contact support at support@poco.ai for assistance.',
                        [
                          { text: 'OK', onPress: () => router.replace('/signin') }
                        ]
                      );
                    } finally {
                      setLoading(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile & Settings</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Text style={styles.editButtonText}>
              {isEditing ? 'Cancel' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Profile Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Information</Text>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <Image
                source={require('../assets/poco-avatar.png')}
                style={styles.avatar}
              />
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
                  {firstName} {lastName}
                </Text>
                <Text style={styles.emailText}>{user.email}</Text>
                <Text style={styles.companionText}>
                  Your AI Companion: <Text style={styles.companionName}>{companionName}</Text>
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="shield-checkmark" size={24} color="#00B686" style={styles.settingIcon} />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Data Collection</Text>
                  <Text style={styles.settingSubtitle}>Help improve the app with anonymous usage data</Text>
                </View>
              </View>
              <Switch
                value={dataCollection}
                onValueChange={setDataCollection}
                trackColor={{ false: '#e5e7eb', true: '#00B686' }}
                thumbColor={dataCollection ? '#ffffff' : '#f3f4f6'}
              />
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="analytics" size={24} color="#00B686" style={styles.settingIcon} />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Analytics</Text>
                  <Text style={styles.settingSubtitle}>Share app usage analytics</Text>
                </View>
              </View>
              <Switch
                value={analytics}
                onValueChange={setAnalytics}
                trackColor={{ false: '#e5e7eb', true: '#00B686' }}
                thumbColor={analytics ? '#ffffff' : '#f3f4f6'}
              />
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications" size={24} color="#00B686" style={styles.settingIcon} />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Push Notifications</Text>
                  <Text style={styles.settingSubtitle}>Receive important updates and reminders</Text>
                </View>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#e5e7eb', true: '#00B686' }}
                thumbColor={notifications ? '#ffffff' : '#f3f4f6'}
              />
            </View>
          </View>
        </View>

        {/* Communication Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Communication Preferences</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem} onPress={navigateToChat}>
              <View style={styles.settingLeft}>
                <Ionicons name="chatbubbles" size={24} color="#00B686" style={styles.settingIcon} />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Start Chat</Text>
                  <Text style={styles.settingSubtitle}>Chat with Pixel, your AI companion</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="settings" size={24} color="#00B686" style={styles.settingIcon} />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Chat Mode</Text>
                  <Text style={styles.settingSubtitle}>
                    {user.communication_mode === 'voice' ? 'Voice Mode' : 'Text Mode'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    'Update Communication Mode',
                    'To change your communication preferences, please complete onboarding again.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Go to Onboarding', onPress: () => router.push('/onboarding') }
                    ]
                  );
                }}
              >
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            
            {user.communication_mode === 'voice' && (
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="mic" size={24} color="#00B686" style={styles.settingIcon} />
                  <View style={styles.settingText}>
                    <Text style={styles.settingTitle}>Voice Accent</Text>
                    <Text style={styles.settingSubtitle}>{user.accent || 'American'}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            )}
          </View>
        </View>

        {/* Help & Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem} onPress={openFAQ}>
              <View style={styles.settingLeft}>
                <Ionicons name="help-circle" size={24} color="#00B686" style={styles.settingIcon} />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>FAQ</Text>
                  <Text style={styles.settingSubtitle}>Frequently asked questions</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.settingItem} onPress={openSupport}>
              <View style={styles.settingLeft}>
                <Ionicons name="mail" size={24} color="#00B686" style={styles.settingIcon} />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Contact Support</Text>
                  <Text style={styles.settingSubtitle}>Get help from our team</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.settingItem} onPress={() => Alert.alert('About', 'AI Pocket Companion v1.0.0\n\nYour personal AI companion for meaningful conversations and support.')}>
              <View style={styles.settingLeft}>
                <Ionicons name="information-circle" size={24} color="#00B686" style={styles.settingIcon} />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>About</Text>
                  <Text style={styles.settingSubtitle}>App version and information</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Memory Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Memory & Data</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity 
              style={styles.settingItem} 
              onPress={() => {
                Alert.alert(
                  'Clear Memory',
                  'This will delete all conversation history and reset your AI companion\'s memory. This action cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear Memory',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await aiService.clearMemory(user.id);
                          Alert.alert('Success', 'Memory cleared successfully. Your AI companion will start fresh.');
                        } catch (error) {
                          console.error('Error clearing memory:', error);
                          Alert.alert('Error', 'Failed to clear memory. Please try again.');
                        }
                      },
                    },
                  ]
                );
              }}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="trash" size={24} color="#dc2626" style={styles.settingIcon} />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: '#dc2626' }]}>Clear Memory</Text>
                  <Text style={styles.settingSubtitle}>Delete conversation history</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Account Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Management</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity 
              style={[styles.settingItem, styles.deleteAccountItem]} 
              onPress={handleDeleteAccount}
              disabled={loading}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="trash" size={24} color="#dc2626" style={styles.settingIcon} />
                <View style={styles.settingText}>
                  <Text style={[styles.settingTitle, { color: '#dc2626' }]}>
                    {loading ? 'Deleting Account...' : 'Delete Account'}
                  </Text>
                  <Text style={styles.settingSubtitle}>Permanently delete your account and all data</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem} onPress={openPrivacyPolicy}>
              <View style={styles.settingLeft}>
                <Ionicons name="document-text" size={24} color="#00B686" style={styles.settingIcon} />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Privacy Policy</Text>
                  <Text style={styles.settingSubtitle}>How we protect your data</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.settingItem} onPress={openTermsOfService}>
              <View style={styles.settingLeft}>
                <Ionicons name="document" size={24} color="#00B686" style={styles.settingIcon} />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Terms of Service</Text>
                  <Text style={styles.settingSubtitle}>App usage terms and conditions</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out" size={24} color="#dc2626" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  scrollView: {
    flex: 1,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00B686',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#00B686',
    borderRadius: 8,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
    fontWeight: '600',
    color: '#00B686',
  },
  editForm: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
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
    backgroundColor: '#00B686',
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
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 20,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 40,
  },
  deleteAccountItem: {
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 4,
    marginVertical: 4,
  },
});
