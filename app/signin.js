import * as React from 'react';
import { View, Image, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { TextInput, Button, Card, Text, Provider as PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

const DARK_GREEN = '#00B686';
const LIGHT_GREEN = '#1DE9B6';
const BG_GREEN = '#f0fdf4';

export default function SignInScreen() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(false);
  const router = useRouter();

  // Load saved email on component mount
  React.useEffect(() => {
    const loadSavedEmail = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('rememberedEmail');
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      } catch (error) {
        console.log('Error loading saved email:', error);
      }
    };
    loadSavedEmail();
  }, []);

  const handleSignIn = async () => {
    if (!email || !password) {
      setMessage('Please enter both email and password.');
      return;
    }
    
    // Save email if remember me is checked
    if (rememberMe) {
      try {
        await AsyncStorage.setItem('rememberedEmail', email);
      } catch (error) {
        console.log('Error saving email:', error);
      }
    } else {
      try {
        await AsyncStorage.removeItem('rememberedEmail');
      } catch (error) {
        console.log('Error removing saved email:', error);
      }
    }
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    else {
      setMessage('Signed in!');
      // Check if user is onboarded and navigate accordingly
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, companion_name')
          .eq('id', user.id);
        
        const isOnboarded = !!(profile && profile.length > 0 && profile[0].first_name && profile[0].companion_name);
        
        if (isOnboarded) {
          router.replace('/');
        } else {
          router.replace('/onboarding');
        }
      }
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      setMessage('Please enter both email and password.');
      return;
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMessage(error.message);
    else {
      setMessage('Check your email for the confirmation link!');
      // After sign up, user will need to complete onboarding
      setTimeout(() => {
        router.replace('/onboarding');
      }, 2000);
    }
  };

  const getMessageColor = () => {
    if (!message) return 'black';
    const msg = message.toLowerCase();
    if (msg.includes('error') || msg.includes('invalid') || msg.includes('fail')) return 'red';
    return DARK_GREEN;
  };

  return (
    <PaperProvider>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: BG_GREEN }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={60}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Card style={{
            width: '90%',
            maxWidth: 400,
            padding: 20,
            borderRadius: 20,
            elevation: 8,
            backgroundColor: 'white',
            shadowColor: '#000',
            borderWidth: 2,
            borderColor: DARK_GREEN,
          }}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Image
                source={require('../assets/poco-logo.png')}
                style={{ width: 100, height: 100, resizeMode: 'contain', marginBottom: 8 }}
              />
              <Text style={{
                color: DARK_GREEN,
                fontWeight: 'bold',
                fontSize: 28,
                textAlign: 'center',
                letterSpacing: 2,
                marginBottom: 4
              }}>
                Pocket Companion
              </Text>
            </View>
            <Card.Content>
              <Text style={{ textAlign: 'center', marginBottom: 16, color: '#333', fontSize: 16 }}>
                Sign in to your account
              </Text>
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={{ marginBottom: 12, backgroundColor: 'white' }}
              />
              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={{ marginBottom: 12, backgroundColor: 'white' }}
              />
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => setRememberMe(!rememberMe)}
                  style={{
                    width: 20,
                    height: 20,
                    borderWidth: 2,
                    borderColor: DARK_GREEN,
                    borderRadius: 4,
                    marginRight: 8,
                    backgroundColor: rememberMe ? DARK_GREEN : '#fff',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {rememberMe && (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        backgroundColor: '#fff',
                        borderRadius: 2,
                      }}
                    />
                  )}
                </TouchableOpacity>
                <Text style={{ color: '#333', fontSize: 14 }}>
                  Remember my email
                </Text>
              </View>
              <Button
                mode="contained"
                onPress={handleSignIn}
                style={{ marginBottom: 10, backgroundColor: LIGHT_GREEN }}
                labelStyle={{ fontWeight: 'bold', color: '#00332e' }}
              >
                Sign In
              </Button>
              <Button
                mode="contained"
                onPress={handleSignUp}
                style={{ backgroundColor: DARK_GREEN }}
                labelStyle={{ fontWeight: 'bold', color: 'white' }}
              >
                Sign Up
              </Button>
              {message ? (
                <Text style={{
                  marginTop: 16,
                  color: getMessageColor(),
                  textAlign: 'center'
                }}>
                  {message}
                </Text>
              ) : null}
            </Card.Content>
          </Card>
        </View>
      </KeyboardAvoidingView>
    </PaperProvider>
  );
}
