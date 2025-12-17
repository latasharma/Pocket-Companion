import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { Linking } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import RoutineAnchors from "../lib/routineAnchors";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const router = useRouter();
  
  useEffect(() => {
    let handled = false; // prevent double-handling on fast refresh
    
    // Initialize routine anchors defaults + migrations (Story 1.1)
    (async () => {
      try {
        await RoutineAnchors.initialize();
      } catch (e) {
        console.warn('RoutineAnchors init failed', e);
      }
    })();
    
    // Handle deep links for password reset
    const handleDeepLink = async (url) => {
      if (handled) return;
      handled = true;
      
      console.log('Deep link received:', url);
      console.log('Full URL for debugging:', url);
      
      // Check if this is a password reset link
      if (url.includes('reset-password') || url.includes('type=recovery')) {
        try {
          // Check if the URL contains an error
          if (url.includes('error=')) {
            console.log('Password reset link has error, redirecting to signin');
            console.log('Error details in URL:', url);
            router.replace('/signin');
            return;
          }
          
          // Supabase puts tokens after '#' (fragment)
          const fragment = url.split('#')[1] ?? '';
          const params = new URLSearchParams(fragment);
          
          const type = params.get('type'); // 'recovery'
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          
          console.log('Fragment params - Type:', type, 'Access:', access_token ? 'Yes' : 'No', 'Refresh:', refresh_token ? 'Yes' : 'No');
          
          if (type === 'recovery' && access_token && refresh_token) {
            console.log('Setting session with recovery tokens');
            const { data, error } = await supabase.auth.setSession({ 
              access_token, 
              refresh_token 
            });
            
            if (error) {
              console.log('setSession error:', error);
              router.replace('/signin');
              return;
            }
            
            console.log('Session set successfully for user:', data?.user?.email);
            
            // Navigate to reset password screen
            router.push('/reset-password');
          } else {
            console.log('Invalid recovery link - missing tokens or wrong type');
            router.replace('/signin');
          }
        } catch (error) {
          console.error('Error handling deep link:', error);
          router.replace('/signin');
        }
      }
    };

    // Handle initial URL if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      console.log('Initial URL:', url);
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle deep links when app is already running
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('URL event received:', event.url);
      handleDeepLink(event.url);
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="terms" />
        <Stack.Screen name="support" />
        <Stack.Screen name="about" />
        <Stack.Screen name="signin" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="chat" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="memory" />
      </Stack>
    </GestureHandlerRootView>
  );
}
