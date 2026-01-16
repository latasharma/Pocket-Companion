# SMS-Based Critical Medication Confirmation

## Overview

Based on real-world testing, we've implemented a **two-tier system**:

### Critical Medications (Escalation-Enabled):
- ✅ Notification reminder (no action buttons)
- ✅ **SMS with reply confirmation** - "Reply TAKEN or SKIP"
- ✅ User replies via SMS
- ✅ System updates dose status automatically
- ✅ Escalates to caregiver if no reply in 60 minutes

### Regular Medications:
- ✅ Notification reminder only
- ❌ No SMS
- ❌ No escalation
- ❌ No confirmation required

## Why SMS Instead of Notification Buttons?

**Problem with notification buttons:**
- Users can dismiss notifications without acting
- Buttons don't always appear reliably
- No confirmation trail
- Easy to ignore

**Benefits of SMS:**
- ✅ More reliable delivery
- ✅ Users are familiar with SMS replies
- ✅ Creates a confirmation trail
- ✅ Harder to ignore
- ✅ Works even if app is closed
- ✅ Can track delivery status

## User Flow

### Critical Medication Reminder

**6:00 PM - Medication Time:**

1. **Notification appears:**
   ```
   Title: Critical Medication Reminder
   Body: Time to take Aspirin. You will receive an SMS to confirm.
   ```

2. **SMS arrives (~same time):**
   ```
   PoCo Reminder: Time to take Aspirin. Reply TAKEN or SKIP to confirm.
   ```

3. **User replies:**
   - User: `TAKEN`
   - PoCo: `Thank you! Marked as taken.`
   
   OR
   
   - User: `SKIP`
   - PoCo: `Noted. Marked as skipped.`

4. **If no reply by 7:00 PM (60 min):**
   - Caregiver receives SMS: "PoCo alert: [Name] hasn't confirmed a scheduled medication reminder. Please check in."

### Regular Medication Reminder

**12:30 PM - Lunch Medication:**

1. **Notification appears:**
   ```
   Title: Medication Reminder
   Body: Time to take Vitamin D
   ```

2. **No SMS sent**
3. **No confirmation required**
4. **No escalation**

## Architecture

### Components Created:

1. **Edge Function: send-medication-sms**
   - Sends SMS via Twilio
   - Tracks when SMS was sent
   - Called at medication time

2. **Edge Function: handle-sms-reply** (Webhook)
   - Receives replies from Twilio
   - Parses TAKEN/SKIP
   - Updates dose_events table
   - Sends confirmation SMS back

3. **Client Service: SMSConfirmationService.js**
   - Schedules SMS to be sent
   - Interfaces with edge functions

4. **Database Updates:**
   - `profiles.phone` - User's phone number
   - `dose_events.confirmation_sms_sent_at` - Track SMS delivery

## Deployment Steps

### Step 1: Update Database Schema

Run in Supabase SQL Editor:

```sql
-- Add phone to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_phone 
  ON public.profiles(phone);

-- Add SMS tracking to dose_events
ALTER TABLE public.dose_events
  ADD COLUMN IF NOT EXISTS confirmation_sms_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dose_events_sms_sent 
  ON public.dose_events(confirmation_sms_sent_at);
```

### Step 2: Deploy Edge Functions

```bash
# Deploy the SMS sender
supabase functions deploy send-medication-sms

# Deploy the webhook handler
supabase functions deploy handle-sms-reply
```

### Step 3: Configure Twilio Webhook

1. Go to Twilio Console → Phone Numbers
2. Select your PoCo phone number
3. Under "Messaging" → "A MESSAGE COMES IN":
   - Set to: `Webhook`
   - URL: `https://derggkmbocosxcxhnwvf.supabase.co/functions/v1/handle-sms-reply`
   - HTTP: `POST`
4. Save

### Step 4: Add Phone Number Collection

User needs to provide their phone number in profile/settings.

**Add to profile screen:**
```javascript
<TextInput
  label="Phone Number"
  placeholder="+1234567890"
  value={phone}
  onChangeText={setPhone}
  keyboardType="phone-pad"
/>
```

### Step 5: Test the Flow

1. **Add phone number** to your profile
2. **Create critical medication** with escalation enabled
3. **Set reminder** for 2-3 minutes from now
4. **Wait for SMS**
5. **Reply TAKEN or SKIP**
6. **Verify** dose status updated in database

## SMS Message Templates

### Confirmation Request:
```
PoCo Reminder: Time to take [Medication Name]. Reply TAKEN or SKIP to confirm.
```

### Taken Confirmation:
```
Thank you! Marked as taken.
```

### Skip Confirmation:
```
Noted. Marked as skipped.
```

### Help Message (invalid reply):
```
Please reply TAKEN or SKIP to confirm your medication.
```

### Not Found:
```
No pending medication found. You may have already confirmed this dose.
```

### Caregiver Escalation:
```
PoCo alert: [User Name] hasn't confirmed a scheduled medication reminder. Please check in.
```

## Cost Analysis

### Per Critical Medication Dose:
- SMS to user: $0.0075
- SMS reply from user: $0.0075  
- Confirmation SMS back: $0.0075
- **Total: ~$0.02 per dose**

### Monthly Cost (1 critical med, 2x/day):
- 60 doses/month × $0.02 = **$1.20/user/month**

Still very affordable, and **much more reliable** than notification buttons.

## Monitoring

### Check SMS Delivery:
```sql
-- See recent SMS confirmations
SELECT 
  de.id,
  m.name as medication,
  de.scheduled_at,
  de.confirmation_sms_sent_at,
  de.status,
  de.confirmed_at
FROM dose_events de
JOIN medications m ON m.id = de.medication_id
WHERE de.confirmation_sms_sent_at IS NOT NULL
ORDER BY de.scheduled_at DESC
LIMIT 20;
```

### Track Response Rate:
```sql
-- SMS response rate
SELECT 
  COUNT(*) FILTER (WHERE status IN ('taken', 'skipped')) as confirmed,
  COUNT(*) FILTER (WHERE status = 'pending' AND confirmation_sms_sent_at IS NOT NULL) as pending,
  COUNT(*) as total,
  ROUND(COUNT(*) FILTER (WHERE status IN ('taken', 'skipped'))::numeric / COUNT(*) * 100, 2) as response_rate_pct
FROM dose_events
WHERE confirmation_sms_sent_at IS NOT NULL
  AND scheduled_at > NOW() - INTERVAL '7 days';
```

## Troubleshooting

### "SMS not received"
- Check Twilio delivery logs
- Verify phone number format (+1234567890)
- Check Twilio balance

### "Reply not working"
- Verify webhook URL is correct in Twilio
- Check edge function logs
- Ensure phone number matches profile

### "Dose not updating"
- Check if dose_event exists
- Verify confirmation_sms_sent_at is set
- Look for errors in handle-sms-reply logs

## Future Enhancements

1. **Voice call fallback** - If SMS not confirmed, call user
2. **Multiple languages** - Support SMS in user's language
3. **Smart retry** - Resend SMS if not delivered
4. **Analytics dashboard** - Track adherence patterns
5. **Family sharing** - Multiple caregivers can receive alerts

## Comparison

| Method | Reliability | User Familiarity | Cost | Confirmation Trail |
|--------|-------------|------------------|------|-------------------|
| Notification buttons | ⚠️ Medium | ⚠️ Medium | Free | ❌ |
| **SMS Reply** | ✅ High | ✅ Very High | ~$0.02 | ✅ |
| In-app modal | ⚠️ Medium | ✅ High | Free | ✅ |

**Winner: SMS Reply** - Most reliable for critical medications where confirmation is essential.
