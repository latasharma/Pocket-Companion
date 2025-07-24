import * as React from 'react';
import { View, Image, ActivityIndicator, Alert } from 'react-native';
import { Text, Button, Provider as PaperProvider } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function HomeScreen() {
  const [companionName, setCompanionName] = React.useState('');
  const [userName, setUserName] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const checkAuthAndFetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.replace('/signin');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, companion_name')
          .eq('id', user.id);
        
        const isOnboarded = !!(profile && profile.length > 0 && profile[0].first_name && profile[0].companion_name);
        
        if (!isOnboarded) {
          router.replace('/onboarding');
          return;
        }
        
        if (profile && profile.length > 0) {
          setCompanionName(profile[0].companion_name || '');
          setUserName(profile[0].first_name || '');
        }
      } catch (error) {
        console.log('Error checking auth:', error);
        router.replace('/signin');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchProfile();
  }, []);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              router.replace('/signin');
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  return (
    <PaperProvider>
      <View style={{ flex: 1, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Image
          source={require('../assets/poco-avatar.png')}
          style={{ width: 160, height: 160, marginBottom: 16 }}
        />
        {loading ? (
          <ActivityIndicator size="large" color="#00B686" style={{ marginBottom: 16 }} />
        ) : (
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: '#00B686',
            textAlign: 'center',
            marginBottom: 8,
          }}>
            Hi {userName}, I'm {companionName}! 👋
          </Text>
        )}
        <Text style={{
          fontSize: 16,
          color: '#333',
          textAlign: 'center',
          marginBottom: 24,
        }}>
          How can I help you today?
        </Text>

        <Link href="/chat" asChild>
          <Button
            mode="contained"
            style={{ backgroundColor: '#00B686', marginBottom: 12, width: 220 }}
            labelStyle={{ fontWeight: 'bold', color: 'white', fontSize: 18 }}
          >
            Start Chatting
          </Button>
        </Link>
        <Link href="/profile" asChild>
          <Button
            mode="outlined"
            style={{ borderColor: '#00B686', width: 220, marginBottom: 12 }}
            labelStyle={{ color: '#00B686', fontWeight: 'bold', fontSize: 16 }}
          >
            Profile & Settings
          </Button>
        </Link>
        <Button
          mode="text"
          onPress={handleSignOut}
          style={{ marginTop: 8 }}
          labelStyle={{ color: '#666', fontSize: 14 }}
        >
          Sign Out
        </Button>

        {/* Disclaimer - Moved below sign out */}
        <View style={{
          backgroundColor: '#f8f9fa',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          marginTop: 16,
        }}>
          <Text style={{
            fontSize: 11,
            color: '#9ca3af',
            textAlign: 'center',
            lineHeight: 14,
          }}>
            ⭐ AI companion for general assistance. For professional advice, consult qualified experts.
          </Text>
        </View>
      </View>
    </PaperProvider>
  );
}
