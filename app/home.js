import * as React from 'react';
import { View, Image, TouchableOpacity } from 'react-native';
import { Text, Button, Provider as PaperProvider } from 'react-native-paper';

export default function HomeScreen({ navigation }) {
  // Replace with actual user/companion name from state or props if available
  const userName = "Lata";
  const companionName = "PoCo";

  return (
    <PaperProvider>
      <View style={{ flex: 1, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {/* Avatar */}
        <Image
          source={require('../assets/poco-avatar.png')}
          style={{ width: 160, height: 160, marginBottom: 16 }}
        />
        {/* Greeting */}
        <Text style={{
          fontSize: 24,
          fontWeight: 'bold',
          color: '#00B686',
          textAlign: 'center',
          marginBottom: 8,
        }}>
          Hi {userName}, I’m {companionName}! 👋
        </Text>
        <Text style={{
          fontSize: 16,
          color: '#333',
          textAlign: 'center',
          marginBottom: 24,
        }}>
          How can I help you today?
        </Text>
        {/* Main Actions */}
        <Button
          mode="contained"
          style={{ backgroundColor: '#00B686', marginBottom: 12, width: 220 }}
          labelStyle={{ fontWeight: 'bold', color: 'white', fontSize: 18 }}
          onPress={() => {/* navigation to chat */}}
        >
          Start Chatting
        </Button>
        <Button
          mode="outlined"
          style={{ borderColor: '#00B686', width: 220 }}
          labelStyle={{ color: '#00B686', fontWeight: 'bold', fontSize: 16 }}
          onPress={() => {/* navigation to reminders or profile */}}
        >
          Set a Reminder
        </Button>
        {/* Profile/Settings (optional) */}
        <TouchableOpacity
          style={{ marginTop: 32 }}
          onPress={() => {/* navigation to profile/settings */}}
        >
          <Text style={{ color: '#00B686', textDecorationLine: 'underline' }}>
            Profile & Settings
          </Text>
        </TouchableOpacity>
      </View>
    </PaperProvider>
  );
}
