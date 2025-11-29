# App Store Submission Checklist - POCO iOS App

## ✅ CRITICAL FIXES COMPLETED (Build #27)

### 1. **App Icon Configuration** ✅
- **Fixed**: Updated iOS asset catalog with flattened icon (no alpha channel)
- **Location**: `ios/aipocketcompanion/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png`
- **Verification**: 
  ```bash
  sips -g hasAlpha ios/aipocketcompanion/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png
  # Should show: hasAlpha: no
  ```
- **Config**: `app.config.js` → `icon: './assets/images/icon.flat.png'` ✅

### 2. **Version & Build Number Sync** ✅
- **Fixed**: Xcode project now reads from Info.plist (not hardcoded)
- **Changes**:
  - `CURRENT_PROJECT_VERSION = "$(INFOPLIST_KEY_CFBundleVersion)"` (was: `1`)
  - `MARKETING_VERSION = "$(INFOPLIST_KEY_CFBundleShortVersionString)"` (was: `1.0`)
- **Info.plist**: Values match `app.config.js` (Expo regenerates Info.plist during EAS Build)
  - `CFBundleVersion = "27"` (matches `ios.buildNumber`)
  - `CFBundleShortVersionString = "1.0.0"` (matches `version`)
- **Config**: `app.config.js` → `version: '1.0.0'`, `buildNumber: '27'` ✅

### 3. **App Display Name** ✅
- **Fixed**: Changed from "ai-pocket-companion" to "POCO"
- **Location**: `ios/aipocketcompanion/Info.plist` → `CFBundleDisplayName`
- **Config**: `app.config.js` → `name: 'POCO'` ✅

### 4. **Privacy Permissions** ✅
All required privacy descriptions are in both:
- `app.config.js` → `ios.infoPlist` ✅
- `ios/aipocketcompanion/Info.plist` ✅

---

## 📋 PRE-BUILD VERIFICATION CHECKLIST

Before running `eas build`, verify:

### Icon
- [x] `assets/images/icon.flat.png` exists (1024x1024, no alpha)
- [x] `ios/aipocketcompanion/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png` matches icon.flat.png
- [x] `app.config.js` → `icon: './assets/images/icon.flat.png'`

### Version & Build
- [x] `app.config.js` → `version: '1.0.0'`
- [x] `app.config.js` → `ios.buildNumber: '27'` (increment for each build)
- [x] `Info.plist` → `CFBundleShortVersionString = "1.0.0"` (matches app.config.js)
- [x] `Info.plist` → `CFBundleVersion = "27"` (matches app.config.js)
- [x] `project.pbxproj` → `MARKETING_VERSION = "$(INFOPLIST_KEY_CFBundleShortVersionString)"`
- [x] `project.pbxproj` → `CURRENT_PROJECT_VERSION = "$(INFOPLIST_KEY_CFBundleVersion)"`

### App Name
- [x] `app.config.js` → `name: 'POCO'`
- [x] `Info.plist` → `CFBundleDisplayName = "POCO"`

### Bundle Identifier
- [x] `app.config.js` → `ios.bundleIdentifier: 'com.hellopoco.poco'`
- [x] Matches App Store Connect app bundle ID

### Privacy & Encryption
- [x] `Info.plist` → `ITSAppUsesNonExemptEncryption: false`
- [x] All usage descriptions present (camera, photo, microphone, speech, location, contacts)

---

## 🚀 BUILD & SUBMIT WORKFLOW

### Step 1: Update Build Number
```bash
# Edit app.config.js and increment buildNumber
# Current: buildNumber: '27'
# Next: buildNumber: '28'
```

### Step 2: Build for Production
```bash
eas build --platform ios --profile production
```

**What EAS Does:**
1. Reads `app.config.js` for version/build number
2. Injects values into Info.plist during build
3. Uses icon from asset catalog (`AppIcon.appiconset`)
4. If `autoIncrement: true` in `eas.json`, may increment build number automatically

**Build Time:** ~15-30 minutes

