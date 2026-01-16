# Context-Aware Proactive AI - Architecture

## Vision
PoCo should initiate conversations that are contextually relevant, personalized, and genuinely helpful - like a thoughtful friend who remembers everything.

## Gold Standard Comparison

| Feature | Siri/Alexa | Replika | ChatGPT | **PoCo (Target)** |
|---------|------------|---------|---------|-------------------|
| Proactive outreach | ❌ | ✅ Generic | ❌ | ✅ Context-aware |
| User data integration | ⚠️ Basic | ❌ | ❌ | ✅ Full integration |
| Emotional intelligence | ❌ | ✅ | ⚠️ | ✅ |
| Memory (long-term) | ❌ | ⚠️ Limited | ⚠️ Limited | ✅ Persistent |
| Personalization | ⚠️ | ✅ | ⚠️ | ✅ Deep |
| **Score** | 4/10 | 6/10 | 5/10 | **10/10** |

## Two-Phase Implementation

### Phase 1: Smart Structured Queries (Deploy Today)
**No RAG needed initially** - Use existing database with smart queries

**What PoCo knows:**
- Medications & adherence
- Important dates (birthdays, anniversaries)
- Appointments
- Recent conversations
- User preferences

**Proactive triggers:**
```
1. Birthday tomorrow → "I noticed Sarah's birthday is tomorrow! Have you picked out a gift?"
2. Appointment in 2 hours → "Your doctor's appointment is at 3pm. Need help with directions?"
3. Medication pattern → "I noticed you've been taking your evening meds late. Everything okay?"
4. Anniversary next week → "Your anniversary is coming up! Want to plan something special?"
5. No recent chat + event → "Hi! I saw you have a busy week ahead. Want to talk through your schedule?"
```

### Phase 2: RAG-Enhanced Intelligence (Gold Standard)
**Add semantic search + vector embeddings**

**What PoCo learns:**
- Conversation patterns ("User gets anxious before doctor visits")
- Emotional context ("User was sad last time they mentioned this person")
- Preferences ("User prefers morning check-ins")
- Relationships ("Sarah is daughter, John is best friend")

**Proactive triggers get smarter:**
```
Instead of: "Sarah's birthday is tomorrow"
PoCo says: "Hey! I remember you were looking for book recommendations for Sarah last month. 
           Her birthday is tomorrow - want me to help you find that perfect book?"

Instead of: "Your doctor's appointment is at 3pm"
PoCo says: "I know appointments make you nervous. Your checkup is at 3pm today. 
           Want to talk through any questions you have for the doctor?"
```

## Phase 1 Architecture (Start Here)

### Daily Context Scanner (Supabase Edge Function)
Runs every morning (7 AM) and evening (6 PM)

```typescript
async function scanUserContext(userId) {
  // Query upcoming events
  const next24Hours = await getUpcomingEvents(userId, 24);
  const next48Hours = await getUpcomingEvents(userId, 48);
  
  // Query medication adherence
  const missedDoses = await getMissedDoses(userId, 7); // last 7 days
  
  // Query recent conversations
  const recentTopics = await getRecentConversationTopics(userId, 3); // last 3 days
  
  // Generate context-aware prompt
  const context = buildProactiveContext({
    upcomingEvents: next24Hours,
    recentTopics,
    missedDoses,
    userProfile
  });
  
  // If meaningful context exists, generate and send notification
  if (shouldInitiateContact(context)) {
    const message = await generateProactiveMessage(context);
    sendNotification(userId, message);
  }
}
```

### Smart Prompt Engineering
```typescript
const prompt = `
You are PoCo, a caring AI companion. Based on this user's context, craft a warm, 
natural check-in message that feels like it's from a thoughtful friend.

User context:
- Upcoming events: ${formatEvents(context.upcomingEvents)}
- Recent conversations: ${formatTopics(context.recentTopics)}
- Health patterns: ${formatHealthData(context)}
- Relationship: You've been chatting with them for ${daysSinceFirstChat} days

Guidelines:
- Be specific (mention actual events/people/topics)
- Sound natural, not robotic
- Show you remember past conversations
- Offer genuine help
- Keep it warm and brief (2-3 sentences)
- Don't sound like a reminder app

Example good messages:
"Hi! I saw you have coffee with Emma tomorrow at 10am. Didn't you mention wanting 
to ask her advice about something? Want to talk through it?"

"Hope you're doing well! Your dentist appointment is coming up Thursday. I remember 
you were nervous about it last time - want to chat?"

BAD messages (avoid):
"Reminder: You have an appointment tomorrow."
"Just checking in! How are you?"
"Don't forget about your event!"
`;
```

## Phase 2 Architecture (RAG Enhancement)

### Vector Database Setup

**Option 1: Supabase pgvector (Recommended)**
- Free, integrated with existing DB
- Good performance for <1M vectors
- Easy to manage

**Option 2: Pinecone**
- Better for massive scale
- Managed service, costs extra
- Faster for >1M vectors

### Embedding Strategy

