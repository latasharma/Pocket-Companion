# Proactive Check-in Feature

## Overview
PoCo proactively reaches out to users who haven't interacted with the app for 8 hours, sending a friendly notification to check in and start a conversation.

## How It Works

### 1. Tracking User Activity
- Every time a user sends a message, `last_interaction_at` timestamp is updated in their profile
- This timestamp is stored in Supabase `profiles` table

### 2. Scheduling Check-ins
- When user sends a message, a notification is scheduled for 8 hours later
- Previous scheduled check-in is automatically cancelled and rescheduled
- If app is reopened before 8 hours, the check-in recalculates and reschedules

### 3. Notification Delivery
- After 8 hours of inactivity, user receives a friendly notification
- Messages rotate randomly from a pool of warm, conversational greetings:
  - "Just checking in! 👋"
  - "Thinking of you! 💭"
  - "Miss chatting with you! 😊"
  - "Hope you're well! 🌟"

### 4. Starting Conversation
- When user taps the notification, the app opens
- PoCo's greeting message is automatically added to the chat
- User can respond naturally, continuing the conversation

## Implementation Details

### Database Schema
```sql
-- profiles table
ALTER TABLE public.profiles
  ADD COLUMN last_interaction_at TIMESTAMPTZ DEFAULT NOW();
```

### Key Files
- **`lib/ProactiveCheckinService.js`** - Core service managing check-in logic
- **`app/chat.js`** - Integration with chat screen
- **`lib/NotificationService.js`** - Notification handler

### Functions

#### `handleUserInteraction()`
Called when user sends a message:
- Updates `last_interaction_at` in database
- Cancels previous check-in
- Schedules new check-in for 8 hours later

#### `initializeProactiveCheckIn()`
Called on app start:
- Checks last interaction time
- If already inactive (>8 hours), schedules immediate check-in
- If still active, calculates remaining time and schedules accordingly

#### `getPendingCheckInGreeting()`
Called when app opens:
- Retrieves stored greeting message if notification was tapped
- Adds greeting to chat automatically
- Clears pending greeting after use

## Configuration

### Adjusting Inactivity Period
Edit `INACTIVITY_HOURS` in `lib/ProactiveCheckinService.js`:
```javascript
const INACTIVITY_HOURS = 8; // Change to desired hours
```

### Customizing Messages
Edit `CHECK_IN_MESSAGES` array in `lib/ProactiveCheckinService.js`:
```javascript
const CHECK_IN_MESSAGES = [
  {
    title: "Your notification title",
    body: "Your notification body",
    greeting: "The message PoCo will say in chat"
  },
  // Add more messages...
];
```

## User Experience Flow

1. **User sends message** → Timer starts (8 hours)
2. **User sends another message** → Timer resets (new 8 hours)
3. **8 hours of silence** → Notification sent
4. **User taps notification** → App opens, PoCo greets them
5. **User responds** → Timer resets, conversation continues

## Privacy & Control

- No push to external servers - all scheduling is local
- Users can disable notifications in device settings
- Greeting messages are stored locally, not sent to database
- Check-ins only happen when app has notification permission

## Testing

To test with shorter intervals during development:
1. Change `INACTIVITY_HOURS` to `0.05` (3 minutes)
2. Send a message in chat
3. Wait 3 minutes
4. Receive check-in notification
5. Tap notification to see greeting appear

## Future Enhancements

Possible additions:
- User setting to customize check-in frequency
- Different messages based on time of day
- Context-aware greetings (e.g., "How was your morning medication?")
- Integration with health/wellness check-ins
