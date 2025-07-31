import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SupportScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support & Help</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Support</Text>
          <Text style={styles.text}>
            We're here to help you get the most out of PoCo. If you need assistance, please reach out to us.
          </Text>
        </View>

        <Card style={styles.contactCard}>
          <Card.Content>
            <View style={styles.contactItem}>
              <Ionicons name="mail" size={20} color="#3B82F6" />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email Support</Text>
                <Text style={styles.contactValue}>lata@hellopoco.app</Text>
                <Text style={styles.contactNote}>Response within 24 hours</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        </View>

        <Card style={styles.faqCard}>
          <Card.Content>
            <Text style={styles.faqQuestion}>How does PoCo protect my privacy?</Text>
            <Text style={styles.faqAnswer}>
              PoCo uses end-to-end encryption to ensure your conversations are private. Your messages are encrypted on your device before being sent, and only you can decrypt them. We cannot read your conversations.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.faqCard}>
          <Card.Content>
            <Text style={styles.faqQuestion}>Can I change my companion's name?</Text>
            <Text style={styles.faqAnswer}>
              Yes! You can customize your companion's name in the Profile & Settings section. Your companion is personal to you and can be named whatever you prefer.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.faqCard}>
          <Card.Content>
            <Text style={styles.faqQuestion}>Is PoCo free to use?</Text>
            <Text style={styles.faqAnswer}>
              PoCo offers a free tier with basic features. Premium features may be available for enhanced functionality and extended conversations.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.faqCard}>
          <Card.Content>
            <Text style={styles.faqQuestion}>How do I reset my password?</Text>
            <Text style={styles.faqAnswer}>
              You can reset your password through the sign-in screen. Look for the "Forgot Password" option and follow the instructions sent to your email.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.faqCard}>
          <Card.Content>
            <Text style={styles.faqQuestion}>Can I export my conversations?</Text>
            <Text style={styles.faqAnswer}>
              Due to our end-to-end encryption, we cannot access your message content to export it. However, you can take screenshots of your conversations for personal use.
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Troubleshooting</Text>
          <Text style={styles.text}>
            Common issues and solutions:
          </Text>
        </View>

        <Card style={styles.troubleshootCard}>
          <Card.Content>
            <View style={styles.troubleshootItem}>
              <Ionicons name="warning" size={16} color="#F59E0B" />
              <View style={styles.troubleshootInfo}>
                <Text style={styles.troubleshootTitle}>App won't start</Text>
                <Text style={styles.troubleshootSolution}>Try restarting your device and reinstalling the app</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.troubleshootCard}>
          <Card.Content>
            <View style={styles.troubleshootItem}>
              <Ionicons name="warning" size={16} color="#F59E0B" />
              <View style={styles.troubleshootInfo}>
                <Text style={styles.troubleshootTitle}>Messages not sending</Text>
                <Text style={styles.troubleshootSolution}>Check your internet connection and try again</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.troubleshootCard}>
          <Card.Content>
            <View style={styles.troubleshootItem}>
              <Ionicons name="warning" size={16} color="#F59E0B" />
              <View style={styles.troubleshootInfo}>
                <Text style={styles.troubleshootTitle}>Can't sign in</Text>
                <Text style={styles.troubleshootSolution}>Verify your email and password, or use the password reset option</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.troubleshootCard}>
          <Card.Content>
            <View style={styles.troubleshootItem}>
              <Ionicons name="warning" size={16} color="#F59E0B" />
              <View style={styles.troubleshootInfo}>
                <Text style={styles.troubleshootTitle}>App crashes</Text>
                <Text style={styles.troubleshootSolution}>Update to the latest version from the App Store</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.troubleshootCard}>
          <Card.Content>
            <View style={styles.troubleshootItem}>
              <Ionicons name="warning" size={16} color="#F59E0B" />
              <View style={styles.troubleshootInfo}>
                <Text style={styles.troubleshootTitle}>Slow responses</Text>
                <Text style={styles.troubleshootSolution}>This may be due to high server load, please try again in a few minutes</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <Card style={styles.infoCard}>
            <Card.Content>
              <Text style={styles.infoText}>
                <Text style={styles.infoLabel}>Version:</Text> PoCo v1.0.0{'\n'}
                <Text style={styles.infoLabel}>Platform:</Text> iOS & Android{'\n'}
                <Text style={styles.infoLabel}>Encryption:</Text> End-to-End (E2EE){'\n'}
                <Text style={styles.infoLabel}>Support:</Text> Available 24/7
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
  text: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    marginBottom: 24,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  contactInfo: {
    marginLeft: 12,
    flex: 1,
  },
  contactLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 4,
  },
  contactNote: {
    fontSize: 12,
    color: '#6B7280',
  },
  faqCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    marginBottom: 16,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  troubleshootCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    marginBottom: 12,
  },
  troubleshootItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  troubleshootInfo: {
    marginLeft: 12,
    flex: 1,
  },
  troubleshootTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  troubleshootSolution: {
    fontSize: 12,
    color: '#B45309',
    lineHeight: 16,
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  infoLabel: {
    fontWeight: '600',
    color: '#1F2937',
  },
}); 