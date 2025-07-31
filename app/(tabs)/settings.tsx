import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Alert, Modal } from 'react-native';
import { Text, List, Divider, Card, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

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
    setShowPrivacyModal(true);
  };

  const navigateToTerms = () => {
    setShowTermsModal(true);
  };

  const navigateToSupport = () => {
    setShowSupportModal(true);
  };

  const navigateToAbout = () => {
    Alert.alert('About PoCo', 'PoCo v1.0.0 - Your private AI companion with end-to-end encryption.');
  };

  const PrivacyModal = () => (
    <Modal
      visible={showPrivacyModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Privacy Policy</Text>
          <TouchableOpacity onPress={() => setShowPrivacyModal(false)} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <View style={styles.privacyContent}>
            <Text style={styles.privacySectionTitle}>Your Privacy Matters</Text>
            <Text style={styles.privacyText}>
              PoCo uses end-to-end encryption to ensure your conversations remain completely private.
            </Text>
            
            <Text style={styles.privacySectionTitle}>What We Collect</Text>
            <Text style={styles.privacyText}>
              • Account information (email, name){'\n'}
              • Message metadata (timestamps, IDs){'\n'}
              • Device information for app functionality
            </Text>
            
            <Text style={styles.privacySectionTitle}>What We Don't Collect</Text>
            <Text style={styles.privacyText}>
              • Your actual message content (encrypted){'\n'}
              • Personal conversations{'\n'}
              • Private data beyond what's needed for the service
            </Text>
            
            <Text style={styles.privacySectionTitle}>Contact Us</Text>
            <Text style={styles.privacyText}>
              Email: lata@hellopoco.app{'\n'}
              Website: www.hellopoco.app
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const TermsModal = () => (
    <Modal
      visible={showTermsModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Terms of Service</Text>
          <TouchableOpacity onPress={() => setShowTermsModal(false)} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <View style={styles.privacyContent}>
            <Text style={styles.privacySectionTitle}>Agreement</Text>
            <Text style={styles.privacyText}>
              By using PoCo, you agree to use the service responsibly and not for harmful purposes.
            </Text>
            
            <Text style={styles.privacySectionTitle}>Service Description</Text>
            <Text style={styles.privacyText}>
              PoCo is an AI companion app that provides personalized conversational experiences with end-to-end encryption.
            </Text>
            
            <Text style={styles.privacySectionTitle}>Acceptable Use</Text>
            <Text style={styles.privacyText}>
              • Use responsibly and safely{'\n'}
              • Don't violate laws or rights of others{'\n'}
              • Don't transmit harmful content{'\n'}
              • Don't attempt unauthorized access
            </Text>
            
            <Text style={styles.privacySectionTitle}>Contact</Text>
            <Text style={styles.privacyText}>
              Email: lata@hellopoco.app{'\n'}
              Website: www.hellopoco.app
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const SupportModal = () => (
    <Modal
      visible={showSupportModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Support & Help</Text>
          <TouchableOpacity onPress={() => setShowSupportModal(false)} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <View style={styles.privacyContent}>
            <Text style={styles.privacySectionTitle}>Contact Support</Text>
            <Text style={styles.privacyText}>
              Email: lata@hellopoco.app{'\n'}
              Response time: Within 24 hours
            </Text>
            
            <Text style={styles.privacySectionTitle}>FAQ</Text>
            <Text style={styles.privacyText}>
              <Text style={styles.faqQuestion}>Q: How does PoCo protect my privacy?</Text>{'\n'}
              A: We use end-to-end encryption. Your messages are encrypted and only you can read them.
            </Text>
            
            <Text style={styles.privacyText}>
              <Text style={styles.faqQuestion}>Q: Can I change my companion's name?</Text>{'\n'}
              A: Yes! You can customize your companion's name in Profile & Settings.
            </Text>
            
            <Text style={styles.privacyText}>
              <Text style={styles.faqQuestion}>Q: Is PoCo free to use?</Text>{'\n'}
              A: PoCo offers a free tier with basic features.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

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
          <Text style={styles.versionText}>PoCo v1.0.0</Text>
          <Text style={styles.versionSubtext}>Your private AI companion</Text>
        </View>
      </ScrollView>

      {/* Modals */}
      <PrivacyModal />
      <TermsModal />
      <SupportModal />
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  privacyContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  privacySectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#047857',
    marginTop: 20,
    marginBottom: 8,
  },
  privacyText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  faqQuestion: {
    fontWeight: '600',
    color: '#1F2937',
  },
}); 