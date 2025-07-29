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
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView}>
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Acceptance of Terms</Text>
            <Text style={styles.bodyText}>
              By accessing and using PoCo, you accept and agree to be bound by the terms and provision of this agreement.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Use License</Text>
            <Text style={styles.bodyText}>
              Permission is granted to temporarily download one copy of the app per device for personal, non-commercial transitory viewing only.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Privacy</Text>
            <Text style={styles.bodyText}>
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Disclaimer</Text>
            <Text style={styles.bodyText}>
              The materials on PoCo are provided on an 'as is' basis. PoCo makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Limitations</Text>
            <Text style={styles.bodyText}>
              In no event shall PoCo or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the service.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <Text style={styles.bodyText}>
              If you have any questions about these Terms of Service, please contact us at lata@hellopoco.app
            </Text>
          </Card.Content>
        </Card>

        {/* Last Updated */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Last updated: January 2025</Text>
          <Text style={styles.footerSubtext}>PoCo v1.0.0</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  sectionCard: {
    margin: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
}); 