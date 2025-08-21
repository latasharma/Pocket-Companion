// COMMENTED OUT: Complex Other Reminders - Focus on core companion experience
import React from "react";
import { router } from "expo-router";

export default function OtherRemindersScreen() {
  React.useEffect(() => router.back(), []);
  return null;
}
