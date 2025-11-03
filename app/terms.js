import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#10B981" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.lastUpdated}>Last updated: December 2024</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.text}>
            By accessing and using PoCo (Pocket Companion), you accept and agree to be bound by the terms 
            and provision of this agreement.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Description of Service</Text>
          <Text style={styles.text}>
            PoCo is an AI companion application that provides conversational assistance and general 
            support. The service is for entertainment and general assistance purposes only.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
          <Text style={styles.text}>
            You agree to:
          </Text>
          <Text style={styles.bullet}>• Provide accurate and complete information</Text>
          <Text style={styles.bullet}>• Maintain the security of your account</Text>
          <Text style={styles.bullet}>• Use the service responsibly and lawfully</Text>
          <Text style={styles.bullet}>• Not attempt to reverse engineer or hack the service</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. AI Companion Limitations</Text>
          <Text style={styles.text}>
            The AI companion:
          </Text>
          <Text style={styles.bullet}>• Provides general assistance and entertainment</Text>
          <Text style={styles.bullet}>• Does not provide medical, legal, or financial advice</Text>
          <Text style={styles.bullet}>• May occasionally provide inaccurate information</Text>
          <Text style={styles.bullet}>• Should not be relied upon for critical decisions</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Privacy and Data</Text>
          <Text style={styles.text}>
            Your privacy is important to us. Please review our Privacy Policy to understand how we 
            collect, use, and protect your information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Service Availability</Text>
          <Text style={styles.text}>
            We strive to maintain high availability but cannot guarantee uninterrupted service. 
            We may temporarily suspend the service for maintenance or updates.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Termination</Text>
          <Text style={styles.text}>
            You may terminate your account at any time. We may terminate or suspend your account 
            for violations of these terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Contact Information</Text>
          <Text style={styles.text}>
            For questions about these Terms of Service, contact us at:
          </Text>
          <Text style={styles.contact}>lata@hellopoco.app</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 12,
  },
  bullet: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginLeft: 16,
    marginBottom: 4,
  },
  contact: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 8,
  },
});
