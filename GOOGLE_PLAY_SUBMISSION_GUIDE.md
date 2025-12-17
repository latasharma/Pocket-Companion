# Google Play Store Submission Guide - POCO Android App

**Date:** November 4, 2025  
**Version:** 2.0.0 Build #1

---

## 📋 **Prerequisites**

### **1. Google Play Console Account**
- ✅ Create account at https://play.google.com/console
- ✅ Pay one-time $25 registration fee
- ✅ Complete developer account setup

### **2. Required Assets**
- ✅ App icon (512x512 PNG, no alpha)
- ✅ Feature graphic (1024x500 PNG)
- ✅ Screenshots (at least 2, up to 8)
- ✅ Privacy Policy URL (required)

---

## 🔧 **Step 1: Configure Android Settings**

### **Update `app.config.js`:**

Add Android-specific configuration:

```javascript
android: {
  package: 'com.hellopoco.poco',  // Must match iOS bundle ID pattern
  versionCode: 1,                  // Increment for each build
  adaptiveIcon: {
    foregroundImage: './assets/images/adaptive-icon.png',
    backgroundColor: '#ffffff'
  },
  permissions: [
    'CAMERA',
    'RECORD_AUDIO',
    'READ_EXTERNAL_STORAGE',
    'WRITE_EXTERNAL_STORAGE',
    'ACCESS_FINE_LOCATION',
    'ACCESS_COARSE_LOCATION',
    'READ_CONTACTS'
  ],
  edgeToEdgeEnabled: true
}
```

### **Update `eas.json`:**

Add Android build configuration:

```json
{
  "build": {
    "production": {
      "autoIncrement": false,
      "android": {
        "image": "sdk-53"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./path/to/service-account-key.json"
      }
    }
  }
}
```

---

## 🏗️ **Step 2: Build Android App**

### **Command:**
```bash
eas build --platform android --profile production
```

**Build Time:** ~20-30 minutes

**What Happens:**
- EAS creates an Android App Bundle (AAB) file
- Signs the app with your keystore
- Uploads to EAS servers

---

## 🔐 **Step 3: Set Up Google Play Service Account**

### **Why:**
Google Play requires a service account for automated submissions.

### **Steps:**

1. **Go to Google Cloud Console:**
   - https://console.cloud.google.com

2. **Create/Select Project:**
   - Create new project or select existing

3. **Enable Google Play Android Developer API:**
   - Navigate to APIs & Services → Library
   - Search "Google Play Android Developer API"
   - Click "Enable"

4. **Create Service Account:**
   - Go to IAM & Admin → Service Accounts
   - Click "Create Service Account"
   - Name: "EAS Submit"
   - Role: "Editor" (or custom role with Play API access)

5. **Create Key:**
   - Click on service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Choose JSON format
   - Download the key file

6. **Link to Play Console:**
   - Go to Google Play Console
   - Settings → API access
   - Link your service account
   - Grant "Release apps" permission

7. **Save Key File:**
   - Save JSON file securely (e.g., `google-play-service-account.json`)
   - Add to `.gitignore` (NEVER commit this file!)

---

## 📤 **Step 4: Submit to Google Play**

### **Option A: Using EAS Submit (Automated)**

1. **Add service account key to `eas.json`:**
```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json"
      }
    }
  }
}
```

2. **Submit:**
```bash
eas submit --platform android --profile production --latest
```

### **Option B: Manual Upload**

1. **Download AAB file:**
   - From EAS build artifacts
   - Or download from build page

2. **Go to Google Play Console:**
   - https://play.google.com/console

3. **Create App (if first time):**
   - Click "Create app"
   - Fill in app details:
     - App name: "POCO"
     - Default language: English
     - App or game: App
     - Free or paid: Free

4. **Upload AAB:**
   - Go to Production → Create new release
   - Upload AAB file
   - Add release notes

5. **Complete Store Listing:**
   - App name: POCO
   - Short description (80 chars max)
   - Full description (4000 chars max)
   - App icon (512x512)
   - Feature graphic (1024x500)
   - Screenshots (at least 2)
   - Privacy Policy URL (REQUIRED)

6. **Content Rating:**
   - Complete content rating questionnaire
   - Get rating certificate

7. **Privacy Policy:**
   - Must have privacy policy URL
   - Can use: https://www.hellopoco.app/privacy

