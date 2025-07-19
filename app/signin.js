import * as React from 'react';
import { View, Image } from 'react-native';
import { TextInput, Button, Card, Text, Provider as PaperProvider } from 'react-native-paper';
import { supabase } from '../lib/supabase';

const DARK_GREEN = '#00B686';
const LIGHT_GREEN = '#1DE9B6';
const BG_GREEN = '#f0fdf4';

export default function SignInScreen({ onSignInSuccess }) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [message, setMessage] = React.useState('');

  const handleSignIn = async () => {
    if (!email || !password) {
      setMessage('Please enter both email and password.');
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
    else {
      setMessage('Signed in!');
      if (onSignInSuccess) onSignInSuccess();
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      setMessage('Please enter both email and password.');
      return;
    }
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMessage(error.message);
    else setMessage('Check your email for the confirmation link!');
  };

  const getMessageColor = () => {
    if (!message) return 'black';
    const msg = message.toLowerCase();
    if (msg.includes('error') || msg.includes('invalid') || msg.includes('fail')) return 'red';
    return DARK_GREEN;
  };

  return (
    <PaperProvider>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG_GREEN }}>
        <Card style={{
          width: '90%',
          maxWidth: 400,
          padding: 20,
          borderRadius: 20,
          elevation: 4,
          backgroundColor: 'white',
          shadowColor: '#000',
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
              style={{ marginBottom: 20, backgroundColor: 'white' }}
            />
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
    </PaperProvider>
  );
}
