import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="support" />
      <Stack.Screen name="about" />
      <Stack.Screen name="signin" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="chat" />
      <Stack.Screen name="reminder-choice" />
      <Stack.Screen name="other-reminders" />
      <Stack.Screen name="medication-onboarding" />
    </Stack>
  );
}