### Step 3: Submit to App Store Connect
```bash
eas submit --platform ios --profile production
```

**After Submission:**
- Processing in App Store Connect: 10-30 minutes
- Icon should appear after processing
- Select build in App Store Connect → TestFlight or App Store submission

---

## ⚠️ COMMON ISSUES & SOLUTIONS

### Icon Not Showing in App Store Connect
**Causes:**
1. Icon has alpha channel (transparency) → Fixed: Use `icon.flat.png` (no alpha)
2. Asset catalog not updated → Fixed: Manually copy icon to `AppIcon.appiconset`
3. Wrong icon path in config → Fixed: `icon: './assets/images/icon.flat.png'`

**Prevention:** Always verify icon has no alpha before building:
```bash
sips -g hasAlpha assets/images/icon.flat.png
# Must show: hasAlpha: no
```

### Version/Build Number Mismatch
**Symptoms:** Build shows wrong version in App Store Connect

**Causes:**
1. Hardcoded values in Xcode project → Fixed: Use variables
2. Info.plist hardcoded → Fixed: Use `$(EXPO_PROJECT_VERSION)` variables
3. EAS autoIncrement overriding → Check `eas.json` → `autoIncrement: true`

**Prevention:** Always check:
- `app.config.js` has correct `version` and `buildNumber`
- `Info.plist` uses variables, not hardcoded values
- `project.pbxproj` reads from Info.plist

### Build Number Conflicts
**Issue:** App Store Connect rejects build if number already exists

**Solution:** Always increment `buildNumber` in `app.config.js` before building:
```javascript
ios: {
  buildNumber: '28', // Increment from 27
}
```

Or rely on EAS auto-increment (if configured in `eas.json`)

---

## 📝 FUTURE ICON UPDATES

**Proper Workflow:**
1. Update source icon: `assets/images/icon.png`
2. Create flattened version:
   ```bash
   sips -s format jpeg assets/images/icon.png --out /tmp/icon.jpg
   sips -s format png /tmp/icon.jpg --out assets/images/icon.flat.png
   ```
3. Verify no alpha: `sips -g hasAlpha assets/images/icon.flat.png`
4. Update asset catalog:
   ```bash
   cp assets/images/icon.flat.png ios/aipocketcompanion/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png
   ```
5. Update `app.config.js`: `icon: './assets/images/icon.flat.png'`
6. Increment build number
7. Build and submit

**Alternative (Cleaner):**
Run `expo prebuild --clean` to regenerate iOS native code from `app.config.js`:
```bash
expo prebuild --clean --platform ios
```
This syncs icons automatically, but may overwrite other native changes.

---

## ✅ FINAL CHECKLIST BEFORE SUBMISSION

- [ ] Icon: 1024x1024, PNG, no alpha channel, in asset catalog
- [ ] Build number incremented and matches app.config.js
- [ ] Version number matches app.config.js
- [ ] App display name is "POCO"
- [ ] Bundle identifier matches App Store Connect
- [ ] All privacy permissions have descriptions
- [ ] Encryption compliance: `ITSAppUsesNonExemptEncryption: false`
- [ ] Build completes successfully
- [ ] Icon appears in App Store Connect after processing (10-30 min)
- [ ] No errors in App Store Connect

---

## 📚 REFERENCE

**Key Files:**
- `app.config.js` - Expo configuration (source of truth)
- `ios/aipocketcompanion/Info.plist` - iOS info (uses Expo variables)
- `ios/aipocketcompanion.xcodeproj/project.pbxproj` - Xcode project settings
- `ios/aipocketcompanion/Images.xcassets/AppIcon.appiconset/` - App icon asset catalog
- `eas.json` - EAS Build configuration

**Important Notes:**
- With `autoIncrement: true`, EAS may override build number
- Expo injects values from `app.config.js` during build
- Asset catalog icon takes precedence over config icon path
- Always verify icon has no alpha channel for App Store

---

**Last Updated:** Build #27 preparation
**Status:** All critical fixes completed ✅

