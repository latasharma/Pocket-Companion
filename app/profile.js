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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companionName, setCompanionName] = useState('');
  const [loading, setLoading] = useState(false);
  
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
              router.replace('/auth');
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
              const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', user.id);

              if (error) throw error;

              await supabase.auth.signOut();
              router.replace('/auth');
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

  const openFAQ = () => {
    router.push('/about');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile & Settings</Text>
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
                  {firstName} {lastName}
                </Text>
                <Text style={styles.emailText}>{user?.email}</Text>
                <Text style={styles.companionText}>
                  Your AI Companion: <Text style={styles.companionName}>{companionName}</Text>
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/chat')}>
              <View style={styles.settingLeft}>
                <Ionicons name="chatbubbles" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Chat with {companionName}</Text>
                  <Text style={styles.settingSubtitle}>Start a conversation with your AI companion</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medication Management</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/medication-onboarding')}>
              <View style={styles.settingLeft}>
                <Ionicons name="medical" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Manage Medications</Text>
                  <Text style={styles.settingSubtitle}>Add, edit, or remove your medication reminders</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/reminder-choice')}>
              <View style={styles.settingLeft}>
                <Ionicons name="alarm" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Reminder Settings</Text>
                  <Text style={styles.settingSubtitle}>Configure medication and other reminders</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy Settings</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="shield-checkmark" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Data Collection</Text>
                  <Text style={styles.settingSubtitle}>Help improve the app with anonymous usage data</Text>
                </View>
              </View>
              <Switch
                value={dataCollection}
                onValueChange={setDataCollection}
                trackColor={{ false: '#e5e7eb', true: '#10b981' }}
                thumbColor={dataCollection ? '#ffffff' : '#f3f4f6'}
              />
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="analytics" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Analytics</Text>
                  <Text style={styles.settingSubtitle}>Share app usage analytics</Text>
                </View>
              </View>
              <Switch
                value={analytics}
                onValueChange={setAnalytics}
                trackColor={{ false: '#e5e7eb', true: '#10b981' }}
                thumbColor={analytics ? '#ffffff' : '#f3f4f6'}
              />
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Push Notifications</Text>
                  <Text style={styles.settingSubtitle}>Receive important updates and reminders</Text>
                </View>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#e5e7eb', true: '#10b981' }}
                thumbColor={notifications ? '#ffffff' : '#f3f4f6'}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem} onPress={openFAQ}>
              <View style={styles.settingLeft}>
                <Ionicons name="help-circle" size={24} color="#10b981" />
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
                <Ionicons name="mail" size={24} color="#10b981" />
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
                <Ionicons name="information-circle" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>About</Text>
                  <Text style={styles.settingSubtitle}>App version and information</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity style={styles.settingItem} onPress={openPrivacyPolicy}>
              <View style={styles.settingLeft}>
                <Ionicons name="document-text" size={24} color="#10b981" />
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
                <Ionicons name="document" size={24} color="#10b981" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Terms of Service</Text>
                  <Text style={styles.settingSubtitle}>App usage terms and conditions</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Management</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity 
              style={[styles.deleteAccountButton, loading && styles.deleteAccountButtonDisabled]} 
              onPress={handleDeleteAccount}
              disabled={loading}
            >
              <Ionicons name="trash" size={24} color="#ffffff" />
              <Text style={styles.deleteAccountText}>
                {loading ? 'Deleting Account...' : 'Delete Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out" size={24} color="#ef4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
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
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
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
});
