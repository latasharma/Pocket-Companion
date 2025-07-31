import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  const navigateToChat = () => {
    router.push('/(tabs)/chat');
  };

  const navigateToSettings = () => {
    router.push('/(tabs)/settings');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to POCO</Text>
          <Text style={styles.subtitle}>Your private AI companion</Text>
        </View>

        {/* Security Status */}
        <Card style={styles.securityCard}>
          <Card.Content>
            <View style={styles.securityHeader}>
              <Ionicons name="shield-checkmark" size={24} color="#10B981" />
              <Text style={styles.securityTitle}>End-to-End Encryption Active</Text>
            </View>
            <Text style={styles.securityDescription}>
              Your conversations are encrypted and private. Only you can read your messages.
            </Text>
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionCard} onPress={navigateToChat}>
            <View style={styles.actionContent}>
              <Ionicons name="chatbubbles" size={32} color="#3B82F6" />
              <Text style={styles.actionTitle}>Start Chatting</Text>
              <Text style={styles.actionDescription}>
                Have a conversation with Pixel, your AI companion
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={navigateToSettings}>
            <View style={styles.actionContent}>
              <Ionicons name="settings" size={32} color="#6B7280" />
              <Text style={styles.actionTitle}>Settings</Text>
              <Text style={styles.actionDescription}>
                Manage your profile and preferences
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>What POCO Offers</Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="shield-checkmark" size={20} color="#10B981" />
              <Text style={styles.featureText}>End-to-end encryption</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="mic" size={20} color="#3B82F6" />
              <Text style={styles.featureText}>Voice conversations</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="heart" size={20} color="#EF4444" />
              <Text style={styles.featureText}>Empathetic AI responses</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="lock-closed" size={20} color="#8B5CF6" />
              <Text style={styles.featureText}>Complete privacy</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
  },
  securityCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
    borderWidth: 1,
    marginBottom: 30,
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
  },
  actionsContainer: {
    marginBottom: 30,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionContent: {
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  featuresContainer: {
    flex: 1,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  featureList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
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
});
