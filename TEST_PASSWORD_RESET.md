# 🧪 Password Reset - Full Flow Testing Guide

**Date:** October 28, 2025  
**Tester:** Lata  
**Status:** Ready to test

---

## 📋 Pre-Test Checklist

Before starting, ensure:

- [ ] `reset-password.html` is deployed to `https://www.hellopoco.app/reset-password`
- [ ] Supabase redirect URLs configured:
  - `https://www.hellopoco.app/reset-password`
  - `https://www.hellopoco.app/*`
- [ ] You have access to test email account
- [ ] PoCo app is installed on your device

---

## 🎬 Test Flow #1: Complete Password Reset (MAIN TEST)

### **Step 1: Request Password Reset**

**Action:**
1. Open PoCo app
2. Go to Sign In screen
3. Enter your email: `lata1.sharma@gmail.com` (or your test email)
4. Tap **"Forgot Password?"** button

**Expected Result:**
```
✅ Alert appears: "Reset Link Sent"
✅ Message: "Check your email for a password reset link. 
             Click the link to securely reset your password."
✅ Button: "OK"
```

**If it fails:**
- Check email is entered correctly
- Check internet connection
- Check Supabase logs for errors

---

### **Step 2: Check Email**

**Action:**
1. Open email inbox for `lata1.sharma@gmail.com`
2. Look for email from Supabase/PoCo
3. Subject should be: "Reset your password" or similar

**Expected Result:**
```
✅ Email arrives within 1-2 minutes
✅ Contains a "Reset Password" link/button
✅ Link starts with: https://www.hellopoco.app/reset-password
```

**Email Link Format:**
```
https://www.hellopoco.app/reset-password#access_token=eyJh...&refresh_token=...&type=recovery
```

**If it fails:**
- Check spam folder
- Wait 2-3 minutes
- Check Supabase Dashboard → Authentication → Logs
- Verify redirect URL is configured

---

### **Step 3: Click Reset Link**

**Action:**
1. Click the reset password link in email

**Expected Result:**
```
✅ Browser opens to: https://www.hellopoco.app/reset-password
✅ Page loads successfully
✅ Shows: PoCo logo (🤖) at top
✅ Heading: "🔐 Reset your password"
✅ Lead text: "Enter your new password below."
✅ Shows: Password form (NOT email form)
✅ URL cleans up (tokens removed from address bar after a moment)
```

**What You Should See:**
- Logo: Green square with 🤖 emoji
- Two password fields:
  - "New password"
  - "Confirm password"
- Password requirements box (gray checkmarks)
- Two buttons: "Set New Password" (green) and "Clear" (white)

**If it fails:**
- **404 Error:** File not deployed to correct URL
- **Shows email form instead:** Tokens not detected
- **Error message:** Tokens invalid/expired
- **Check browser console** for JavaScript errors

---

### **Step 4: Enter New Password**

**Action:**
1. In "New password" field, type: `TestPass123!`
2. Watch the requirements as you type

**Expected Result:**
```
✅ As you type, checkmarks turn GREEN one by one:
   ✓ At least 8 characters (green)
   ✓ One uppercase letter (green)
   ✓ One lowercase letter (green)
   ✓ One number (green)
   ✓ One special character (green)
```

**If it fails:**
- Requirements stay gray: JavaScript not running
- Check browser console for errors

---

### **Step 5: Confirm Password**

**Action:**
1. In "Confirm password" field, type: `TestPass123!` (same password)
2. Click **"Set New Password"** button

**Expected Result:**
```
✅ Button changes to: "Saving..."
✅ Button is disabled (grayed out)
✅ After 1-2 seconds...
```

**If it fails:**
- Error: "Passwords do not match" → Confirm password is different
- Error: "Password must meet all requirements" → Requirements not met
- Error: "Failed to update password" → Supabase error (check logs)

---

### **Step 6: 🎉 SUCCESS BANNER**

