import { Stack } from "expo-router";
import { useEffect } from "react";
import { Linking, ErrorUtils } from "react-native";
import { supabase } from "../lib/supabase";
import { useRouter } from "expo-router";
import { DemoProvider } from "../lib/demoContext";

// Global error handler for uncaught exceptions
// Check if ErrorUtils is available before using it
if (ErrorUtils && typeof ErrorUtils.getGlobalHandler === 'function') {
  try {
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      console.error('Global error handler:', error, isFatal);
      
      // Log error but prevent crash in production
      if (__DEV__) {
        console.error('Uncaught exception:', error);
        // In development, use original handler for debugging
        if (originalHandler) {
          originalHandler(error, isFatal);
          return;
        }
      }
      
      // In production, prevent crash by handling gracefully
      // The app will continue running despite the error
      console.error('Error caught by global handler (non-fatal):', error.message || error);
    });
  } catch (error) {
    console.warn('Failed to set global error handler:', error);
  }
} else {
  // ErrorUtils not available in Expo, but promise rejection tracking below will handle async errors
  console.log('⚠️ ErrorUtils not available in Expo - using promise rejection tracker for error handling');
}

// Handle unhandled promise rejections
if (typeof global !== 'undefined' && global.HermesInternal) {
  const originalPromiseRejectionTracker = global.HermesInternal?.enablePromiseRejectionTracker;
  if (originalPromiseRejectionTracker) {
    global.HermesInternal.enablePromiseRejectionTracker({
      allRejections: true,
      onUnhandled: (id, rejection) => {
        console.error('Unhandled promise rejection:', id, rejection);
        // Don't crash - just log the error
      },
      onHandled: (id) => {
        console.log('Promise rejection handled:', id);
      }
    });
  }
}

export default function RootLayout() {
  const router = useRouter();
  
  useEffect(() => {
    let handled = false; // prevent double-handling on fast refresh
    
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
    Linking.getInitialURL()
      .then((url) => {
        console.log('Initial URL:', url);
        if (url) {
          handleDeepLink(url).catch((error) => {
            console.error('Error handling initial URL:', error);
          });
        }
      })
      .catch((error) => {
        console.error('Error getting initial URL:', error);
        // Don't crash - just log the error
      });

    // Handle deep links when app is already running
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('URL event received:', event.url);
      handleDeepLink(event.url).catch((error) => {
        console.error('Error handling URL event:', error);
        // Don't crash - just log the error
      });
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <DemoProvider>
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
    </DemoProvider>
  );
}
