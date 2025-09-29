# Agent Architecture Guide

## Overview

The POCO AI companion now features a **Chain-of-Thought (COT) ready agent architecture** that provides specialized AI responses while maintaining full backward compatibility with the current system.

## Architecture Components

### 🎯 Supervisor Agent
- **Role**: Coordinates all specialist agents and synthesizes responses
- **Status**: Always enabled when agent architecture is active
- **Function**: Routes user requests to appropriate specialists and combines responses

### 🤖 Specialist Agents

#### Health Agent (`health`)
- **Focus**: Medication management, health monitoring, medical concerns
- **Keywords**: medication, pill, doctor, pain, symptom, health
- **Priority**: High (medical safety)

#### Memory Agent (`memory`)
- **Focus**: Memory assistance, cognitive support, reminiscence therapy
- **Keywords**: memory, remember, forgot, brain, cognitive, past
- **Priority**: High (memory lapses)

#### Social Agent (`social`)
- **Focus**: General conversation, companionship, entertainment
- **Keywords**: hello, weather, family, hobby, joke, story
- **Priority**: Medium (default for general chat)

#### Wellness Agent (`wellness`)
- **Focus**: Lifestyle, stress management, sleep, nutrition, exercise
- **Keywords**: stress, sleep, exercise, food, energy, mood
- **Priority**: Medium (lifestyle support)

#### Safety Agent (`safety`)
- **Focus**: Emergency situations, safety concerns, crisis support
- **Keywords**: emergency, help, danger, crisis, urgent
- **Priority**: Critical (disabled by default for safety)

## Current Status

### ✅ **COT-Ready Framework Implemented**
- All agent infrastructure is in place
- **Currently DISABLED by default** (transparent to users)
- **Zero breaking changes** to existing functionality
- **Easy enable/disable** via environment variables

### 🔄 **Current Behavior**
- Uses existing AI service (Gemini/OpenAI)
- All current features work exactly as before
- Agent architecture is dormant but ready

## How to Enable Agent Architecture

### Option 1: Environment Variables (Recommended)
Add these to your `.env` file:

```bash
# Master switch
EXPO_PUBLIC_ENABLE_AGENTS=true
EXPO_PUBLIC_ENABLE_SUPERVISOR_AGENT=true

# Individual agents
EXPO_PUBLIC_ENABLE_HEALTH_AGENT=true
EXPO_PUBLIC_ENABLE_MEMORY_AGENT=true
EXPO_PUBLIC_ENABLE_SOCIAL_AGENT=true
EXPO_PUBLIC_ENABLE_WELLNESS_AGENT=true
EXPO_PUBLIC_ENABLE_SAFETY_AGENT=false

# Debug (optional)
EXPO_PUBLIC_DEBUG_AGENTS=false
```

### Option 2: Runtime Configuration
```javascript
import agentConfig from './lib/agentConfig.js';

// Enable agent architecture
agentConfig.enableAgentArchitecture();

// Enable specific agents
agentConfig.enableAgent('health');
agentConfig.enableAgent('memory');
agentConfig.enableAgent('social');
agentConfig.enableAgent('wellness');
```

### Option 3: Quick Test
```bash
# Run the test script
node test-agent-architecture.js
```

## Testing the Framework

### 1. **Test Current AI (Default)**
```javascript
// This uses the existing AI service
const response = await aiService.chat("Hello!", userId);
```

### 2. **Test Agent Architecture**
```javascript
// Enable agents
agentConfig.enableAgentArchitecture();

// Test different types of requests
await aiService.chat("I forgot my medication", userId);  // → Memory Agent
await aiService.chat("I'm feeling stressed", userId);    // → Wellness Agent
await aiService.chat("How's the weather?", userId);      // → Social Agent
```

### 3. **Monitor Agent Activity**
```javascript
// Check which agents are active
const status = agentConfig.getStatus();
console.log('Enabled agents:', status.enabledAgents);

// Log configuration
agentConfig.logConfiguration();
```

## Development Workflow

### Phase 1: Framework Foundation ✅
- [x] Agent infrastructure built
- [x] Supervisor agent implemented
- [x] Specialist agents created (stubs)
- [x] Configuration system in place
- [x] Backward compatibility maintained

### Phase 2: Elder Care Features (Current)
- [ ] Build medication reminders on agent framework
- [ ] Build health monitoring on agent framework
- [ ] Build memory assistance on agent framework
- [ ] All use current AI initially

### Phase 3: Activate COT (Future)
- [ ] Replace agent stubs with real specialist logic
- [ ] Enable chain-of-thought reasoning
- [ ] Gradual rollout per agent type
- [ ] Performance optimization

## Production Safety

### ✅ **Safe by Default**
- Agent architecture is **DISABLED** in production
- Current AI service continues to work normally
- No risk of breaking existing functionality

### 🔒 **Production Validation**
```javascript
const validation = agentConfig.validateForProduction();
if (!validation.isValid) {
  console.log('Production warnings:', validation.issues);
}
```

### 📊 **Cost Control**
- Maximum 3 specialist agents per request
- Fallback to current AI if agents fail
- Configurable budget limits
- Cost tracking available

## Messaging Benefits

### For VCs/Investors
- ✅ **"Agentic AI framework with COT readiness"**
- ✅ **"Modular specialist architecture"**
- ✅ **"Future-proof elder care platform"**
- ✅ **"Scalable AI infrastructure"**

### For Users
- ✅ **Same great experience** (transparent upgrade)
- ✅ **Better responses** (when activated)
- ✅ **Specialized support** (health, memory, etc.)
- ✅ **No learning curve** (seamless transition)

## Troubleshooting

### Agent Architecture Not Working
1. Check environment variables are set correctly
2. Verify `agentConfig.isAgentArchitectureEnabled()` returns `true`
3. Check console logs for agent initialization
4. Ensure supervisor agent is loading properly

### Fallback to Current AI
- If any agent fails, system automatically falls back to current AI
- No user-facing errors or interruptions
- Logs will show fallback activity

### Performance Issues
- Agent responses may be slightly slower (multiple AI calls)
- Configure `maxResponseTime` in agent config
- Monitor `coordinationTime` in supervisor agent

## Next Steps

1. **Test the framework** with `node test-agent-architecture.js`
2. **Build elder care features** on the agent framework
3. **Enable agents gradually** for testing
4. **Activate COT reasoning** when ready

---

**Status**: ✅ **COT-Ready Framework Complete**
**Risk Level**: 🟢 **Zero Risk** (transparent implementation)
**Next Phase**: 🏗️ **Elder Care Features on Agent Framework**
