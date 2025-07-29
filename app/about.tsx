import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About PoCo</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView}>
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Version</Text>
            <Text style={styles.bodyText}>PoCo v1.0.0</Text>
          </Card.Content>
        </Card>

        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>What is PoCo?</Text>
            <Text style={styles.bodyText}>
              PoCo is your private AI companion, designed to provide empathetic and helpful conversations while maintaining the highest standards of privacy and security.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Key Features</Text>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                <Text style={styles.featureText}>End-to-end encryption</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="heart" size={20} color="#EF4444" />
                <Text style={styles.featureText}>Empathetic AI responses</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="lock-closed" size={20} color="#8B5CF6" />
                <Text style={styles.featureText}>Complete privacy</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="mic" size={20} color="#3B82F6" />
                <Text style={styles.featureText}>Voice conversations</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Privacy & Security</Text>
            <Text style={styles.bodyText}>
              Your privacy is our top priority. We use client-side encryption to ensure your conversations remain completely private. Your messages are encrypted on your device before being sent to our servers, and only you can decrypt them.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Technology</Text>
            <Text style={styles.bodyText}>
              PoCo uses advanced AI models to provide helpful, safe, and empathetic conversations. Our technology is designed to understand context and provide meaningful responses while maintaining strict privacy standards.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Contact</Text>
            <Text style={styles.bodyText}>
              For questions, support, or feedback, please contact us at:
            </Text>
            <Text style={styles.contactText}>lata@hellopoco.app</Text>
          </Card.Content>
        </Card>

        {/* Last Updated */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Last updated: January 2025</Text>
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
  featureList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
    marginTop: 8,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
  },
}); 