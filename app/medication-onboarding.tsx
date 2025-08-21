// COMMENTED OUT: Complex Medication Onboarding - Focus on core companion experience
import React from "react";
import { router } from "expo-router";

export default function MedicationOnboardingScreen() {
  React.useEffect(() => router.back(), []);
  return null;
}
