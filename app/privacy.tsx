import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Introduction</Text>
          <Text style={styles.text}>
            Welcome to PoCo ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI companion app.
          </Text>
          <Text style={styles.text}>
            By using PoCo, you agree to the collection and use of information in accordance with this policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information We Collect</Text>
          
          <Text style={styles.subsectionTitle}>Information You Provide</Text>
          <Text style={styles.text}>
            • Account Information: Email address, first name, last name{'\n'}
            • Profile Information: Companion name, communication preferences{'\n'}
            • Message Metadata: Timestamps and message IDs (message content is encrypted and private)
          </Text>

          <Text style={styles.subsectionTitle}>Information Automatically Collected</Text>
          <Text style={styles.text}>
            • Device Information: Device type, operating system, app version{'\n'}
            • Usage Data: App usage patterns, feature interactions{'\n'}
            • Technical Data: IP address, browser type, access times
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How We Use Your Information</Text>
          <Text style={styles.text}>
            • Provide and maintain the PoCo service{'\n'}
            • Personalize your AI companion experience{'\n'}
            • Improve our app functionality and user experience{'\n'}
            • Send important updates and notifications{'\n'}
            • Ensure app security and prevent fraud{'\n'}
            • Comply with legal obligations
          </Text>
        </View>

        <Card style={styles.highlightCard}>
          <Card.Content>
            <Text style={styles.highlightTitle}>🔐 End-to-End Encryption</Text>
            <Text style={styles.highlightText}>
              PoCo uses end-to-end encryption to ensure your conversations remain completely private:
            </Text>
            <Text style={styles.highlightText}>
              • Messages are encrypted on your device before transmission{'\n'}
              • Only you can decrypt and read your conversations{'\n'}
              • We cannot access or read your message content{'\n'}
              • Encryption keys are stored locally on your device
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sharing and Disclosure</Text>
          <Text style={styles.text}>
            We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
          </Text>
          <Text style={styles.text}>
            • With your explicit consent{'\n'}
            • To comply with legal requirements{'\n'}
            • To protect our rights and safety{'\n'}
            • With trusted service providers who assist in app operations
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Security</Text>
          <Text style={styles.text}>
            We implement appropriate security measures to protect your information:
          </Text>
          <Text style={styles.text}>
            • End-to-end encryption for all messages{'\n'}
            • Secure data transmission using HTTPS{'\n'}
            • Regular security audits and updates{'\n'}
            • Limited access to personal information
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Retention</Text>
          <Text style={styles.text}>
            We retain your information only as long as necessary:
          </Text>
          <Text style={styles.text}>
            • Account information: Until you delete your account{'\n'}
            • Message metadata: 30 days after account deletion{'\n'}
            • Usage data: 12 months for analytics purposes
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rights</Text>
          <Text style={styles.text}>
            You have the right to:
          </Text>
          <Text style={styles.text}>
            • Access your personal information{'\n'}
            • Correct inaccurate information{'\n'}
            • Request deletion of your data{'\n'}
            • Opt-out of marketing communications{'\n'}
            • Export your data (where technically feasible)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Children's Privacy</Text>
          <Text style={styles.text}>
            PoCo is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to This Policy</Text>
          <Text style={styles.text}>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.text}>
            If you have any questions about this Privacy Policy, please contact us:
          </Text>
          <Card style={styles.contactCard}>
            <Card.Content>
              <Text style={styles.contactText}>
                <Text style={styles.contactLabel}>Email:</Text> lata@hellopoco.app{'\n'}
                <Text style={styles.contactLabel}>Website:</Text> www.hellopoco.app{'\n'}
                <Text style={styles.contactLabel}>Support:</Text> Available in the app
              </Text>
            </Card.Content>
          </Card>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#047857',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  highlightCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    borderWidth: 1,
    marginBottom: 24,
  },
  highlightTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 8,
  },
  highlightText: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
    marginBottom: 8,
  },
  contactCard: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  contactText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  contactLabel: {
    fontWeight: '600',
    color: '#1F2937',
  },
}); 