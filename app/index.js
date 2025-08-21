import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function HomeScreen() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    checkAuthAndProfile();
  }, []);

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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
});
