import * as React from 'react';
import { View, Image, TouchableOpacity, Platform } from 'react-native';
import { TextInput, Button, Card, Text, Checkbox, Provider as PaperProvider } from 'react-native-paper';

const SUGGESTED_NAMES = ['Echo', 'Nova', 'Aura', 'Pixel'];

export default function OnboardingScreen({ navigation }) {
  const [companionName, setCompanionName] = React.useState('');
  const [accepted, setAccepted] = React.useState(false);
  const [message, setMessage] = React.useState('');

  const handleContinue = async () => {
    if (!accepted) {
      setMessage('You must accept the privacy policy and terms.');
      return;
    }
    setMessage('Onboarding complete!');
    // navigation.replace('Home'); // Add navigation logic as needed
  };

  return (
    <PaperProvider>
      <View style={{ flex: 1, backgroundColor: '#f0fdf4', alignItems: 'center', paddingTop: 60 }}>
        {/* Logo centered */}
        <Image
          source={require('../assets/poco-logo.png')}
          style={{ width: 80, height: 80, resizeMode: 'contain', marginBottom: 16 }}
        />
        {/* Welcome Title */}
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
        {/* Subtitle */}
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
        {/* Card with Form */}
        <Card style={{
          width: '90%',
          maxWidth: 400,
          padding: 20,
          borderRadius: 20,
          elevation: 4,
          backgroundColor: 'white',
          shadowColor: '#000',
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
            {/* Suggested Names */}
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
            {/* Checkbox and Policy */}
<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
  <Checkbox
    status={accepted ? 'checked' : 'unchecked'}
    onPress={() => setAccepted(!accepted)}
    color="#00B686"
    uncheckedColor="#888"
    style={{ marginRight: 8, marginLeft: -8, transform: [{ scaleX: 1.3 }, { scaleY: 1.3 }] }}
  />
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
    </PaperProvider>
  );
}
