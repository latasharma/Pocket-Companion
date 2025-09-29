# POCO Strategy & Key Decisions

## 🎯 Current Mission
Build POCO (AI Pocket Companion) - a voice-enabled AI companion that feels like talking to a trusted friend, not using a tool.

## 🚫 What We Decided NOT to Do (Postponed)
- **Reminders System** - Decided on Monday to postpone this feature
- **Medication tracking**
- **Exercise/water reminders**
- **Custom task reminders**

## ✅ Current Priorities (In Order)
1. **Voice Integration** - ElevenLabs for natural AI voice
2. **Enhanced Chat Experience** - Improve Gemini integration
3. **Better Navigation** - Tab-based navigation (Home, Chat, Profile)
4. **Profile Management** - Avatar upload, user preferences
5. **Advanced AI Features** - Chain-of-thought, expert agents

## 🎨 Design Principles
- **Emerald green** brand colors (not purple!)
- **Companion-like language** (no "How can I help you today?")
- **Direct answers first**, then follow-up questions
- **Cost-effective** with free tier
- **Low latency** responses

## 🔧 Technical Decisions
- **Frontend**: React Native + Expo
- **AI**: Google Gemini (OpenAI kept failing)
- **Voice**: ElevenLabs (planned)
- **Styling**: NativeWind (Tailwind for RN)
- **Navigation**: Expo Router

## 📝 Key Decisions Made
- **Monday**: Postponed reminders system
- **Voice First**: Prioritizing voice integration over other features
- **Gemini over OpenAI**: Due to consistent failures with OpenAI
- **Companion over Assistant**: Warm, friendly tone throughout

## 🎯 Success Metrics
- Natural voice interaction
- Companion-like experience
- Fast, reliable responses
- User engagement and retention
