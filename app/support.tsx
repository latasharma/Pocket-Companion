import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function SupportScreen() {
  const router = useRouter();

  const openEmail = () => {
    Linking.openURL('mailto:lata@hellopoco.app');
  };

  const openWebsite = () => {
    Linking.openURL('https://www.hellopoco.app');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <TouchableOpacity style={styles.contactItem} onPress={openEmail}>
            <Ionicons name="mail" size={24} color="#3B82F6" />
            <View style={styles.contactText}>
              <Text style={styles.contactTitle}>Email Support</Text>
              <Text style={styles.contactSubtitle}>lata@hellopoco.app</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactItem} onPress={openWebsite}>
            <Ionicons name="globe" size={24} color="#3B82F6" />
            <View style={styles.contactText}>
              <Text style={styles.contactTitle}>Visit Website</Text>
              <Text style={styles.contactSubtitle}>www.hellopoco.app</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FAQ</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How does encryption work?</Text>
            <Text style={styles.faqAnswer}>
              Your messages are encrypted with AES-256 encryption on your device before being sent to our servers. Only you can decrypt and read your messages.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I change my companion's name?</Text>
            <Text style={styles.faqAnswer}>
              Yes! Go to Settings {'>'} Profile to customize your AI companion's name and other preferences.
            </Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Is my data private?</Text>
            <Text style={styles.faqAnswer}>
              Absolutely. We use end-to-end encryption, which means your conversations are private and secure. Our servers cannot read your messages.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About PoCo</Text>
          <Text style={styles.bodyText}>
            PoCo is your private AI companion, designed to provide empathetic and helpful conversations while maintaining the highest standards of privacy and security.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  contactText: {
    flex: 1,
    marginLeft: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  bodyText: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
}); 