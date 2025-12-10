import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Validate password when switching to sign-up mode
  useEffect(() => {
    if (isSignUp && password) {
      validatePassword(password);
    }
  }, [isSignUp]);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  const router = useRouter();

  // Forgot password function
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'hellopoco.app://reset-password',
        emailRedirectTo: 'hellopoco.app://reset-password',
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert(
        'Reset Link Sent', 
        'Check your email for a password reset link. Click the link to reset your password within the app.',
        [
          { text: 'OK', onPress: () => console.log('Password reset email sent') }
        ]
      );
    } catch (error) {
      console.error('Password reset error:', error);
      Alert.alert('Error', 'Failed to send password reset email. Please try again.');
    }
  };

  // Password validation function
  const validatePassword = (password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    
    setPasswordRequirements(requirements);
    return Object.values(requirements).every(req => req);
  };

  const handleSignIn = async () => {
    Keyboard.dismiss(); // Dismiss keyboard before processing
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        Alert.alert('Sign In Error', error.message);
        return;
      }

      if (data.user) {
        // Check if user has a profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        
        if (profile && profile.first_name && profile.companion_name) {
          // User has complete profile, go to home
          router.replace('/');
        } else {
          // User needs to complete profile
          router.replace('/onboarding');
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', 'Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    Keyboard.dismiss(); // Dismiss keyboard before processing
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    // Validate password with comprehensive requirements
    if (!validatePassword(password)) {
      // Don't show pop-up, just let the visual feedback guide the user
      console.log('Client-side validation failed');
      return;
    }
    
    console.log('Password validation passed, attempting sign up...');


    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email: email.trim(),
        password: password,
      });
      
      if (error) {
        console.log('Supabase error:', error.message);
        // Only show pop-up for non-password related errors
        if (error.message.includes('email')) {
          Alert.alert('Error', 'Please enter a valid email address.');
        } else if (error.message.includes('already registered')) {
          Alert.alert('Error', 'An account with this email already exists. Please sign in instead.');
        } else {
          // For password errors, keep the password and let visual feedback guide the user
          console.log('Password validation error:', error.message);
          // Don't clear the password - let user see what they typed and fix it
          return;
        }
        return;
      }

      if (data.user) {
        // For development, proceed directly to onboarding without email verification
          router.replace('/onboarding');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      Alert.alert('Error', 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
      <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#f0fdf4' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={{ 
          flexGrow: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          paddingVertical: 20
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{
            width: '90%',
            maxWidth: 400,
          backgroundColor: 'white',
          borderRadius: 20,
            padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
            elevation: 8,
            borderWidth: 2,
          borderColor: '#00B686',
          }}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <Image
                source={require('../assets/poco-logo.png')}
            style={{ width: 80, height: 80, resizeMode: 'contain', marginBottom: 6 }}
          />
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#00B686', textAlign: 'center', letterSpacing: 1 }}>
                Pocket Companion
              </Text>
            </View>
        
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#1f2937', textAlign: 'center', marginBottom: 8 }}>
          {isSignUp ? 'Create your account' : 'Sign in to your account'}
        </Text>
        
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
          {isSignUp ? 'Join PoCo and start chatting with your AI companion' : 'Welcome to PoCo'}
        </Text>
        
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
            Email
              </Text>
              <TextInput
            placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
            style={{
              width: '100%',
              height: 48,
              borderWidth: 1,
              borderColor: '#d1d5db',
              borderRadius: 8,
              paddingHorizontal: 16,
              backgroundColor: '#ffffff',
              fontSize: 16,
            }}
                autoCapitalize="none"
                keyboardType="email-address"
            editable={!isLoading}
          />
        </View>
        
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
            Password
          </Text>
              <TextInput
            placeholder="Enter your password"
                value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (isSignUp) {
                // Validate immediately on every keystroke
                validatePassword(text);
              }
            }}
            onFocus={() => {
              if (isSignUp && password) {
                validatePassword(password);
              }
            }}
                secureTextEntry
            style={{
              width: '100%',
              height: 48,
              borderWidth: 1,
              borderColor: '#d1d5db',
              borderRadius: 8,
              paddingHorizontal: 16,
              backgroundColor: '#ffffff',
              fontSize: 16,
            }}
            editable={!isLoading}
          />
          {isSignUp && (
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#374151', marginBottom: 6 }}>
                Password Requirements:
              </Text>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                marginBottom: 8,
                paddingHorizontal: 8,
                paddingVertical: 4,
                backgroundColor: password.length > 0 && Object.values(passwordRequirements).every(req => req) ? '#f0fdf4' : password.length > 0 ? '#fef3c7' : '#f0fdf4',
                borderRadius: 6,
                borderWidth: 1,
                borderColor: password.length > 0 && Object.values(passwordRequirements).every(req => req) ? '#10b981' : password.length > 0 ? '#f59e0b' : '#10b981'
              }}>
                <Text style={{ 
                  fontSize: 11, 
                  fontWeight: '600',
                  color: password.length > 0 && Object.values(passwordRequirements).every(req => req) ? '#10b981' : password.length > 0 ? '#f59e0b' : '#10b981'
                }}>
                  {password.length === 0 ? '📋 Password requirements below - follow these to create a strong password' : Object.values(passwordRequirements).every(req => req) ? '✓ Strong Password' : '⚠️ Password needs improvement'}
                </Text>
              </View>
              <View style={{ marginLeft: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: passwordRequirements.length ? '#10b981' : '#374151', marginBottom: 3 }}>
                  {passwordRequirements.length ? '✓' : '○'} At least 8 characters long
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: passwordRequirements.uppercase ? '#10b981' : '#374151', marginBottom: 3 }}>
                  {passwordRequirements.uppercase ? '✓' : '○'} Contains uppercase letter (A-Z)
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: passwordRequirements.lowercase ? '#10b981' : '#374151', marginBottom: 3 }}>
                  {passwordRequirements.lowercase ? '✓' : '○'} Contains lowercase letter (a-z)
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: passwordRequirements.number ? '#10b981' : '#374151', marginBottom: 3 }}>
                  {passwordRequirements.number ? '✓' : '○'} Contains number (0-9)
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '500', color: passwordRequirements.special ? '#10b981' : '#374151' }}>
                  {passwordRequirements.special ? '✓' : '○'} Contains special character (!@#$%^&*)
                </Text>

              </View>
              <Text style={{ fontSize: 11, color: '#10b981', marginTop: 8, fontWeight: '500' }}>
                {`💡 Tip: Try "MyCat@2024!" or "SecurePass#123" - mix letters, numbers & symbols!`}
              </Text>
            </View>
          )}
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <TouchableOpacity
                  onPress={() => setRememberMe(!rememberMe)}
                  style={{
              width: 18,
              height: 18,
                    borderWidth: 2,
              borderColor: '#00B686',
              borderRadius: 3,
                    marginRight: 8,
              backgroundColor: rememberMe ? '#00B686' : '#fff',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
            disabled={isLoading}
                >
                  {rememberMe && (
                    <View
                      style={{
                  width: 6,
                  height: 6,
                        backgroundColor: '#fff',
                  borderRadius: 1,
                      }}
                    />
                  )}
                </TouchableOpacity>
          <Text style={{ color: '#333', fontSize: 13 }}>
                  Remember my email
                </Text>
              </View>
        
        <TouchableOpacity
          style={[{
            backgroundColor: '#10b981',
            paddingHorizontal: 30,
            paddingVertical: 14,
            borderRadius: 8,
            width: '100%',
            alignItems: 'center',
            marginBottom: 16,
            opacity: isLoading ? 0.6 : 1
          }]}
          onPress={isSignUp ? handleSignUp : handleSignIn}
          disabled={isLoading}
        >
          <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
            {isLoading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </Text>
        </TouchableOpacity>
        
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#6b7280', fontSize: 14 }}>
            {isSignUp ? 'Already have an account? ' : 'Don\'t have an account? '}
            <Text 
              style={{ color: '#10b981', fontWeight: '600' }}
              onPress={() => {
                Keyboard.dismiss(); // Dismiss keyboard when switching modes
                setIsSignUp(!isSignUp);
                // Reset password requirements when switching modes
                setPasswordRequirements({
                  length: false,
                  uppercase: false,
                  lowercase: false,
                  number: false,
                  special: false
                });
                // Only clear password when switching FROM sign-up TO sign-in
                if (isSignUp) {
                  setPassword(''); // Clear password when going back to sign-in
                }
                // Keep password when switching TO sign-up mode
              }}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </Text>
          </Text>
          
          {!isSignUp && (
            <TouchableOpacity
              onPress={handleForgotPassword}
              style={{ marginTop: 12 }}
            >
              <Text style={{ color: '#10b981', fontSize: 14, fontWeight: '500' }}>
                Forgot Password?
                </Text>
            </TouchableOpacity>
          )}
        </View>
              </View>
        </ScrollView>
      </KeyboardAvoidingView>
  );
}
