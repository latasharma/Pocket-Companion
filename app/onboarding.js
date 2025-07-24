import * as React from 'react';
import { View, Image, TouchableOpacity, Platform, KeyboardAvoidingView, Alert, ScrollView } from 'react-native';
import { TextInput, Button, Card, Text, Provider as PaperProvider } from 'react-native-paper';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
      try {
        const userResult = await supabase.auth.getUser();
        console.log('User result:', userResult);
        
        if (!userResult || userResult.error || !userResult.data || !userResult.data.user) {
          console.log('No user found, redirecting to signin');
          router.replace('/signin');
          return;
        }
        
        const user = userResult.data.user;
        console.log('User found:', user.id);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name, companion_name, communication_mode')
          .eq('id', user.id);
        
        console.log('Profile data:', data);
        console.log('Profile error:', error);
        
        // Only skip if user has completed full onboarding (including communication mode)
        if (data && data.length > 0 && data[0].first_name && data[0].companion_name && data[0].communication_mode) {
          router.replace('/');
        } else if (data && data.length > 0 && data[0].first_name && data[0].companion_name) {
          // User has basic info but not communication mode - load existing data
          setFirstName(data[0].first_name || '');
          setLastName(data[0].last_name || '');
          setCompanionName(data[0].companion_name || '');
          // setCommunicationMode(data[0].communication_mode || 'text'); // Removed voice options
          // setSelectedAccent(data[0].accent || 'American'); // Removed accent selection
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        router.replace('/signin');
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
    }

    setIsLoading(true);

    try {
      const userResult = await supabase.auth.getUser();
      console.log('Continue - User result:', userResult);
      
      if (!userResult || userResult.error || !userResult.data || !userResult.data.user) {
        console.log('No user found in handleContinue');
        setMessage('User not found. Please sign in again.');
        setIsLoading(false);
        setTimeout(() => {
          router.replace('/signin');
        }, 2000);
        return;
      }
      
      const user = userResult.data.user;
      console.log('Continue - User found:', user.id);

      // Save user info to Supabase
      console.log('About to upsert profile with ID:', user.id, 'first_name:', firstName, 'last_name:', lastName, 'companion_name:', companionName);
      
      // Use upsert to handle both insert and update
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          companion_name: companionName,
          // communication_mode: communicationMode, // Removed voice options
          // accent: selectedAccent // Removed accent selection
        }, {
          onConflict: 'id'
        })
        .select();
      
      console.log('Upsert result:', data);
      console.log('Upsert error:', error);

      if (error) {
        console.log('Final error:', error);
        setMessage('Failed to save companion name: ' + error.message);
        setIsLoading(false);
        return;
      }

      setMessage('');
      setIsLoading(false);
      router.replace('/');
    } catch (error) {
      console.error('Error in handleContinue:', error);
      setMessage('An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <PaperProvider>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#f0fdf4' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={150}
      >
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
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
                <TextInput
                  label="Companion Name"
                  value={companionName}
                  onChangeText={setCompanionName}
                  placeholder="Enter a name for your companion"
                  placeholderTextColor="#a3a3a3"
                  style={{ marginBottom: 12, backgroundColor: 'white' }}
                  autoCapitalize="words"
                  mode="outlined"
                />

                {/* Suggested Names */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, color: '#374151', marginBottom: 8 }}>
                    Suggested names:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {SUGGESTED_NAMES.map((name) => (
                      <TouchableOpacity
                        key={name}
                        style={{
                          backgroundColor: companionName === name ? '#00B686' : '#f3f4f6',
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: companionName === name ? '#00B686' : '#d1d5db',
                          margin: 4,
                        }}
                        onPress={() => setCompanionName(name)}
                      >
                        <Text style={{
                          color: companionName === name ? 'white' : '#374151',
                          fontWeight: '500',
                          fontSize: 12,
                        }}>
                          {name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* About Your AI Companion */}
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
                  }}>
                    About Your AI Companion
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: '#6b7280',
                    lineHeight: 20,
                  }}>
                    Your AI companion is designed to provide helpful conversations and general assistance. For medical, legal, financial, or other professional advice, please consult qualified experts.
                  </Text>
                </View>

                {/* Privacy Policy */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                  <TouchableOpacity
                    onPress={() => setAccepted(!accepted)}
                    style={{
                      width: 20,
                      height: 20,
                      borderWidth: 2,
                      borderColor: accepted ? '#00B686' : '#d1d5db',
                      borderRadius: 4,
                      marginRight: 8,
                      backgroundColor: accepted ? '#00B686' : 'white',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {accepted && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </TouchableOpacity>
                  <Text style={{ fontSize: 14, color: '#374151', flex: 1 }}>
                    I accept the{' '}
                    <Text
                      style={{ color: '#00B686', textDecorationLine: 'underline' }}
                      onPress={() => {
                        Alert.alert(
                          'Privacy Policy',
                          'Your privacy is important to us. We collect and use your data only to provide you with the best AI companion experience. We do not share your personal information with third parties without your consent. You can request deletion of your data at any time.',
                          [{ text: 'OK' }]
                        );
                      }}
                    >
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
        </ScrollView>
      </KeyboardAvoidingView>  
    </PaperProvider>
  );
}

