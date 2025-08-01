import * as React from 'react';
import { View, Image, TouchableOpacity, Alert, Text, TextInput, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const SUGGESTED_NAMES = ['Echo', 'Nova', 'Aura', 'Pixel'];

export default function OnboardingScreen() {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [companionName, setCompanionName] = React.useState('');
  const [wantsReminders, setWantsReminders] = React.useState(null);
  const [accepted, setAccepted] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const router = useRouter();

  React.useEffect(() => {
    const checkProfile = async () => {
      const userResult = await supabase.auth.getUser();
      if (!userResult || userResult.error || !userResult.data || !userResult.data.user) return;
      const user = userResult.data.user;
      const { data } = await supabase
        .from('profiles')
        .select('companion_name, first_name, last_name')
        .eq('id', user.id)
        .single();
      if (data && data.companion_name && data.first_name && data.last_name) {
        router.replace('/');
      }
    };
    checkProfile();
  }, []);

  const handleContinue = async () => {
    setMessage('');
    
    if (!firstName.trim()) {
      setMessage('Please enter your first name.');
      return;
    }
    if (!lastName.trim()) {
      setMessage('Please enter your last name.');
      return;
    }
    if (!companionName.trim()) {
      setMessage('Please enter a name for your companion.');
      return;
    }
    if (!accepted) {
      setMessage('You must accept the privacy policy and terms.');
      return;
    }
    if (wantsReminders === null) {
      setMessage('Please select whether you want reminders.');
      return;
    }

    setIsLoading(true);
    const userResult = await supabase.auth.getUser();
    if (!userResult || userResult.error || !userResult.data || !userResult.data.user) {
      setMessage('User not found. Please sign in again.');
      setIsLoading(false);
      return;
    }
    const user = userResult.data.user;

    let { error } = await supabase
      .from('profiles')
      .insert([{ 
        id: user.id, 
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        companion_name: companionName.trim() 
      }]);

    if (error && error.code === '23505') {
      ({ error } = await supabase
        .from('profiles')
        .update({ 
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          companion_name: companionName.trim() 
        })
        .eq('id', user.id));
    }

    if (error) {
      setMessage('Failed to save profile information.');
      setIsLoading(false);
      return;
    }

    setIsLoading(false);

    if (wantsReminders === false) {
      router.replace('/chat');
    } else {
      router.replace('/reminder-choice');
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 40, paddingBottom: 40 }}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Image 
          source={require('../assets/poco-logo.png')}
          style={{ width: 60, height: 60, resizeMode: 'contain', marginBottom: 12 }}
        />
        <Text style={{
          color: '#1f2937',
          fontWeight: 'bold',
          fontSize: 20,
          textAlign: 'center',
          marginBottom: 4,
        }}>
          Welcome to PoCo
        </Text>
        <Text style={{
          fontSize: 14,
          color: '#6b7280',
          textAlign: 'center',
          marginBottom: 4,
        }}>
          Your AI Pocket Companion
        </Text>
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: '#374151',
          textAlign: 'center',
          marginBottom: 16,
        }}>
          Let's get to know each other
        </Text>
      </View>

      <View style={{
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: '#374151',
          marginBottom: 16,
        }}>
          Tell us about yourself
        </Text>
        
        <View style={{ marginBottom: 16 }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: '#374151',
            marginBottom: 8,
          }}>
            First Name
          </Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Enter your first name"
            placeholderTextColor="#9ca3af"
            style={{
              borderWidth: 1,
              borderColor: '#d1d5db',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 12,
              fontSize: 16,
              color: '#1f2937',
              backgroundColor: '#ffffff',
            }}
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            textContentType="none"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: '#374151',
            marginBottom: 8,
          }}>
            Last Name
          </Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Enter your last name"
            placeholderTextColor="#9ca3af"
            style={{
              borderWidth: 1,
              borderColor: '#d1d5db',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 12,
              fontSize: 16,
              color: '#1f2937',
              backgroundColor: '#ffffff',
            }}
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            textContentType="none"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: '#374151',
            marginBottom: 8,
          }}>
            Companion Name
          </Text>
          <TextInput
            value={companionName}
            onChangeText={setCompanionName}
            placeholder="Enter a name for your companion"
            placeholderTextColor="#9ca3af"
            style={{
              borderWidth: 1,
              borderColor: '#d1d5db',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 12,
              fontSize: 16,
              color: '#1f2937',
              backgroundColor: '#ffffff',
            }}
            autoCapitalize="words"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            textContentType="none"
          />
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: '#374151',
            marginBottom: 8,
          }}>
            Suggested Names
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {SUGGESTED_NAMES.map((name) => (
              <TouchableOpacity
                key={name}
                onPress={() => setCompanionName(name)}
                style={{
                  backgroundColor: '#f3f4f6',
                  borderColor: '#d1d5db',
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  marginRight: 8,
                  marginBottom: 8,
                }}
              >
                <Text style={{ color: '#374151', fontWeight: '500' }}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>
          You can change this later in the settings.
        </Text>

        <View style={{ marginBottom: 20 }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: '#374151',
            marginBottom: 8,
          }}>
            Would you like reminders?
          </Text>
          <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>
            Set up reminders to help you stay on track with important tasks.
          </Text>
          
          <View style={{ marginBottom: 20 }}>
            <TouchableOpacity
              style={{
                backgroundColor: wantsReminders === true ? '#10b981' : '#f3f4f6',
                borderColor: wantsReminders === true ? '#10b981' : '#d1d5db',
                borderWidth: 1,
                borderRadius: 8,
                paddingVertical: 16,
                paddingHorizontal: 16,
                marginBottom: 12,
                alignItems: 'center',
              }}
              onPress={() => setWantsReminders(true)}
            >
              <Text style={{
                color: wantsReminders === true ? '#ffffff' : '#374151',
                fontSize: 16,
                fontWeight: '600',
              }}>
                Yes, I want reminders
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: wantsReminders === false ? '#10b981' : '#f3f4f6',
                borderColor: wantsReminders === false ? '#10b981' : '#d1d5db',
                borderWidth: 1,
                borderRadius: 8,
                paddingVertical: 16,
                paddingHorizontal: 16,
                alignItems: 'center',
              }}
              onPress={() => setWantsReminders(false)}
            >
              <Text style={{
                color: wantsReminders === false ? '#ffffff' : '#374151',
                fontSize: 16,
                fontWeight: '600',
              }}>
                Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{
          backgroundColor: '#fef3c7',
          borderColor: '#f59e0b',
          borderWidth: 1,
          borderRadius: 8,
          padding: 16,
          marginBottom: 20,
        }}>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: '#92400e',
            marginBottom: 8,
          }}>
            ⚠️ Important Disclaimer
          </Text>
          <Text style={{
            fontSize: 13,
            color: '#92400e',
            lineHeight: 18,
          }}>
            This AI companion is for entertainment and general assistance purposes only. We are not responsible for any decisions made based on AI responses. The AI does not provide medical, legal, financial, or professional advice. Always consult qualified professionals for serious matters.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => setAccepted(!accepted)}
            style={{
              width: 20,
              height: 20,
              borderWidth: 2,
              borderColor: '#10b981',
              borderRadius: 4,
              marginRight: 12,
              backgroundColor: accepted ? '#10b981' : '#ffffff',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {accepted && (
              <Ionicons name="checkmark" size={12} color="#ffffff" />
            )}
          </TouchableOpacity>
          <Text style={{ fontSize: 14, color: '#374151', flex: 1 }}>
            I accept the{' '}
            <Text
              style={{ color: '#10b981', textDecorationLine: 'underline' }}
              onPress={() => Alert.alert('Privacy Policy', 'Your privacy is important to us. We collect only necessary data to provide you with the best AI companion experience. Your conversations are stored securely and never shared with third parties.')}
            >
              Privacy Policy
            </Text>
          </Text>
        </View>

        {message ? (
          <Text style={{ color: '#ef4444', marginBottom: 16, fontSize: 14 }}>{message}</Text>
        ) : null}

        <TouchableOpacity
          style={{
            backgroundColor: '#10b981',
            borderRadius: 8,
            paddingVertical: 12,
            alignItems: 'center',
          }}
          onPress={handleContinue}
          disabled={isLoading}
        >
          <Text style={{
            color: '#ffffff',
            fontSize: 16,
            fontWeight: '600',
          }}>
            {isLoading ? 'Setting up...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
