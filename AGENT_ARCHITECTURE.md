# PoCo Agent Architecture - Supervisory & Agentic Behavior

**Version:** 1.0.0  
**Last Updated:** January 2025  
**Status:** Architecture Defined, Implementation In Progress

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Pattern](#architecture-pattern)
3. [Agent Types](#agent-types)
4. [Request Flow](#request-flow)
5. [Chain of Thought (COT) Architecture](#chain-of-thought-cot-architecture)
6. [Current Implementation](#current-implementation)
7. [Configuration](#configuration)
8. [Safety & Guardrails](#safety--guardrails)
9. [Performance & Cost Control](#performance--cost-control)
10. [Future Enhancements](#future-enhancements)

---

## Overview

PoCo uses a **supervisory agent architecture** with specialized agents to provide intelligent, context-aware responses for elderly users. The architecture is designed to:

- **Route requests** to the most appropriate specialist agent(s)
- **Coordinate multiple agents** when a request spans multiple domains
- **Maintain context** across conversations and agent interactions
- **Ensure safety** through built-in guardrails and content filtering
- **Optimize performance** with fallback mechanisms and cost controls

### Key Principles

1. **Supervisor Pattern**: A central supervisor agent analyzes incoming requests and routes them to specialist agents
2. **Specialist Agents**: Domain-specific agents handle focused tasks (health, memory, social, wellness, safety)
3. **Chain of Thought (COT)**: Planned implementation using reasoning chains for complex multi-step requests
4. **Graceful Degradation**: Fallback to standard AI service if agent architecture fails
5. **Elderly-Focused**: All agents designed with elderly users in mind - simple, clear, respectful

---

## Architecture Pattern

### High-Level Architecture

```
User Message
    ↓
AIService.chat()
    ↓
Supervisor Agent (analyzes request)
    ↓
    ├─→ Health Agent (medication, health questions)
    ├─→ Memory Agent (recall, cognitive support)
    ├─→ Social Agent (general conversation, companionship)
    ├─→ Wellness Agent (lifestyle, wellbeing)
    └─→ Safety Agent (emergency detection, crisis support)
    ↓
Supervisor Agent (synthesizes responses)
    ↓
Final Response to User
```

### Supervisor Agent Responsibilities

1. **Request Analysis**: Analyze user message to determine intent and domain
2. **Agent Selection**: Choose appropriate specialist agent(s) based on request
3. **Context Management**: Pass relevant context (conversation history, user profile, medications)
4. **Response Synthesis**: Combine multiple agent responses into coherent final response
5. **Quality Control**: Validate responses for safety, appropriateness, and completeness
6. **Fallback Handling**: Route to standard AI service if agent architecture unavailable

### Specialist Agent Responsibilities

Each specialist agent:
- Handles domain-specific requests
- Maintains domain expertise and knowledge
- Follows elderly-friendly communication guidelines
- Respects safety boundaries
- Returns structured responses for supervisor synthesis

---

## Agent Types

### 1. Supervisor Agent
**Status:** Placeholder Implementation  
**Purpose:** Central coordinator for all agent interactions

**Responsibilities:**
- Analyze incoming user messages
- Determine which specialist agent(s) to invoke
- Manage context and conversation history
- Synthesize responses from multiple agents
- Handle errors and fallbacks

**Current Implementation:**
- Placeholder that uses enhanced AI service directly
- Will be replaced with full COT architecture

### 2. Health Agent
**Status:** Planned  
**Purpose:** Health and medication support for elderly users

**Responsibilities:**
- Medication reminders and information
- Health question answering (with disclaimers)
- Medication interaction warnings
- Encouraging professional consultation
- Health-related conversation support

**Key Features:**
- Access to user medication database
- Medication schedule awareness
- Health education (non-medical advice)
- Professional referral guidance

### 3. Memory Agent
**Status:** Planned  
**Purpose:** Memory and cognitive support

**Responsibilities:**
- Conversation memory management
- Important information recall
- Reminder assistance
- Cognitive support activities
- Memory-related questions

**Key Features:**
- Long-term memory storage
- Context retrieval across sessions
- Memory organization and categorization
- Cognitive exercise suggestions

### 4. Social Agent
**Status:** Planned  
**Purpose:** General conversation and companionship

**Responsibilities:**
- Casual conversation
- Emotional support
- Companionship and engagement
- General questions and answers
- Friendly interaction

**Key Features:**
- Natural conversation flow
- Personality and warmth
- Context-aware responses
- Elderly-friendly communication style

### 5. Wellness Agent
**Status:** Planned  
**Purpose:** Lifestyle and wellbeing support

**Responsibilities:**
- Exercise and activity suggestions
- Nutrition guidance (non-medical)
- Sleep and relaxation tips
- Hobby and interest support
- Lifestyle recommendations

**Key Features:**
- Age-appropriate activity suggestions
- Gentle encouragement
- Wellness education
- Resource recommendations

### 6. Safety Agent
**Status:** Disabled by Default  
**Purpose:** Emergency detection and crisis support

**Responsibilities:**
- Detect emergency situations
- Identify crisis indicators (suicide, abuse, medical emergency)
- Provide appropriate responses
- Escalation protocols
- Safety-related content filtering

**Key Features:**
- Crisis detection algorithms
- Emergency response protocols
- Content safety validation
- Professional referral for emergencies

**⚠️ Note:** Safety agent is disabled by default and requires careful implementation and testing before enabling.

---

## Request Flow

### Standard Request Flow

```
1. User sends message
   ↓
2. AIService.chat() receives message
   ↓
3. Check if agent architecture enabled
   ├─→ NO: Use standard AI service
   └─→ YES: Continue to supervisor
   ↓
4. Supervisor Agent analyzes request
   ├─→ Extract intent
   ├─→ Determine domain(s)
   └─→ Select specialist agent(s)
   ↓
5. Invoke specialist agent(s)
   ├─→ Health Agent (if health-related)
   ├─→ Memory Agent (if memory-related)
   ├─→ Social Agent (if general conversation)
   ├─→ Wellness Agent (if lifestyle-related)
   └─→ Safety Agent (if safety concerns detected)
   ↓
6. Specialist agents process request
   ├─→ Access relevant context
   ├─→ Generate domain-specific response
   └─→ Return structured response
   ↓
7. Supervisor synthesizes responses
   ├─→ Combine multiple agent outputs
   ├─→ Ensure coherence
   └─→ Apply safety filters
   ↓
8. Final response returned to user
   ↓
9. Response saved to conversation history
```

### Multi-Agent Coordination

For complex requests spanning multiple domains:

1. Supervisor identifies multiple relevant domains
2. Invokes multiple specialist agents in parallel (up to `maxAgentCalls` limit)
3. Each agent processes from their domain perspective
4. Supervisor synthesizes responses into coherent final answer
5. Ensures no conflicting information
6. Prioritizes safety and accuracy

### Fallback Flow

```
Agent Architecture Fails
   ↓
Supervisor Agent Error
   ↓
Fallback to Standard AI Service
   ↓
Standard AI Response (with safety guidelines)
```

---

## Chain of Thought (COT) Architecture

### Planned Implementation

The full COT architecture will implement reasoning chains for complex requests:

```
User: "I'm feeling dizzy and forgot to take my morning medication"

COT Process:
1. Supervisor analyzes: Health + Memory domains
2. Supervisor reasons:
   - "User mentions dizziness (health concern)"
   - "User forgot medication (memory issue)"
   - "Medication may be related to dizziness"
   - "Need to check medication schedule"
3. Supervisor routes:
   - Health Agent: Assess dizziness concern
   - Memory Agent: Check medication schedule
4. Agents process:
   - Health Agent: "Dizziness can be serious, but I can't provide medical advice. 
                    However, missing medication could be a factor. 
                    Please consult your doctor if dizziness persists."
   - Memory Agent: "I see you take [medication] at 8am. It's now 2pm. 
                    Would you like me to help you remember to take it now?"
5. Supervisor synthesizes:
   - Combine health warning with memory assistance
   - Ensure professional consultation is encouraged
   - Provide actionable next steps
```

### COT Benefits

1. **Better Reasoning**: Step-by-step analysis of complex requests
2. **Multi-Domain Handling**: Seamlessly coordinate across agent domains
3. **Context Awareness**: Deep understanding of user situation
4. **Safety**: Multiple validation points before response
5. **Elderly-Friendly**: Clear, step-by-step responses

---

## Current Implementation

### Status: Placeholder Phase

**Current State:**
- ✅ Agent configuration system (`lib/agentConfig.js`)
- ✅ Supervisor agent placeholder (`lib/agents/supervisorAgent.js`)
- ✅ Agent architecture integration in AIService
- ✅ Environment variable configuration
- ⏳ Specialist agents (not yet implemented)
- ⏳ COT reasoning (not yet implemented)
- ⏳ Multi-agent coordination (not yet implemented)

### Placeholder Supervisor Agent

The current supervisor agent:
- Uses enhanced AI service directly
- Maintains conversation context
- Provides fallback responses
- Will be replaced with full COT implementation

**File:** `lib/agents/supervisorAgent.js`

### Configuration

**Master Switch:**
```javascript
agentArchitectureEnabled: false  // Currently disabled
```

**Enable via Environment Variables:**
```bash
EXPO_PUBLIC_ENABLE_AGENTS=true
EXPO_PUBLIC_ENABLE_SUPERVISOR_AGENT=true
```

**Individual Agent Switches:**
```bash
EXPO_PUBLIC_ENABLE_HEALTH_AGENT=true
EXPO_PUBLIC_ENABLE_MEMORY_AGENT=true
EXPO_PUBLIC_ENABLE_SOCIAL_AGENT=true
EXPO_PUBLIC_ENABLE_WELLNESS_AGENT=true
EXPO_PUBLIC_ENABLE_SAFETY_AGENT=false  # Disabled by default
```

---

## Configuration

### Agent Configuration (`lib/agentConfig.js`)

**Master Settings:**
- `agentArchitectureEnabled`: Master switch (default: `false`)
- Individual agent toggles
- Performance settings
- Cost control settings

**Performance Settings:**
```javascript
performance: {
  maxResponseTime: 5000,        // 5 seconds max
  enableFallback: true,         // Fallback to standard AI
  enableDebugLogging: false     // Debug logging
}
```

**Cost Control:**
```javascript
costControl: {
  maxAgentCalls: 3,             // Max specialist agents per request
  enableCostTracking: false,    // Track API costs
  budgetLimit: 100              // Monthly budget limit
}
```

### Environment Variables

All agent configuration can be controlled via environment variables:

```bash
# Master switches
EXPO_PUBLIC_ENABLE_AGENTS=true
EXPO_PUBLIC_ENABLE_SUPERVISOR_AGENT=true

# Individual agents
EXPO_PUBLIC_ENABLE_HEALTH_AGENT=true
EXPO_PUBLIC_ENABLE_MEMORY_AGENT=true
EXPO_PUBLIC_ENABLE_SOCIAL_AGENT=true
EXPO_PUBLIC_ENABLE_WELLNESS_AGENT=true
EXPO_PUBLIC_ENABLE_SAFETY_AGENT=false

# Debug
EXPO_PUBLIC_DEBUG_AGENTS=false
```

---

## Safety & Guardrails

### Built-in Safety Features

1. **System Prompt Guidelines**: Safety rules embedded in all agent prompts
2. **API Safety Filters**: Gemini and OpenAI built-in content filtering
3. **Response Validation**: Pre-response safety checks (planned)
4. **Safety Agent**: Dedicated agent for emergency detection (disabled by default)
5. **Professional Referral**: Always encourage professional consultation for serious matters

### Safety Guidelines (Applied to All Agents)

- Never provide medical, legal, or financial advice (unless clearly educational)
- Encourage professional consultation for serious matters
- Avoid giving advice that could be harmful or dangerous
- Be supportive but not a replacement for professional services
- Respect user privacy and boundaries

### Elderly-Specific Safety Considerations

- **No Condescending Language**: Avoid terms like "honey", "sweetie", "dear"
- **Clear Communication**: Simple, direct language
- **Respect Autonomy**: Support decision-making, don't override
- **Professional Boundaries**: Maintain appropriate relationship
- **Crisis Detection**: Identify when professional help is needed

---

## Performance & Cost Control

### Performance Optimization

1. **Response Time Limits**: Max 5 seconds per request
2. **Parallel Processing**: Multiple agents process simultaneously
3. **Caching**: Conversation history and context caching
4. **Fallback Mechanisms**: Graceful degradation if agents fail
5. **Request Batching**: Group related requests when possible

### Cost Control

1. **Agent Call Limits**: Max 3 specialist agents per request
2. **Cost Tracking**: Optional API cost monitoring (disabled by default)
3. **Budget Limits**: Monthly budget cap (if tracking enabled)
4. **Efficient Routing**: Only invoke necessary agents
5. **Provider Selection**: Use cost-effective providers (Gemini primary)

### Monitoring

- Response times tracked
- API call counts logged
- Error rates monitored
- Cost tracking (optional)
- Performance metrics available via `agentConfig.getStatus()`

---

## Future Enhancements

### Phase 1: Core Agent Implementation
- [ ] Implement Health Agent with medication database access
- [ ] Implement Memory Agent with long-term memory storage
- [ ] Implement Social Agent with conversation management
- [ ] Implement Wellness Agent with lifestyle support
- [ ] Basic multi-agent coordination

### Phase 2: COT Architecture
- [ ] Full Chain of Thought reasoning implementation
- [ ] Multi-step reasoning chains
- [ ] Agent-to-agent communication
- [ ] Complex request decomposition
- [ ] Response synthesis algorithms

### Phase 3: Safety Agent
- [ ] Crisis detection algorithms
- [ ] Emergency response protocols
- [ ] Content safety validation
- [ ] Professional referral system
- [ ] Safety agent testing and validation

### Phase 4: Advanced Features
- [ ] Agent learning and adaptation
- [ ] User preference learning
- [ ] Personalized agent behavior
- [ ] Advanced context management
- [ ] Performance optimization

### Phase 5: Production Readiness
- [ ] Comprehensive testing
- [ ] Performance benchmarking
- [ ] Cost optimization
- [ ] Documentation completion
- [ ] Production deployment

---

## File Structure

```
lib/
├── agentConfig.js              # Agent configuration and management
├── agents/
│   └── supervisorAgent.js     # Supervisor agent (placeholder)
│   ├── healthAgent.js          # Health agent (planned)
│   ├── memoryAgent.js          # Memory agent (planned)
│   ├── socialAgent.js          # Social agent (planned)
│   ├── wellnessAgent.js       # Wellness agent (planned)
│   └── safetyAgent.js          # Safety agent (planned)
└── aiService.js                # Main AI service with agent integration
```

---

## Development Notes

### Enabling Agent Architecture

1. Set environment variables:
   ```bash
   EXPO_PUBLIC_ENABLE_AGENTS=true
   EXPO_PUBLIC_ENABLE_SUPERVISOR_AGENT=true
   ```

2. Enable specific agents:
   ```bash
   EXPO_PUBLIC_ENABLE_HEALTH_AGENT=true
   EXPO_PUBLIC_ENABLE_MEMORY_AGENT=true
   # etc.
   ```

3. Restart the app to load new configuration

### Testing Agent Architecture

```javascript
import agentConfig from './lib/agentConfig.js';

// Check status
const status = agentConfig.getStatus();
console.log('Agent Status:', status);

// Validate for production
const validation = agentConfig.validateForProduction();
if (!validation.isValid) {
  console.warn('Issues:', validation.issues);
}
```

### Debugging

Enable debug logging:
```bash
EXPO_PUBLIC_DEBUG_AGENTS=true
```

This will log:
- Agent selection decisions
- Request routing
- Agent responses
- Synthesis process
- Performance metrics

---

## References

- **Agent Configuration**: `lib/agentConfig.js`
- **Supervisor Agent**: `lib/agents/supervisorAgent.js`
- **AI Service**: `lib/aiService.js`
- **Tech Stack**: `POCO_TECH_STACK.md`
- **Security**: `SECURITY.md`

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Status:** Architecture Defined, Implementation In Progress

