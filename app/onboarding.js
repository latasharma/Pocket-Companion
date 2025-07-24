import * as React from 'react';
import { View, Image, TouchableOpacity, Platform, KeyboardAvoidingView } from 'react-native';
import { TextInput, Button, Card, Text, Provider as PaperProvider } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';

const SUGGESTED_NAMES = ['Echo', 'Nova', 'Aura', 'Pixel'];

export default function OnboardingScreen() {
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [companionName, setCompanionName] = React.useState('');
  const [accepted, setAccepted] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const router = useRouter();

  // Skip onboarding if already completed
  React.useEffect(() => {
    const checkProfile = async () => {
      const userResult = await supabase.auth.getUser();
      if (!userResult || userResult.error || !userResult.data || !userResult.data.user) return;
      const user = userResult.data.user;
      const { data } = await supabase
        .from('profiles')
        .select('first_name, companion_name')
        .eq('id', user.id);
      
      if (data && data.length > 0 && data[0].first_name && data[0].companion_name) {
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
    if (!accepted) {
      setMessage('You must accept the privacy policy and terms.');
      return;
    }
    if (!companionName.trim()) {
      setMessage('Please enter a name for your companion.');
      return;
	console.log('Saving companion name:', companionName);
	console.log('User ID:', user.id);
	console.log('About to upsert profile...');

    }

    setIsLoading(true);

    const userResult = await supabase.auth.getUser();
    if (!userResult || userResult.error || !userResult.data || !userResult.data.user) {
      setMessage('User not found. Please sign in again.');
      setIsLoading(false);
      return;
    }
    const user = userResult.data.user;

    // Save user info to Supabase
    console.log('About to upsert profile with ID:', user.id, 'first_name:', firstName, 'last_name:', lastName, 'companion_name:', companionName);
    
    // Use upsert to handle both insert and update
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ 
        id: user.id, 
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        companion_name: companionName 
      }, {
        onConflict: 'id'
      })
      .select();
    
    console.log('Upsert result:', data);
    console.log('Upsert error:', error);

    if (error) {
console.log('Final error:', error);
      setMessage('Failed to save companion name.');
      setIsLoading(false);
      return;
    }

    setMessage('');
    setIsLoading(false);
    router.replace('/');
  };

  return (
    <PaperProvider>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#f0fdf4' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={150}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Image 
            source={require('../assets/poco-logo.png')}
            style={{ width: 80, height: 80, resizeMode: 'contain', marginBottom: 16 }}
          />
          <Text style={{
            color: '#00B686',
            fontWeight: 'bold',
            fontSize: 26,
            letterSpacing: 1,   
            textAlign: 'center',
            marginBottom: 8,
          }}>
            Welcome to your Pocket Companion!
          </Text>
          <Text style={{
            fontWeight: 'bold',
            fontSize: 16,
            color: '#333',
            marginBottom: 24,
            textAlign: 'center',
            width: '80%',
          }}>
            Let's get to know each other
          </Text>
          <Card style={{
            width: '90%',
            maxWidth: 400,
            padding: 20,
            borderRadius: 20,
            elevation: 8,
            backgroundColor: 'white',
            shadowColor: '#000',
            borderWidth: 2,
            borderColor: '#00B686',
          }}>
            <Card.Content>
              <TextInput
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Enter your first name"
                placeholderTextColor="#a3a3a3"
                style={{ marginBottom: 12, backgroundColor: 'white' }}
                autoCapitalize="words"
                mode="outlined"
              />
              <TextInput
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Enter your last name"
                placeholderTextColor="#a3a3a3"
                style={{ marginBottom: 12, backgroundColor: 'white' }}
                autoCapitalize="words"
                mode="outlined"
              />
              <Text style={{ 
                color: '#00B686', 
                fontWeight: 'bold', 
                fontSize: 16, 
                marginBottom: 12,
                textAlign: 'center'
              }}>
                Now name your companion
              </Text>
              <TextInput
                label="Companion Name"
                value={companionName}
                onChangeText={setCompanionName}
                placeholder="e.g. PoCo"
                placeholderTextColor="#a3a3a3"
                style={{ marginBottom: 4, backgroundColor: 'white' }}
                autoCapitalize="words"
                mode="outlined"
              /> 
              <View style={{ flexDirection: 'row', marginBottom: 8, flexWrap: 'wrap' }}>
                {SUGGESTED_NAMES.map((name) => (
                  <TouchableOpacity
                    key={name}
                    onPress={() => setCompanionName(name)}
                    style={{   
                      backgroundColor: '#f0fdf4',
                      borderColor: '#00B686',
                      borderWidth: 1,
                      borderRadius: 16,
                      paddingVertical: 4,
                      paddingHorizontal: 12, 
                      marginRight: 8,
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ color: '#00B686', fontWeight: 'bold' }}>{name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Disclaimer - Professional and Balanced */}
              <View style={{
                backgroundColor: '#f8f9fa',
                borderColor: '#e5e7eb',
                borderWidth: 1,
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
              }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 8,
                  textAlign: 'center',
                }}>
                  About Your AI Companion
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: '#6b7280',
                  lineHeight: 16,
                  textAlign: 'center',
                }}>
                  Your AI companion is designed to provide helpful conversations and general assistance. For medical, legal, financial, or other professional advice, please consult qualified experts.
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => setAccepted(!accepted)}
                  style={{
                    width: 24,
                    height: 24,
                    borderWidth: 2,
                    borderColor: '#00B686',
                    borderRadius: 6,
                    marginRight: 8,
                    backgroundColor: accepted ? '#00B686' : '#fff',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {accepted && (
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        backgroundColor: '#fff',
                        borderRadius: 3,
                      }}
                    />
                  )}
                </TouchableOpacity>
                <Text>
                  I accept the{' '}
                  <Text style={{ color: '#00B686', textDecorationLine: 'underline' }}>
                    Privacy Policy
                  </Text>
                </Text>
              </View>
              {message ? (
                <Text style={{ color: 'red', marginBottom: 8 }}>{message}</Text>
              ) : null}
              <Button
                mode="contained"
                onPress={handleContinue}
                loading={isLoading}
                disabled={isLoading}
                style={{
                  backgroundColor: '#00B686',
                  borderRadius: 8,
                  marginTop: 8,
                }}
                contentStyle={{ paddingVertical: 8 }}
                labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}
              >
                Continue
              </Button>
            </Card.Content>
          </Card>
        </View>
      </KeyboardAvoidingView>  
    </PaperProvider>
  );
}