**Expected Result:**
```
✅ Password form DISAPPEARS
✅ BIG SUCCESS BANNER appears with animation!

┌─────────────────────────────────────────┐
│                                         │
│              ✅ (big emoji)             │
│                                         │
│    Password updated successfully!       │
│                                         │
│ You can now sign in to PoCo with your  │
│           new password.                 │
│                                         │
│     [  Open PoCo App  ]  (green btn)   │
│                                         │
│      Or visit hellopoco.app             │
│                                         │
└─────────────────────────────────────────┘
```

**This is the key improvement!**
- Large checkmark emoji ✅
- Clear success message
- Button to open app
- Should fade in smoothly

**If it fails:**
- No banner appears → Check console for errors
- Password not updated → Check Supabase logs

---

### **Step 7: Verify in Supabase**

**Action:**
1. Open [Supabase Dashboard](https://supabase.com/dashboard/project/derggkmbocosxcxhnwvf/auth/users)
2. Go to: Authentication → Users
3. Find your user: `lata1.sharma@gmail.com`

**Expected Result:**
```
✅ User's "Last Sign In" or "Updated At" timestamp is recent
✅ In Auth Logs: See "user.updated" event
```

**To check logs:**
1. Authentication → Logs
2. Filter by email
3. Look for recent events

---

### **Step 8: Open App**

**Action:**
1. On the success banner page, click **"Open PoCo App"** button

**Expected Result:**
```
✅ Browser asks: "Open in PoCo?"
✅ Click "Open" / "Allow"
✅ PoCo app opens
✅ Navigates to sign-in screen (or may open to signin already)
```

**If it fails:**
- Deep link not working → App not configured
- Nothing happens → Check deep link URL scheme
- On mobile: Make sure app is installed (not Expo Go)

---

### **Step 9: Sign In with New Password**

**Action:**
1. In PoCo app sign-in screen
2. Email: `lata1.sharma@gmail.com`
3. Password: `TestPass123!` (your new password)
4. Tap **"Sign In"**

**Expected Result:**
```
✅ Successfully signs in!
✅ Navigates to home screen
✅ User is authenticated
```

**If it fails:**
- Error: "Invalid credentials" → Password not actually updated
- Check Supabase to confirm password was changed
- Try requesting another reset

---

## 🎬 Test Flow #2: Request Reset from Web Page

This tests the dual-mode feature!

### **Step 1: Visit Page Directly**

**Action:**
1. Open browser
2. Go to: `https://www.hellopoco.app/reset-password` (no tokens)

**Expected Result:**
```
✅ Page loads
✅ Shows: PoCo logo
✅ Heading: "🔐 Reset your password"
✅ Lead text: "Enter your email to get a secure reset link."
✅ Shows: EMAIL form (NOT password form)
✅ One field: "Email address"
✅ Button: "Send Reset Link"
```

---

### **Step 2: Request Reset**

**Action:**
1. Enter email: `lata1.sharma@gmail.com`
2. Click **"Send Reset Link"**

**Expected Result:**
```
✅ Button changes to: "Sending..."
✅ Green success message appears:
   "✅ Check your email for a secure reset link. 
    It will open this page with your session."
✅ Button changes back to: "Send Reset Link"
```

---

### **Step 3: Continue from Email**

**Action:**
1. Check email
2. Click reset link
3. Continue with Test Flow #1, Step 3

---

## 🎬 Test Flow #3: Error Handling

### **Test A: Invalid Tokens**

**Action:**
1. Visit: `https://www.hellopoco.app/reset-password#access_token=invalid&type=recovery`

**Expected Result:**
```
✅ Error message appears (red box)
✅ Message: "Could not verify reset link. Please request a new one."
✅ Page falls back to EMAIL form
✅ User can request new reset link
```

---

### **Test B: Expired Link**

**Action:**
1. Request reset
2. Wait 2+ hours
3. Click link

**Expected Result:**
```
✅ Error about expired/invalid tokens
✅ Falls back to request form
✅ User can request new link
```

---

### **Test C: Mismatched Passwords**

**Action:**
1. Get to password form
2. Password: `TestPass123!`
3. Confirm: `DifferentPass123!`
4. Click "Set New Password"

**Expected Result:**
```
✅ Red error message: "Passwords do not match"
✅ Form stays visible
✅ User can try again
```

---

### **Test D: Weak Password**

**Action:**
1. Get to password form
2. Password: `test`
3. Click "Set New Password"

**Expected Result:**
```
✅ Red error message: "Password must be at least 8 characters"
  OR "Please ensure your password meets all requirements"
✅ Requirements stay gray (not green)
✅ Form stays visible
```

---

## 📊 Testing Checklist

### **Visual Elements**
- [ ] Logo displays correctly (🤖)
- [ ] Colors match PoCo branding (green: #10b981)
- [ ] Forms are responsive (try resizing browser)
- [ ] Buttons have hover effects
- [ ] Password requirements turn green in real-time

### **Functionality**
- [ ] Email form works (request reset)
- [ ] Password form works (reset password)
- [ ] Real-time validation works
- [ ] Success banner appears
- [ ] Deep link button works
- [ ] Error messages display correctly
- [ ] Button loading states work

### **Token Handling**
- [ ] Legacy hash tokens work (`#access_token=...`)
- [ ] PKCE code works (`?code=...`)
- [ ] token_hash works (`?token_hash=...`)
- [ ] URL gets cleaned after session set

### **Error Cases**
- [ ] Expired tokens show error
- [ ] Invalid tokens show error
- [ ] Mismatched passwords show error
- [ ] Weak passwords show error
- [ ] Missing email shows error

---

## 🐛 Common Issues & Solutions

### **Issue: Page shows 404**
**Solution:**
- File not deployed
- Deploy `reset-password.html` to web server
- Verify URL: `https://www.hellopoco.app/reset-password`

### **Issue: Email form instead of password form**
**Solution:**
- Tokens not in URL
- Check email link contains tokens
- Verify tokens haven't expired

### **Issue: No success banner**
**Solution:**
- Check browser console for errors
- Verify JavaScript is loading
- Check element ID is `successBanner`

### **Issue: Deep link doesn't work**
**Solution:**
- On iOS: Install development build (not Expo Go)
- Verify scheme in app.config.js: `aipocketcompanion`
- Check device/simulator has app installed

### **Issue: Password not updating**
**Solution:**
- Check Supabase logs for errors
- Verify session is valid
- Check password meets requirements
- Try requesting new reset link

---

## 📝 Test Results Template

**Test Date:** ___________  
**Tester:** Lata Sharma  
**Environment:** Production / Staging  

| Test | Status | Notes |
|------|--------|-------|
| Request reset from app | ⬜ Pass / ⬜ Fail | |
| Email arrives | ⬜ Pass / ⬜ Fail | |
| Click link opens page | ⬜ Pass / ⬜ Fail | |
| Password form shows | ⬜ Pass / ⬜ Fail | |
| Real-time validation | ⬜ Pass / ⬜ Fail | |
| Password updates | ⬜ Pass / ⬜ Fail | |
| **Success banner appears** | ⬜ Pass / ⬜ Fail | **KEY TEST** |
| Deep link opens app | ⬜ Pass / ⬜ Fail | |
| Sign in with new password | ⬜ Pass / ⬜ Fail | |
| Request from web page | ⬜ Pass / ⬜ Fail | |
| Error handling | ⬜ Pass / ⬜ Fail | |

**Overall Result:** ⬜ Pass / ⬜ Fail  
**Comments:**

---

## ✅ Success Criteria

Password reset is **SUCCESSFUL** if:

1. ✅ User can request reset from app
2. ✅ Email arrives with reset link
3. ✅ Click link opens correct page
4. ✅ Password form displays with validation
5. ✅ **BIG SUCCESS BANNER appears after update** ← KEY!
6. ✅ Password is updated in Supabase
7. ✅ User can sign in with new password
8. ✅ Deep link opens app
9. ✅ Errors are handled gracefully

---

## 📞 Support

**If something doesn't work:**

1. Check browser console for errors (F12 → Console)
2. Check Supabase logs for auth errors
3. Verify all deployment checklist items
4. Review `PASSWORD_RESET_IMPROVEMENTS.md` for details

---

**Ready to test! Good luck! 🚀**

**Expected testing time:** 15-20 minutes for full flow

