import * as React from 'react';
import { View, Image, TouchableOpacity, Platform, KeyboardAvoidingView } from 'react-native';
import { TextInput, Button, Card, Text, Provider as PaperProvider } from 'react-native-paper';
import { supabase } from '../lib/supabase';

const SUGGESTED_NAMES = ['Echo', 'Nova', 'Aura', 'Pixel'];

export default function OnboardingScreen({ navigation }) {
  const [companionName, setCompanionName] = React.useState('');
  const [accepted, setAccepted] = React.useState(false);
  const [message, setMessage] = React.useState('');

  const handleContinue = async () => {
    alert('Accepted value: ' + accepted);
    if (!accepted) {
      setMessage('You must accept the privacy policy and terms.');
      alert('Policy not accepted');
      return;
    }

    console.log('Before getUser');
    const userResult = await supabase.auth.getUser();
    console.log('After getUser');
    console.log('userResult:', userResult);

    if (!userResult || userResult.error || !userResult.data || !userResult.data.user) {
      setMessage('User not found. Please sign in again.');
      alert('User not found. Please sign in again.');
      return;
    }

const user = userResult.data.user;
alert('User found: ' + user.id);
console.log('User found:', user.id);

// Save companion name to Supabase
// Try insert first
let { error } = await supabase
  .from('profiles')
  .insert([{ id: user.id, companion_name: companionName }]);

if (error && error.code === '23505') { // duplicate key, row exists
  // Try update
  ({ error } = await supabase
    .from('profiles')
    .update({ companion_name: companionName })
    .eq('id', user.id));
}

if (error) {
  setMessage('Failed to save companion name.');
  alert('Upsert error: ' + JSON.stringify(error));
  return;
}

setMessage('Onboarding complete!');
alert('Onboarding complete!');

    // navigation.replace('Home'); // Add navigation logic as needed
  };

  return (
    <PaperProvider>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#f0fdf4' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={150}
      >
        <View style={{ flex: 1, alignItems: 'center' }}>
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
            Give your new friend a name
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
                label="Companion Name"
                value={companionName}
                onChangeText={setCompanionName}
                placeholder="e.g. PoCo"
                placeholderTextColor="#a3a3a3"
                style={{ marginBottom: 4, backgroundColor: 'white' }}
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
              <Text style={{ color: '#888', fontSize: 12, marginBottom: 16 }}>
                You can change this later in the settings.
              </Text>
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
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: accepted ? '#00B686' : 'white',
                  }}
                >
                  {accepted ? (
                    <View style={{
                      width: 12,
                      height: 12,
                      backgroundColor: 'white',
                      borderRadius: 2,
                    }} />
                  ) : null}
                </TouchableOpacity>
                <Text onPress={() => setAccepted(!accepted)}>
                  I accept the <Text style={{ color: '#00B686', textDecorationLine: 'underline' }}>Privacy Policy</Text> and <Text style={{ color: '#00B686', textDecorationLine: 'underline' }}>Terms of Service</Text>
                </Text>
              </View>
              <Button
                mode="contained"
                onPress={handleContinue}
                style={{ backgroundColor: '#00B686' }}
                labelStyle={{ fontWeight: 'bold', color: 'white' }}
              >
                Continue
              </Button>
              {message ? (
                <Text style={{
                  marginTop: 16,
                  color: message.includes('accept') ? 'red' : '#00B686',
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
