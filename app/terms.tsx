import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agreement to Terms</Text>
          <Text style={styles.text}>
            By accessing and using PoCo ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description of Service</Text>
          <Text style={styles.text}>
            PoCo is an AI companion app that provides users with a personalized conversational experience. The service includes:
          </Text>
          <Text style={styles.text}>
            • AI-powered conversation capabilities{'\n'}
            • Personalized companion experience{'\n'}
            • End-to-end encrypted messaging{'\n'}
            • Profile customization features{'\n'}
            • Cross-platform accessibility
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Accounts</Text>
          <Text style={styles.text}>
            When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for:
          </Text>
          <Text style={styles.text}>
            • Maintaining the security of your account and password{'\n'}
            • All activities that occur under your account{'\n'}
            • Notifying us immediately of any unauthorized use{'\n'}
            • Ensuring your account information remains accurate
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acceptable Use</Text>
          <Text style={styles.text}>
            You agree not to use the Service to:
          </Text>
          <Text style={styles.text}>
            • Violate any applicable laws or regulations{'\n'}
            • Infringe upon the rights of others{'\n'}
            • Transmit harmful, offensive, or inappropriate content{'\n'}
            • Attempt to gain unauthorized access to our systems{'\n'}
            • Interfere with the proper functioning of the Service{'\n'}
            • Use the Service for commercial purposes without permission
          </Text>
        </View>

        <Card style={styles.highlightCard}>
          <Card.Content>
            <Text style={styles.highlightTitle}>🔒 Privacy and Data Protection</Text>
            <Text style={styles.highlightText}>
              We are committed to protecting your privacy:
            </Text>
            <Text style={styles.highlightText}>
              • All messages are end-to-end encrypted{'\n'}
              • We cannot read or access your conversations{'\n'}
              • Your data is protected by industry-standard security measures{'\n'}
              • We collect only necessary information to provide the service
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Intellectual Property</Text>
          <Text style={styles.text}>
            The Service and its original content, features, and functionality are and will remain the exclusive property of PoCo and its licensors. The Service is protected by copyright, trademark, and other laws.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Content</Text>
          <Text style={styles.text}>
            You retain ownership of any content you create while using the Service. However, by using the Service, you grant us a limited license to process your content solely for the purpose of providing the Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Availability</Text>
          <Text style={styles.text}>
            We strive to maintain high availability of the Service, but we do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, updates, or other factors beyond our control.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Limitation of Liability</Text>
          <Text style={styles.text}>
            In no event shall PoCo, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Disclaimer of Warranties</Text>
          <Text style={styles.text}>
            The Service is provided on an "AS IS" and "AS AVAILABLE" basis. PoCo makes no warranties, expressed or implied, and hereby disclaims all warranties, including without limitation, warranties of merchantability, fitness for a particular purpose, and non-infringement.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Termination</Text>
          <Text style={styles.text}>
            We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including without limitation if you breach the Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Governing Law</Text>
          <Text style={styles.text}>
            These Terms shall be interpreted and governed by the laws of the jurisdiction in which PoCo operates, without regard to its conflict of law provisions.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Changes to Terms</Text>
          <Text style={styles.text}>
            We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <Text style={styles.text}>
            If you have any questions about these Terms of Service, please contact us:
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