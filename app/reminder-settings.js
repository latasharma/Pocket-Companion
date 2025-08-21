// COMMENTED OUT: Complex Reminder Settings - Focus on core companion experience
// This screen will be re-enabled when we add simplified reminder features

import React from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";

export default function ReminderSettingsScreen() {
  React.useEffect(() => router.back(), []);
  return null;
}
