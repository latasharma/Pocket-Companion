import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  Image,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

const SUGGESTED_NAMES = ['Echo', 'Nova', 'Aura', 'Pixel', 'Luna', 'Zen', 'Spark', 'Mira'];

export default function OnboardingScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companionName, setCompanionName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('companion_name, first_name, last_name')
        .eq('id', user.id)
        .single();
          
      if (data && data.companion_name && data.first_name && data.last_name) {
            router.replace('/chat');
          }
        }
      } catch (error) {
        console.error('Error checking profile:', error);
      }
    };
    checkProfile();
  }, []);

  const handleContinue = async () => {
    Keyboard.dismiss(); // Dismiss keyboard before processing
    if (!firstName.trim()) {
      Alert.alert('Error', 'Please enter your first name.');
      return;
    }
    if (!lastName.trim()) {
      Alert.alert('Error', 'Please enter your last name.');
      return;
    }
    if (!companionName.trim()) {
      Alert.alert('Error', 'Please enter a name for your companion.');
      return;
    }
    if (!accepted) {
      Alert.alert('Error', 'You must accept the privacy policy and terms.');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not found. Please sign in again.');
      return;
    }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          companion_name: companionName.trim(),
          created_at: new Date().toISOString(),
        });

      if (error) throw error;

      // Navigate directly to home without popup
      router.replace('/');
    } catch (error) {
      console.error('Error setting up profile:', error);
      Alert.alert('Error', 'Failed to save profile information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
        <Image 
          source={require('../assets/poco-logo.png')}
            style={styles.logo}
          />
          <Text style={styles.title}>Welcome to PoCo</Text>
          <Text style={styles.subtitle}>Your AI Pocket Companion</Text>
          <Text style={styles.description}>Let's get to know each other</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Tell us about yourself</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter your first name"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter your last name"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Companion Name</Text>
            <TextInput
              value={companionName}
              onChangeText={setCompanionName}
              placeholder="Enter a name for your companion"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          <View style={styles.suggestedNamesContainer}>
            <Text style={styles.suggestedTitle}>Suggested Names</Text>
            <View style={styles.suggestedNames}>
              {SUGGESTED_NAMES.map((name) => (
                <TouchableOpacity
                  key={name}
                  onPress={() => setCompanionName(name)}
                  style={[
                    styles.nameChip,
                    companionName === name && styles.nameChipSelected
                  ]}
                >
                  <Text style={[
                    styles.nameChipText,
                    companionName === name && styles.nameChipTextSelected
                  ]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.hint}>You can change this later in the settings.</Text>

          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerTitle}>⚠️ Important Disclaimer</Text>
            <Text style={styles.disclaimerText}>
              This AI companion is for entertainment and general assistance purposes only. 
              We are not responsible for any decisions made based on AI responses. 
              The AI does not provide medical, legal, financial, or professional advice. 
              Always consult qualified professionals for serious matters.
            </Text>
          </View>

          <View style={styles.acceptanceContainer}>
            <TouchableOpacity
              onPress={() => setAccepted(!accepted)}
              style={[styles.checkbox, accepted && styles.checkboxSelected]}
            >
              {accepted && (
                <Ionicons name="checkmark" size={12} color="#ffffff" />
              )}
            </TouchableOpacity>
            <Text style={styles.acceptanceText}>
              I accept the{' '}
              <Text
                style={styles.linkText}
                onPress={() => Alert.alert('Privacy Policy', 'Your privacy is important to us. We collect only necessary data to provide you with the best AI companion experience. Your conversations are stored securely and never shared with third parties.')}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Setting up...' : 'Continue'}
            </Text>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  title: {
          color: '#1f2937',
          fontWeight: 'bold',
          fontSize: 20,
          textAlign: 'center',
          marginBottom: 4,
  },
  subtitle: {
          fontSize: 14,
          color: '#6b7280',
          textAlign: 'center',
          marginBottom: 4,
  },
  description: {
          fontSize: 16,
          fontWeight: '600',
          color: '#374151',
          textAlign: 'center',
          marginBottom: 16,
  },
  form: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
  },
  formTitle: {
          fontSize: 18,
          fontWeight: '600',
          color: '#374151',
          marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
            fontSize: 14,
            fontWeight: '600',
            color: '#374151',
            marginBottom: 8,
  },
  input: {
              borderWidth: 1,
              borderColor: '#d1d5db',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 12,
              fontSize: 16,
              color: '#1f2937',
              backgroundColor: '#ffffff',
  },
  suggestedNamesContainer: {
    marginBottom: 16,
  },
  suggestedTitle: {
            fontSize: 14,
            fontWeight: '600',
            color: '#374151',
            marginBottom: 8,
  },
  suggestedNames: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  nameChip: {
                  backgroundColor: '#f3f4f6',
                  borderColor: '#d1d5db',
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  marginRight: 8,
                  marginBottom: 8,
  },
  nameChipSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  nameChipText: {
    color: '#374151',
    fontWeight: '500',
  },
  nameChipTextSelected: {
    color: '#ffffff',
  },
  hint: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 20,
  },
  disclaimer: {
          backgroundColor: '#fef3c7',
          borderColor: '#f59e0b',
          borderWidth: 1,
          borderRadius: 8,
          padding: 16,
          marginBottom: 20,
  },
  disclaimerTitle: {
            fontSize: 14,
            fontWeight: '600',
            color: '#92400e',
            marginBottom: 8,
  },
  disclaimerText: {
            fontSize: 13,
            color: '#92400e',
            lineHeight: 18,
  },
  acceptanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkbox: {
              width: 20,
              height: 20,
              borderWidth: 2,
              borderColor: '#10b981',
              borderRadius: 4,
              marginRight: 12,
    backgroundColor: '#ffffff',
              justifyContent: 'center',
              alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#10b981',
  },
  acceptanceText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  linkText: {
    color: '#10b981',
    textDecorationLine: 'underline',
  },
  button: {
            backgroundColor: '#10b981',
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
            color: '#ffffff',
            fontSize: 16,
            fontWeight: '600',
  },
});
