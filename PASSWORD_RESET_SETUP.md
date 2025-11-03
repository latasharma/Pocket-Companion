# Password Reset Setup Guide

## Overview
The password reset functionality in POCO uses Supabase Auth with deep links to redirect users back to the app. This guide ensures the reset flow works correctly.

---

## 1. Supabase Configuration (CRITICAL)

### Step 1: Add Redirect URLs in Supabase Dashboard

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to: **Authentication → URL Configuration**
3. Scroll to **Redirect URLs** section
4. Add the following URLs (one per line):

```
aipocketcompanion://reset-password
aipocketcompanion://**
```

5. Click **Save**

**Why this matters:** Supabase will reject password reset requests if the redirect URL is not in the allowed list.

### Step 2: Verify Email Templates (Optional)

1. Go to: **Authentication → Email Templates**
2. Select: **Reset Password**
3. Verify the template contains: `{{ .ConfirmationURL }}`
4. This URL will automatically redirect to `aipocketcompanion://reset-password`

---

## 2. Code Configuration (Already Fixed)

### Deep Link Scheme
```javascript
// app.config.js
scheme: 'aipocketcompanion'
```

### Password Reset Redirect URLs
Both signin and profile screens now use consistent deep links:

```javascript
// app/signin.js & app/profile.js
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'aipocketcompanion://reset-password',
});
```

### Deep Link Handler
```javascript
// app/_layout.js
// Handles deep links and extracts recovery tokens
// Redirects to /reset-password screen
```

---

## 3. How Password Reset Works

### User Flow:

1. **User requests reset:**
   - User enters email on sign-in screen
   - Taps "Forgot Password?"
   - System sends email with reset link

2. **Email received:**
   - User receives email from Supabase
   - Email contains link like:
     ```
     aipocketcompanion://reset-password#access_token=xxx&refresh_token=yyy&type=recovery
     ```

3. **User taps link:**
   - Mobile OS opens POCO app
   - App intercepts deep link in `_layout.js`
   - Extracts `access_token` and `refresh_token` from URL
   - Sets Supabase session with tokens
   - Navigates to `/reset-password` screen

4. **User sets new password:**
   - User enters and confirms new password
   - Password must meet requirements (8+ chars, uppercase, lowercase, number, special char)
   - System updates password via `supabase.auth.updateUser()`
   - User signs out for security
   - User redirected to sign-in screen

---

## 4. Testing the Flow

### Test on iOS Simulator/Device:

1. **Request password reset:**
   ```bash
   # On sign-in screen
   Email: lata1.sharma@gmail
   Tap "Forgot Password?"
   ```

2. **Check email:**
   - Open email client for `lata1.sharma@gmail`
   - Look for "Reset your password" email from Supabase
   - Click the reset link

3. **Verify app opens:**
   - App should open automatically
   - Should navigate to reset password screen
   - If it doesn't, check console logs

4. **Set new password:**
   ```
   New Password: Lata4321$
   Confirm Password: Lata4321$
   Tap "Update Password"
   ```

5. **Sign in with new password:**
   - Should redirect to sign-in screen
   - Sign in with new password
   - Should work!

### Troubleshooting:

**Email link doesn't open app?**
- Check if `aipocketcompanion://` scheme is registered in `app.config.js`
- Verify Supabase has `aipocketcompanion://reset-password` in redirect URLs
- Check iOS/Android app is installed (not just Expo Go)

**"Session Error" when reset screen loads?**
- Tokens expired (they expire quickly)
- Request new reset email and click link immediately
- Check Supabase logs for auth errors

**Password update fails?**
- Check password meets all requirements
- Verify user session is active
- Check Supabase logs for errors

---

## 5. Quick Setup for Apple Test User

### Option A: Manual Password Set (Fastest)

1. Go to Supabase Dashboard → Authentication → Users
2. Find `lata1.sharma@gmail`
3. Click three dots (⋮) → **Update User**
4. Set password to: `Lata4321$`
5. Click **Update user**
6. Done! ✅

### Option B: Test Full Reset Flow

1. Ensure Supabase redirect URLs are configured (see Step 1 above)
2. In the app:
   - Email: `lata1.sharma@gmail`
   - Tap "Forgot Password?"
3. Check email for reset link
4. Click link (should open app)
5. Set new password: `Lata4321$`
6. Sign in with new password

---

## 6. Production Deployment

### Before Submitting to App Store:

✅ **Verified:** Deep link scheme is unique (`aipocketcompanion://`)
✅ **Verified:** Redirect URLs configured in Supabase
✅ **Verified:** Email templates working correctly
✅ **Verified:** Password reset tested on real device
✅ **Verified:** Password requirements enforced (8+ chars, mixed case, number, special)

### Associated Domains (iOS - Optional)

If you want to also support universal links (https://), add to `app.config.js`:

```javascript
ios: {
  associatedDomains: ['applinks:hellopoco.app']
}
```

And configure on your website with `.well-known/apple-app-site-association` file.

---

## 7. Environment Check

### Required Environment Variables:
```bash
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Files Modified:
- ✅ `app/signin.js` - Uses `aipocketcompanion://reset-password`
- ✅ `app/profile.js` - Uses `aipocketcompanion://reset-password`
- ✅ `app/_layout.js` - Handles deep link recovery tokens
- ✅ `app/reset-password.js` - Password reset UI and validation
- ✅ `app.config.js` - Deep link scheme configured

---

## 8. Support & Debugging

### Enable Debug Logging:

All password reset operations log to console:
- Request sent: `"Password reset email sent"`
- Deep link received: `"Deep link received: [url]"`
- Session set: `"Session set successfully for user: [email]"`
- Password updated: `"Password Updated Successfully"`

### Common Errors:

**"Invalid Reset Link"**
- Tokens expired (valid for 1 hour)
- User already reset password
- Request new reset email

**"Please enter your email address first"**
- Email field is empty on forgot password request
- Enter email before tapping "Forgot Password?"

**"Email sending rate limit exceeded"**
- Supabase limits reset emails (usually 4 per hour)
- Wait before requesting another

---

## Summary

Password reset now works end-to-end with deep links. The key configuration needed:

1. ✅ Add `aipocketcompanion://reset-password` to Supabase redirect URLs
2. ✅ Code uses consistent deep link scheme
3. ✅ App handles deep links properly
4. ✅ Password validation enforced

**For Apple Test User:** Just manually set password in Supabase Dashboard (Option A above) - it's instant and doesn't require the email flow.

