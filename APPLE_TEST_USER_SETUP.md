# Apple Test User Setup Guide

## Test Account Credentials
- **Email:** `lata1.sharma@gmail`
- **Password:** `Lata4321$`

---

## 🔧 REQUIRED: Supabase Configuration First

**Before password reset will work, you MUST configure Supabase:**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication → URL Configuration**
2. Scroll to **Redirect URLs** section
3. Add these URLs (click Save after):
   ```
   aipocketcompanion://reset-password
   aipocketcompanion://**
   ```

**This is critical!** Without this, password reset emails won't work properly.

---

## Quick Setup (Choose One Method)

### Method 1: Supabase Dashboard (Recommended - Simplest)

1. **Reset Password:**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Navigate to: **Authentication → Users**
   - Find user: `lata1.sharma@gmail`
   - Click the **three dots (⋮)** → **Send Magic Link** OR **Update User**
   - Manually set password to: `Lata4321$`

2. **Grant Premium Access:**
   - Go to: **Table Editor → profiles**
   - Find the row for `lata1.sharma@gmail` (match the user ID)
   - Click to edit and update these fields:
     ```
     subscription_tier: premium
     subscription_status: active
     subscription_end_date: (30 days from now)
     connect_onboarding_completed: true
     ```
   - Click **Save**

---

### Method 2: SQL Script (Fast)

1. **Reset Password in Dashboard** (see Method 1 step 1)

2. **Run SQL Script:**
   - Go to: **SQL Editor** in Supabase Dashboard
   - Open and run: `setup-apple-test-user.sql`
   - This will:
     - Grant Premium access (30 days)
     - Set up Connect profile
     - Verify the setup

---

### Method 3: Node.js Script (Automated)

1. **Get Service Role Key:**
   - Go to: **Settings → API** in Supabase
   - Copy the `service_role` secret key (NOT the anon key)

2. **Add to .env file:**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

3. **Run the script:**
   ```bash
   node setup-apple-test-user.js
   ```
   
   This will automatically:
   - Reset the password to `Lata4321$`
   - Grant Premium access (30 days)
   - Set up Connect profile
   - Display confirmation

---

## What This Setup Provides

✅ **Full Premium Access** (30 days)
- All AI chat features
- Unlimited voice messages
- **Connect feature** (find and connect with people)
- All premium features unlocked

✅ **Connect Profile Pre-configured**
- Interests: Technology, Mobile Apps, AI, Health, Productivity
- Ready to discover and connect with test users

✅ **Ready for Testing**
- Sign in immediately
- No onboarding required (already completed)
- All features accessible

---

## Verification

After setup, verify in the app:
1. Sign in with `lata1.sharma@gmail` / `Lata4321$`
2. Check Profile → Should show "Premium" subscription
3. Navigate to Connect → Should have full access (no upgrade prompt)
4. Test AI chat, voice messages, and Connect features

---

## Test Users for Connect Feature

The account will be able to discover and connect with these test users:
- Sarah Johnson (Music, Books, Travel)
- Mike Chen (Technology, Fitness, Gaming)
- Emma Rodriguez (Art, Wellness, Food)
- Alex Thompson (Sports, Books, Technology)
- Jordan Williams (Art, Music, Photography)
- Taylor Brown (Technology, Fitness, Books)
- Casey Davis (Gaming, Music, Art)
- Morgan Wilson (Wellness, Books, Travel)

---

## Troubleshooting

**Can't sign in?**
- Verify password was reset correctly
- Check if email confirmation is required (should be auto-confirmed)

**No Premium access?**
- Run the SQL script to grant access
- Check `profiles` table has correct `subscription_tier` and `subscription_status`

**Connect not accessible?**
- Verify `subscription_tier` is 'premium' or 'pro'
- Check `subscription_end_date` is in the future
- Ensure `has_connect_access()` function returns true

---

## Support

If you need help:
1. Check Supabase logs for any errors
2. Verify all database tables are set up correctly
3. Ensure environment variables are configured

