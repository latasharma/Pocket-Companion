# POCO AI Pocket Companion - Technical Documentation

## Project Overview
POCO is an AI pocket companion designed specifically for elderly users, featuring natural voice interactions and persistent conversation memory.

## Tech Stack

### Frontend & Mobile
- **React Native** with Expo SDK
- **Expo Router** for navigation
- **React Native Paper** for UI components
- **Expo AV** for audio recording and playback

### AI Services
- **Google Gemini API** (primary) - for chat responses
- **OpenAI GPT-4o-mini** (fallback) - for chat responses
- **OpenAI GPT-4o-mini-transcribe** - for Speech-to-Text
- **ElevenLabs API** - for Text-to-Speech (natural voice)

### Backend & Database
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - User authentication
  - Real-time subscriptions
  - File storage

### Key Libraries & Services
- **Expo FileSystem** - for temporary audio file storage
- **AsyncStorage** - for local data persistence
- **React Native Speech** - system TTS fallback
- **FormData** - for API file uploads

## Environment Variables
```
EXPO_PUBLIC_OPENAI_API_KEY
EXPO_PUBLIC_GEMINI_API_KEY  
EXPO_PUBLIC_ELEVENLABS_API_KEY
EXPO_PUBLIC_ELEVENLABS_VOICE_ID
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```

## Architecture Overview

### Voice Input Flow
1. User presses and holds microphone button
2. Audio recording starts (Expo AV)
3. Recording stops when user releases button
4. Audio file saved to temporary storage (Expo FileSystem)
5. File sent to OpenAI GPT-4o-mini-transcribe API
6. Transcribed text automatically sent as message

### Voice Output Flow
1. AI generates response (Gemini primary, OpenAI fallback)
2. Text sent to ElevenLabs API for natural voice synthesis
3. Audio file downloaded and played through Expo AV
4. Fallback to system TTS if ElevenLabs fails

### Chat Flow
1. User message (text or voice) received
2. Message added to conversation history
3. Full context sent to Gemini API (primary)
4. If Gemini fails, fallback to OpenAI GPT-4o-mini
5. AI response generated with companion personality
6. Response spoken via ElevenLabs (if voice enabled)
7. Conversation saved to Supabase + AsyncStorage

### Memory & Persistence
- **Supabase**: User profiles, conversation history, preferences
- **AsyncStorage**: Local conversation cache, voice preferences
- **Real-time sync**: Conversations sync across devices

## Key Features
- **Press-and-hold voice recording** (Replika-style)
- **Natural voice synthesis** (ElevenLabs)
- **Conversation memory** across sessions
- **Voice preference persistence** in user profile
- **Robust error handling** with multiple fallbacks
- **Professional audio session management**

## File Structure
```
ai-pocket-companion/
├── app/
│   ├── chat.js          # Main chat interface
│   ├── profile.js       # User settings & preferences
│   └── signin.js        # Authentication
├── lib/
│   ├── aiService.js     # AI chat responses (Gemini/OpenAI)
│   ├── voiceService.js  # Text-to-Speech (ElevenLabs)
│   ├── voiceInputService.js # Speech-to-Text (OpenAI)
│   └── memoryService.js # Conversation persistence
└── app.config.js        # Expo configuration
```

## Development Commands
```bash
# Start development server
npx expo start --clear

# Install dependencies
yarn install

# Build for production
npx expo build
```

## Production Considerations
- **Voice Quality**: ElevenLabs provides natural, non-robotic voice
- **Latency**: Optimized for real-time conversation
- **Reliability**: Multiple fallback strategies for all services
- **Cost Optimization**: Gemini primary (cheaper), OpenAI fallback
- **User Experience**: Press-and-hold recording, auto-send, persistent preferences

## API Integration Details

### ElevenLabs Voice Synthesis
- Voice ID: 21m00Tcm4TlvDq8ikWAM
- Format: MP3
- Stability: 0.5
- Similarity Boost: 0.75
- Style: 0.0
- Use Speaker Boost: true

### OpenAI Transcription
- Model: gpt-4o-mini-transcribe
- Format: M4A audio files
- Sample Rate: 44100 Hz
- Channels: 1 (mono)
- Bit Rate: 128 kbps

### Gemini Chat
- Model: gemini-1.5-flash
- Max Tokens: 150
- Temperature: 0.7
- Top P: 0.9

## Error Handling Strategy
1. **Primary Service**: Gemini API
2. **Fallback Service**: OpenAI GPT-4o-mini
3. **Voice Fallback**: System TTS if ElevenLabs fails
4. **Retry Logic**: Exponential backoff for API calls
5. **Graceful Degradation**: App continues working even if services fail

## User Experience Features
- **Companion Personality**: Natural, concise responses (1-3 sentences)
- **Voice Preferences**: Persistent settings in user profile
- **Chat History**: Automatic persistence across sessions
- **Intuitive UI**: Press-and-hold for voice, clear visual feedback
- **Accessibility**: Designed for elderly users with clear, simple interface



---

**Last Updated**: August 2024  
**Version**: Production-ready voice implementation  
**Status**: Fully functional AI companion with natural voice capabilities
