import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.subtitle}>How we protect your data</Text>
        </View>

        {/* E2EE Card */}
        <Card style={styles.e2eeCard}>
          <Card.Content>
            <View style={styles.e2eeHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#10B981" />
              <Text style={styles.e2eeTitle}>End-to-End Encryption</Text>
            </View>
            <Text style={styles.e2eeDescription}>
              POCO uses client-side encryption to ensure your conversations with Pixel remain completely private. 
              Your messages are encrypted on your device before being sent to our servers, and only you can decrypt them.
            </Text>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.featureText}>Messages encrypted with AES-256</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.featureText}>User-specific encryption keys</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.featureText}>Server cannot read your messages</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={styles.featureText}>Perfect forward secrecy</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Data Collection */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Data We Collect</Text>
            <Text style={styles.sectionText}>
              We collect minimal data necessary to provide our service:
            </Text>
            <List.Item
              title="Account Information"
              description="Email address, name, and companion preferences"
              left={(props) => <List.Icon {...props} icon="account" />}
            />
            <List.Item
              title="Encrypted Messages"
              description="Your conversations with Pixel (encrypted)"
              left={(props) => <List.Icon {...props} icon="message" />}
            />
            <List.Item
              title="App Usage"
              description="Basic analytics to improve the app"
              left={(props) => <List.Icon {...props} icon="chart-line" />}
            />
          </Card.Content>
        </Card>

        {/* Data Protection */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>How We Protect Your Data</Text>
            <Text style={styles.sectionText}>
              Your privacy is our top priority. We implement multiple layers of protection:
            </Text>
            <List.Item
              title="Client-Side Encryption"
              description="Messages encrypted on your device"
              left={(props) => <List.Icon {...props} icon="lock" />}
            />
            <List.Item
              title="Secure Infrastructure"
              description="AWS/Supabase with enterprise-grade security"
              left={(props) => <List.Icon {...props} icon="server" />}
            />
            <List.Item
              title="No Message Access"
              description="Our team cannot read your conversations"
              left={(props) => <List.Icon {...props} icon="eye-off" />}
            />
            <List.Item
              title="Data Minimization"
              description="We only collect what's necessary"
              left={(props) => <List.Icon {...props} icon="shield" />}
            />
          </Card.Content>
        </Card>

        {/* Your Rights */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Your Rights</Text>
            <Text style={styles.sectionText}>
              You have complete control over your data:
            </Text>
            <List.Item
              title="Access Your Data"
              description="Download all your data anytime"
              left={(props) => <List.Icon {...props} icon="download" />}
            />
            <List.Item
              title="Delete Your Data"
              description="Permanently delete your account and data"
              left={(props) => <List.Icon {...props} icon="trash" />}
            />
            <List.Item
              title="Export Messages"
              description="Export your conversations"
              left={(props) => <List.Icon {...props} icon="export" />}
            />
            <List.Item
              title="Opt Out"
              description="Disable data collection features"
              left={(props) => <List.Icon {...props} icon="settings" />}
            />
          </Card.Content>
        </Card>

        {/* Contact */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Contact Us</Text>
            <Text style={styles.sectionText}>
              If you have questions about your privacy or data protection:
            </Text>
            <List.Item
              title="Email"
              description="privacy@poco.ai"
              left={(props) => <List.Icon {...props} icon="mail" />}
            />
            <List.Item
              title="Support"
              description="Get help with privacy concerns"
              left={(props) => <List.Icon {...props} icon="help-circle" />}
            />
          </Card.Content>
        </Card>

        {/* Last Updated */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Last updated: January 2025</Text>
          <Text style={styles.footerSubtext}>POCO v1.0.0</Text>
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
  e2eeCard: {
    margin: 20,
    marginTop: 10,
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    borderWidth: 1,
  },
  e2eeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  e2eeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 8,
  },
  e2eeDescription: {
    fontSize: 16,
    color: '#047857',
    lineHeight: 24,
    marginBottom: 16,
  },
  featureList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#047857',
    marginLeft: 8,
  },
  sectionCard: {
    margin: 20,
    marginTop: 0,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  footerSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
}); 