```typescript
// Embed important user data
const embeddingTypes = {
  conversations: 'Conversation on [date] about [topic]',
  events: 'Event: [name] on [date] with [context]',
  relationships: '[Person name]: [relationship] - [key facts]',
  preferences: 'User prefers [preference] for [context]',
  emotions: 'User felt [emotion] when discussing [topic]'
};

// Example embedded documents
[
  {
    id: 'conv-123',
    text: 'Conversation on Jan 10: User discussed feeling anxious about upcoming doctor visit for annual checkup',
    embedding: [0.234, -0.123, ...],
    metadata: { type: 'conversation', emotion: 'anxious', topic: 'health', date: '2026-01-10' }
  },
  {
    id: 'event-456',
    text: 'Event: Sarah's birthday on Jan 20. User mentioned wanting to get her a gardening book. Sarah is daughter.',
    embedding: [0.456, 0.789, ...],
    metadata: { type: 'event', person: 'Sarah', relationship: 'daughter', date: '2026-01-20' }
  }
]
```

### Retrieval Flow

```typescript
async function generateContextAwareProactive(userId) {
  // 1. Get structured data (upcoming events)
  const upcomingEvents = await getUpcomingEvents(userId, 48);
  
  // 2. For each event, retrieve relevant context via semantic search
  for (const event of upcomingEvents) {
    // Search for related memories
    const query = `${event.title} ${event.person} ${event.type}`;
    const relevantMemories = await vectorSearch(query, {
      userId,
      limit: 5,
      filters: { 
        type: ['conversation', 'preference', 'emotion'],
        date: { after: thirtyDaysAgo }
      }
    });
    
    // 3. Build enriched context
    const enrichedContext = {
      event,
      pastConversations: relevantMemories.filter(m => m.type === 'conversation'),
      preferences: relevantMemories.filter(m => m.type === 'preference'),
      emotions: relevantMemories.filter(m => m.type === 'emotion')
    };
    
    // 4. Generate hyper-personalized message
    const message = await generateWithContext(enrichedContext);
    
    return message;
  }
}
```

### Example Output Comparison

**Without RAG (Phase 1):**
> "Hi! I noticed Sarah's birthday is tomorrow. Want to chat about gift ideas?"

**With RAG (Phase 2):**
> "Hey! Sarah's birthday is tomorrow, and I remember you mentioned wanting to find her a gardening book last month. I found a few bestsellers on sustainable gardening - want me to share them? Also, you seemed a bit stressed about finding the perfect gift. Let's figure this out together!"

## Implementation Roadmap

### Week 1: Smart Structured Queries ✅ (Best ROI)
- [x] Add context scanner edge function
- [x] Query upcoming events from database
- [x] Build smart prompt with context
- [x] Generate personalized proactive messages
- [x] Schedule notifications at optimal times

### Week 2-3: Enhanced Context
- [ ] Add conversation topic extraction
- [ ] Track emotional patterns in chat
- [ ] Build relationship graph (who's who)
- [ ] Optimize notification timing based on user behavior

### Week 4-6: RAG Implementation
- [ ] Set up Supabase pgvector
- [ ] Create embedding pipeline
- [ ] Embed conversation history
- [ ] Implement semantic search
- [ ] A/B test RAG vs non-RAG messages

### Week 7+: Advanced Intelligence
- [ ] Multi-turn proactive conversations
- [ ] Predictive insights ("You usually feel anxious before...")
- [ ] Wellness pattern detection
- [ ] Relationship coaching mode

## Technology Stack

### Phase 1 (No RAG)
```
✅ Supabase Edge Functions (cron)
✅ PostgreSQL (existing data)
✅ OpenAI GPT-4 (prompt engineering)
✅ Notifee (notifications)
```

### Phase 2 (RAG)
```
🔹 Supabase pgvector (vector storage)
🔹 OpenAI Embeddings (text-embedding-3-small)
🔹 LangChain (optional - orchestration)
🔹 Semantic caching (reduce costs)
```

## Success Metrics

Track these to measure if we're beating the gold standard:

1. **Engagement Rate**: % of proactive messages that get a response
   - Target: >60% (vs industry 20-30%)

2. **User Sentiment**: How users feel about proactive messages
   - Target: >4.5/5 rating

3. **Usefulness Score**: Did the message help?
   - Target: >80% say "yes, this was helpful"

4. **Timing Accuracy**: Was the timing appropriate?
   - Target: >90% say "good timing"

5. **Personalization Score**: Did it feel personal?
   - Target: >4.7/5 "felt like PoCo really knows me"

## Privacy & Ethics

**Guardrails:**
- User can disable proactive messages anytime
- User controls what data is embedded
- Sensitive topics flagged and handled carefully
- Opt-in for calendar/contacts access
- Clear about what PoCo remembers
- Easy memory deletion

## Cost Analysis

### Phase 1 (Structured)
- Edge function calls: ~$0.50/month per user
- GPT-4 prompts: ~$2/month per user
- **Total: $2.50/user/month**

### Phase 2 (RAG)
- Embeddings: ~$0.10/month per user
- Vector storage: ~$0.20/month per user
- GPT-4 with RAG: ~$3/month per user
- **Total: $3.30/user/month**

**ROI:** If Phase 2 increases engagement by 50%, it's worth every penny.

## Next Steps

**I recommend we start with Phase 1 immediately:**
1. Build the context scanner
2. Test with 3-5 smart trigger scenarios
3. Measure engagement for 2 weeks
4. If users love it (>60% response rate), invest in Phase 2 RAG

**Ready to build Phase 1 now?**
