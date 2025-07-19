import React, { useState } from 'react';
import SignInScreen from './signin';
import OnboardingScreen from './onboarding';

export default function App() {
  const [signedIn, setSignedIn] = useState(false);

  // This will be called from SignInScreen when sign-in is successful
  const handleSignInSuccess = () => setSignedIn(true);

  return signedIn
    ? <OnboardingScreen />
    : <SignInScreen onSignInSuccess={handleSignInSuccess} />;
}
