import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, List, Divider, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();

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
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const navigateToProfile = () => {
    router.push('/profile');
  };

  const navigateToPrivacy = () => {
    router.push('/privacy');
  };

  const navigateToTerms = () => {
    router.push('/terms');
  };

  const navigateToSupport = () => {
    router.push('/support');
  };

  const navigateToAbout = () => {
    router.push('/about');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage your PoCo experience</Text>
        </View>

        {/* Security Status Card */}
        <Card style={styles.securityCard}>
          <Card.Content>
            <View style={styles.securityHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#10B981" />
              <Text style={styles.securityTitle}>🔐 End-to-End Encryption Active</Text>
            </View>
            <Text style={styles.securityDescription}>
              Your conversations with Pixel are encrypted with AES-256 encryption. 
              Only you can read your messages - not even our servers can access them.
            </Text>
            <View style={styles.securityBadge}>
              <Text style={styles.securityBadgeText}>🔒 Messages Encrypted</Text>
            </View>
            <View style={styles.securityFeatures}>
              <View style={styles.securityFeature}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.securityFeatureText}>Client-side encryption</Text>
              </View>
              <View style={styles.securityFeature}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.securityFeatureText}>Server cannot read messages</Text>
              </View>
              <View style={styles.securityFeature}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.securityFeatureText}>User-specific keys</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Account Settings */}
        <List.Section>
          <List.Subheader style={styles.sectionHeader}>Account</List.Subheader>
          <TouchableOpacity onPress={navigateToProfile}>
            <List.Item
              title="Profile"
              description="Manage your personal information"
              left={(props) => <List.Icon {...props} icon="account" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </TouchableOpacity>
        </List.Section>

        <Divider />

        {/* Privacy & Security */}
        <List.Section>
          <List.Subheader style={styles.sectionHeader}>Privacy & Security</List.Subheader>
          <TouchableOpacity onPress={navigateToPrivacy}>
            <List.Item
              title="Privacy Policy"
              description="How we protect your data"
              left={(props) => <List.Icon {...props} icon="shield" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </TouchableOpacity>
        </List.Section>

        <Divider />

        {/* Support & Legal */}
        <List.Section>
          <List.Subheader style={styles.sectionHeader}>Support & Legal</List.Subheader>
          <TouchableOpacity onPress={navigateToTerms}>
            <List.Item
              title="Terms of Service"
              description="Our terms and conditions"
              left={(props) => <List.Icon {...props} icon="file-document" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={navigateToSupport}>
            <List.Item
              title="Support"
              description="Get help and contact us"
              left={(props) => <List.Icon {...props} icon="help-circle" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={navigateToAbout}>
            <List.Item
              title="About PoCo"
              description="Version and app information"
              left={(props) => <List.Icon {...props} icon="information" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </TouchableOpacity>
        </List.Section>

        <Divider />

        {/* Sign Out */}
        <List.Section>
          <TouchableOpacity onPress={handleSignOut}>
            <List.Item
              title="Sign Out"
              description="Sign out of your account"
              left={(props) => <List.Icon {...props} icon="logout" color="#EF4444" />}
              titleStyle={{ color: '#EF4444' }}
            />
          </TouchableOpacity>
        </List.Section>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>POCO v1.0.0</Text>
          <Text style={styles.versionSubtext}>Your private AI companion</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  securityCard: {
    margin: 20,
    marginTop: 10,
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    borderWidth: 1,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 8,
  },
  securityDescription: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
    marginBottom: 12,
  },
  securityBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  securityBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  securityFeatures: {
    marginTop: 12,
  },
  securityFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  securityFeatureText: {
    fontSize: 14,
    color: '#047857',
    marginLeft: 8,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    backgroundColor: 'transparent',
  },
  versionContainer: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  versionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  versionSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
}); 