import React, { createContext, useContext, useState } from 'react';

const DemoContext = createContext();

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
};

export const DemoProvider = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoProfile, setDemoProfile] = useState({
    id: 'demo-user-id',
    first_name: 'Demo',
    last_name: 'User',
    companion_name: 'Pixel',
    communication_mode: 'text',
    accent: 'American',
    profile_image_url: null,
    subscription_tier: 'free',
    subscription_status: 'active',
    subscription_start_date: null,
    subscription_end_date: null,
    trial_end_date: null,
    is_premium: false,
    premium_expires_at: null,
    connect_onboarding_completed: false,
    connect_interests: [],
    connect_concerns: [],
    connect_type: null,
    connect_location: null,
    created_at: new Date().toISOString(),
  });

  const enterDemoMode = () => {
    setIsDemoMode(true);
  };

  const exitDemoMode = () => {
    setIsDemoMode(false);
  };

  const value = {
    isDemoMode,
    demoProfile,
    enterDemoMode,
    exitDemoMode,
  };

  return (
    <DemoContext.Provider value={value}>
      {children}
    </DemoContext.Provider>
  );
};
