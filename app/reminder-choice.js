// COMMENTED OUT: Complex Reminder Choice - Focus on core companion experience
import React from "react";
import { router } from "expo-router";

export default function ReminderChoiceScreen() {
  React.useEffect(() => router.back(), []);
  return null;
}
