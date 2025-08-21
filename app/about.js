import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#10B981" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About PoCo</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.logoSection}>
          <Image
            source={require('../assets/poco-avatar.png')}
            style={styles.logo}
          />
          <Text style={styles.appName}>PoCo</Text>
          <Text style={styles.tagline}>Your AI Pocket Companion</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is PoCo?</Text>
          <Text style={styles.text}>
            PoCo is your personal AI companion designed to provide friendly conversation, 
            general assistance, and emotional support. Whether you need someone to chat with, 
            help with daily tasks, or just want to explore ideas, PoCo is here for you.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          
          <View style={styles.featureCard}>
            <Ionicons name="chatbubbles" size={24} color="#10b981" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Intelligent Conversations</Text>
              <Text style={styles.featureDescription}>
                Engage in meaningful conversations with your AI companion
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="person" size={24} color="#10b981" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Personalized Experience</Text>
              <Text style={styles.featureDescription}>
                Customize your companion's name and personality
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="shield-checkmark" size={24} color="#10b981" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Privacy First</Text>
              <Text style={styles.featureDescription}>
                Your conversations are private and securely stored
              </Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <Ionicons name="time" size={24} color="#10b981" />
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Always Available</Text>
              <Text style={styles.featureDescription}>
                Chat with your companion anytime, anywhere
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Important Notice</Text>
          <View style={styles.noticeCard}>
            <Ionicons name="warning" size={24} color="#f59e0b" />
            <Text style={styles.noticeText}>
              PoCo is designed for entertainment and general assistance purposes only. 
              It does not provide medical, legal, financial, or professional advice. 
              Always consult qualified professionals for serious matters.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact & Support</Text>
          <TouchableOpacity style={styles.contactCard} onPress={() => router.push('/support')}>
            <Ionicons name="help-circle" size={24} color="#10b981" />
            <View style={styles.contactContent}>
              <Text style={styles.contactTitle}>Get Support</Text>
              <Text style={styles.contactDescription}>Need help? We're here for you</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ❤️ for meaningful connections</Text>
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
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  tagline: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  version: {
    fontSize: 14,
    color: '#9ca3af',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  featureCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureContent: {
    flex: 1,
    marginLeft: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  noticeCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
    marginLeft: 12,
  },
  contactCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactContent: {
    flex: 1,
    marginLeft: 16,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