8. **Target Audience:**
   - Select target age group
   - Complete data safety form

9. **Submit for Review:**
   - Review all information
   - Click "Submit for review"

---

## ✅ **Pre-Submission Checklist**

### **App Configuration:**
- [ ] Android package name set (`com.hellopoco.poco`)
- [ ] Version code set (starts at 1)
- [ ] Version name matches iOS (2.0.0)
- [ ] Permissions configured
- [ ] Adaptive icon configured

### **Build:**
- [ ] Android build completed successfully
- [ ] AAB file generated
- [ ] App signed with keystore

### **Google Play Console:**
- [ ] Developer account created ($25 paid)
- [ ] App created in Play Console
- [ ] Service account configured (for EAS submit)
- [ ] Store listing completed:
  - [ ] App name
  - [ ] Description
  - [ ] Screenshots
  - [ ] Feature graphic
  - [ ] App icon
- [ ] Privacy policy URL added
- [ ] Content rating completed
- [ ] Data safety form completed

### **Compliance:**
- [ ] No medication reminder features (same as iOS)
- [ ] Privacy permissions explained
- [ ] Terms of service available
- [ ] Support contact information

---

## 📝 **Required Information for Store Listing**

### **App Name:**
POCO

### **Short Description (80 chars):**
AI companion for meaningful conversations and emotional support.

### **Full Description (4000 chars max):**
```
POCO is your AI companion designed for meaningful conversations and emotional support. 

Features:
• Natural voice conversations with press-and-hold recording
• Persistent memory that remembers your preferences
• Personalized companion that learns about you
• Secure, encrypted conversations
• Beautiful, simple interface designed for ease of use

Connect with your AI companion through text or voice, and build a relationship that grows over time. POCO remembers your conversations, preferences, and important details to provide personalized support.

Privacy and Security:
• End-to-end encrypted conversations
• Your data is private and secure
• No medication tracking or health features
• Full control over your data

Perfect for:
• Daily companionship and conversation
• Emotional support and connection
• Memory assistance and reminders
• Social connection and community

Download POCO today and start your journey with your AI companion.
```

### **Privacy Policy URL:**
https://www.hellopoco.app/privacy

### **Support URL:**
https://www.hellopoco.app/support

---

## 🚨 **Common Issues & Solutions**

### **Issue: Service Account Permission Denied**
**Solution:** Ensure service account has "Release apps" permission in Play Console

### **Issue: Package Name Already Exists**
**Solution:** Use unique package name (e.g., `com.hellopoco.poco.android`)

### **Issue: Version Code Already Used**
**Solution:** Increment version code in `app.config.js`

### **Issue: Missing Privacy Policy**
**Solution:** Add privacy policy URL (required for all apps)

### **Issue: Content Rating Required**
**Solution:** Complete content rating questionnaire in Play Console

---

## 📊 **Version Management**

### **Version Code (versionCode):**
- Integer that increments with each build
- Start at 1, increment by 1 for each release
- Example: 1, 2, 3, 4...

### **Version Name (version):**
- Human-readable version string
- Matches iOS version
- Example: "2.0.0"

### **Updating for Next Release:**
```javascript
// app.config.js
android: {
  versionCode: 2,  // Increment this
  // version stays "2.0.0" until major update
}
```

---

## 🔄 **Update Workflow**

### **For Each New Release:**

1. **Update version code:**
   ```javascript
   android: {
     versionCode: 2,  // Increment
   }
   ```

2. **Build:**
   ```bash
   eas build --platform android --profile production
   ```

3. **Submit:**
   ```bash
   eas submit --platform android --profile production --latest
   ```

4. **Or manually upload** new AAB in Play Console

---

## 📚 **Resources**

- **Google Play Console:** https://play.google.com/console
- **EAS Submit Docs:** https://docs.expo.dev/submit/android/
- **Android App Bundle:** https://developer.android.com/guide/app-bundle
- **Play Console Help:** https://support.google.com/googleplay/android-developer

---

## ✅ **Next Steps**

1. ✅ Configure Android settings in `app.config.js`
2. ✅ Update `eas.json` for Android builds
3. ✅ Create Google Play Console account
4. ✅ Set up service account
5. ✅ Build Android app
6. ✅ Submit to Google Play

---

**Status:** Ready to configure and build  
**Last Updated:** November 4, 2025

