import 'dotenv/config';

export default {
  expo: {
    name: 'ai-pocket-companion',
    slug: 'ai-pocket-companion',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'aipocketcompanion',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.hellopoco.poco',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
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