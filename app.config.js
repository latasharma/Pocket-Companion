import 'dotenv/config';

export default {
  expo: {
    name: 'POCO',
    slug: 'ai-pocket-companion',
    version: '2.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.flat.png',
    scheme: 'aipocketcompanion',
    userInterfaceStyle: 'automatic',
    newArchEnabled: false,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.hellopoco.poco',
      buildNumber: '1',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription: "POCO needs access to your photo library to let you upload profile pictures and share images in conversations.",
        NSCameraUsageDescription: "POCO needs access to your camera to let you take photos for your profile and share images in conversations.",
        NSMicrophoneUsageDescription: "POCO needs access to your microphone to enable voice conversations with your AI companion.",
        NSSpeechRecognitionUsageDescription: "POCO uses speech recognition to convert your voice messages into text for better AI understanding and conversation flow.",
        NSLocationWhenInUseUsageDescription: "POCO uses your location to help you connect with nearby users who share your interests.",
        NSContactsUsageDescription: "POCO may access your contacts to help you find friends who are also using the app.",
        NSPhotoLibraryAddUsageDescription: "POCO needs access to save photos to your photo library when you share images in conversations."
      }
    },
    android: {
      package: 'com.hellopoco.poco',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      permissions: [
        'CAMERA',
        'RECORD_AUDIO',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'READ_CONTACTS'
      ],
      edgeToEdgeEnabled: true
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png'
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#f0fdf4'
        }
      ],
      [
        'expo-av',
        {
          microphonePermission: 'POCO needs access to your microphone to enable voice conversations with your AI companion.'
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: 'c294d8ea-f588-4716-88a2-08b955ab6c0e'
      },
      // Inject environment variables
      openaiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
      geminiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
      elevenLabsKey: process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY,
      elevenLabsVoiceId: process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID,
      enableAgents: process.env.EXPO_PUBLIC_ENABLE_AGENTS,
      enableSupervisorAgent: process.env.EXPO_PUBLIC_ENABLE_SUPERVISOR_AGENT,
      enableHealthAgent: process.env.EXPO_PUBLIC_ENABLE_HEALTH_AGENT,
      enableSafetyAgent: process.env.EXPO_PUBLIC_ENABLE_SAFETY_AGENT,
      enableMemoryAgent: process.env.EXPO_PUBLIC_ENABLE_MEMORY_AGENT,
      enableSocialAgent: process.env.EXPO_PUBLIC_ENABLE_SOCIAL_AGENT
    }
  }
}; 