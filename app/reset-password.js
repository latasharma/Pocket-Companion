import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function ResetPasswordScreen() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  const router = useRouter();

  // Check if user is authenticated (came from reset link)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        console.log('Auth check - User:', user?.email, 'Error:', error);
        
        if (error || !user) {
          console.error('Auth error:', error);
          Alert.alert(
            'Session Error',
            'Please try clicking the reset link again, or request a new password reset.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/signin')
              }
            ]
          );
          return;
        }

        // User is authenticated, they can proceed with password reset
        console.log('User authenticated for password reset:', user.email);
      } catch (error) {
        console.error('Auth check error:', error);
        Alert.alert('Error', 'Unable to verify reset link. Please try again.');
        router.replace('/signin');
      }
    };
    
    checkAuth();
  }, []);

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

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please enter both passwords');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (!validatePassword(newPassword)) {
      Alert.alert('Error', 'Please ensure your password meets all requirements');
      return;
    }

    setIsLoading(true);
    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      // Sign out the user after password reset for security
      await supabase.auth.signOut();

      Alert.alert(
        'Password Updated Successfully',
        'Your password has been updated. Please sign in with your new password.',
        [
          {
            text: 'Sign In',
            onPress: () => router.replace('/signin')
          }
        ]
      );
    } catch (error) {
      console.error('Password reset error:', error);
      Alert.alert('Error', 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f0fdf4' }}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
              <Ionicons name="key" size={60} color="#00B686" />
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#00B686', textAlign: 'center', marginTop: 10 }}>
                Reset Password - TEST
              </Text>
            </View>
            
            <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
              Enter your new password below
            </Text>
            
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                New Password
              </Text>
              <TextInput
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  validatePassword(text);
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
            </View>
            
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
                Confirm Password
              </Text>
              <TextInput
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
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
            </View>

            {newPassword.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#374151', marginBottom: 6 }}>
                  Password Requirements:
                </Text>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginBottom: 8,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  backgroundColor: Object.values(passwordRequirements).every(req => req) ? '#f0fdf4' : '#fef3c7',
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: Object.values(passwordRequirements).every(req => req) ? '#10b981' : '#f59e0b'
                }}>
                  <Text style={{ 
                    fontSize: 11, 
                    fontWeight: '600',
                    color: Object.values(passwordRequirements).every(req => req) ? '#10b981' : '#f59e0b'
                  }}>
                    {Object.values(passwordRequirements).every(req => req) ? '✓ Strong Password' : '⚠️ Password needs improvement'}
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
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                {isLoading ? 'Updating Password...' : 'Update Password'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{ alignItems: 'center' }}
              onPress={() => router.back()}
            >
              <Text style={{ color: '#6b7280', fontSize: 14 }}>
                Back to Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
