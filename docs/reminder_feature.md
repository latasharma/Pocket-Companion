# Reminder Feature – React Native Screens (With OCR Integration)

## Document Purpose
You are enhancing an existing React Native mobile application called **Pocket Companion**, designed mainly for elderly users. The goal is to introduce a new **Reminder feature** while keeping the app's current design, theme, and navigation fully consistent.

This document now also includes **OCR-based medication scanning using Gemini API**.

---

## Table of Contents
1. Startup Screen
2. Reminder Options Screen
3. Medications Screen (with OCR)
4. Add Medications Screen (OCR Auto-fill)
5. Appointments Screen
6. Important Dates Screen (with Repeat Functionality)

---

## 1. Startup Screen

### 1.1 Overview Page Layout

**Page Route**: `/app/index.js`

**Page Structure**:
```
Header Section
1. Keep the existing header and overall layout unchanged.

Main Content
1. Add a new option named "Reminder" in the main content area.
2. Position the Reminder option between the two existing options already displayed.
3. Ensure the Reminder option matches the exact design, size, style, and behavior of the other options.
```

---

## 2. Reminder Options Screen

### 2.1 Overview Page Layout

**Page Route**: `/Reminders/ShowReminderOptionsScreen.js`

**Page Structure**:
```
Header Section
1. Page Title: "Reminder" (English)
2. A back button in the app bar, styled according to the current app theme.
3. Use the same background color and theme used throughout the app.
4. To design the header section take reference from this file `/app/chat.js`.

Main Content
1. Show three large, easy-to-tap, icon-based buttons (quick chips):
   * Medication (💊 icon)
   * Appointments (User–Doctor style icon)
   * Important Dates (🎂 icon)
```

---

## 3. Medications Screen (With OCR Scanning)

### 3.1 Overview Page Layout

**Page Route**: `/Reminders/Medications.js`

**Page Structure**:
```
Header Section
1. Page title should be "Reminder".
2. Include a themed back button in the app bar.
3. Use the same background and overall styling as other screens in the app.
4. To design the header section take reference from this file `/app/chat.js`.

Main content
1. Remove the image which is added in top section. In place of the image add a title text "Add your medications or supplements" in big bold fonts for elderly readability.
2. Add description text "You can scan bottles or add them manually. This helps us personalize your experience.".
3. Match the layout, spacing, font sizes, and structure shown in the reference image.
4. Apply the app's existing theme (backgrounds, buttons, typography).
5. Use a humanist sans-serif font suitable for elderly users (e.g., Atkinson Hyperlegible).
6. Display two action buttons at the bottom:
   * Scan (OCR flow)
   * Manual (manual entry)
7. Include an Added Medications section with placeholder UI if empty.
```

### 3.2 Medical Disclaimer (Hyperlink + Bottom Sheet)

A medical disclaimer hyperlink must be displayed on the Medications screen to clearly communicate medical usage limitations and emergency guidance.

#### Screen

**Page Route**: `/Reminders/Medications.js`

#### Placement

1. Display the disclaimer as a tappable text link near the bottom of the screen.
2. Recommended placement:
   * Below the Added Medications section.
   * Above the Continue button.

3. Link text:
   * "Important Medical Disclaimer"

#### Interaction Behavior

1. On tap, open a modal bottom sheet that:
   * Slides up from the bottom
   * Uses a smooth slide-up animation
   * Dims the background
2. The bottom sheet must be dismissible by:
   * Swiping down
   * Tapping a close (✕) icon

#### Bottom Sheet Content (Legal-Safe Text)

```
IMPORTANT MEDICAL DISCLAIMER

* PoCo is an AI companion tool designed to assist with organization and companionship. It is NOT a medical device and NOT a substitute for professional medical advice, diagnosis, or treatment.

* The scanning and reminder features are aids for convenience. You are responsible for verifying all medication details (names, dosages, times) against your actual prescription labels.

* PoCo uses artificial intelligence which may occasionally produce inaccurate or misleading information. Do not rely on this app for medical decisions, dosage calculations, or identifying pills.

* Use of PoCo does not create a doctor-patient or provider-patient relationship. Always consult a qualified healthcare professional for medical concerns.

* In case of a medical emergency, overdose, or severe symptoms, call emergency services (e.g., 911) immediately. Do not rely on PoCo for emergency assistance.

```

#### Accessibility & UX Requirements

1. Bottom sheet content must be scrollable if it exceeds screen height.
2. Minimum touch target size: 44×44 px
3. Support VoiceOver (iOS) and TalkBack (Android).
4. Use large fonts, proper spacing, and high contrast suitable for elderly users.
5. Do not auto-dismiss; user must explicitly close the disclaimer.

---

## 4. Add Medications Screen (OCR Auto-fill)

### 4.1 Overview Page Layout

**Page Route**: `/Reminders/AddMedications.js`

**Page Structure**:
```
Header Section
1. Page Title: "Add Reminder" (English)
2. Include a themed back button.
3. Maintain consistent background and styling.

Main Content
1. Use `/docs/Add_Medication_Manual.jpeg` as the UI reference.
2. Match layout, spacing, fonts, and structure exactly.
3. Apply existing app theme.
4. Use elderly-friendly typography.
5. Add Verification Checklist above "Save Medicine" button.
6. Include a single primary action button at the bottom.
7. On "Save Medicine", store data in Supabase `medications` table.
```

### 4.2 Multiple Daily Medication Times

Users can select **any number of the available time options** for a single medication reminder.

#### Purpose
Allow users to select all applicable daily times (e.g. Before Breakfast, After Breakfast, Lunch, Dinner, Bedtime).

#### UX Rules
- No limit on number of selections
- Tap to toggle
- All options are equal and optional

#### Time Options
- Before Breakfast – 07:00 AM
- After Breakfast – 08:00 AM (renamed from Breakfast)
- Lunch – 12:30 PM
- Dinner – 06:00 PM
- Bedtime – 09:00 PM

The UI/UX of **Before Breakfast** must be exactly the same as other time cards.

#### Data Changes
Use the existing `times` JSON array to store selected values, including `"07:00"` for Before Breakfast.

#### Notification Rules
- Schedule one notification per selected time
- Repeat daily

---

### 4.3 Medication Reminder Confirmation Flow (Must-have)

When a medication reminder is triggered:

1. Show a push notification with clear actions:
   - **Taken**
   - **Skip**

2. If the user opens the reminder screen:
   - Show medication name
   - Show dosage
   - Show scheduled time
   - Provide large, easy-to-tap buttons:
     * Taken
     * Skipped

3. Reminder status states:
   - Due (Pending)
   - Taken
   - Missed (Unconfirmed)
---

### 4.4 Medication Reminder Escalation (NEW)

This section extends the existing medication reminder logic to ensure **critical medications are not silently missed**.

#### Purpose
If a user does not confirm a medication reminder within a defined time window, the app escalates the reminder using stronger alerts and optional caregiver notifications.

---

#### 4.4.1 Critical Medication Toggle

**Location**: Add / Edit Medication screen

- Keep the existing design of the screen as it is. Make sure that it does not break.
- In the "Verification Checklist" add one more checkbox with an option: "Escalate to caregiver if I don’t confirm this dose". It should look same as other option only the text colour should be different.

If selected:
- Caregiver contact details must be present with Caregiver Name, Phone Number, Email input field.
- Explicit consent is required

---

#### 4.4.2 Escalation Timing Rules (v1)

| Stage | Time Since Due | Action |
|-----|---------------|-------|
| T0 | At scheduled time | Normal reminder |
| T+10 min | Not confirmed | Reminder retry |
| T+30 min | Still not confirmed | Final reminder |
| T+60 min | Still not confirmed + Critical | Escalate to caregiver |

---

#### 4.4.3 Conditions to Escalate

Escalation occurs **only if ALL are true**:

1. Dose status is **pending**
2. Medication is marked as **Critical**
3. Confirmation window has expired (≥ 60 minutes)
4. Caregiver contact exists
5. Caregiver consent is given
6. Caregiver has **not already been notified**

---

#### 4.4.4 When NOT to Escalate

- Medication is not marked as Critical
- User confirms Taken / Skipped before escalation
- Caregiver consent is missing
- Caregiver was already notified for this dose

---

#### 4.4.5 Caregiver Notification (Privacy-First)

Default channels:
- SMS
- Email

Message format (no medication details by default):

PoCo Alert:
The user has not confirmed a scheduled medication reminder.
Please check in with them.

Medication name or dosage must **never be shared** unless explicitly enabled in a future version.

---

#### 4.4.6 Escalation Job (Background Logic)

Runs every **1–5 minutes**:

1. Fetch unconfirmed dose events
2. Check escalation eligibility
3. Send caregiver notification
4. Mark caregiver_notified_at
5. Ensure idempotency (no duplicate alerts)

---

## 5. Appointments Screen

### 5.1 Overview Page Layout

**Page Route**: `/Reminders/Appointments.js`

**Page Structure**:
```
Header Section
1. Page Title: "Appointments" (English)
2. Include a themed back button.
3. Maintain consistent styling.

Main Content
1. Two action buttons:
   * Access Calendar / Email
   * Manual entry
2. Save appointments to Supabase.
3. Show Added Appointments section with placeholder if empty.
```

---

## 6. Important Dates Screen (With Repeat Functionality)

### 6.1 Overview Page Layout

**Page Route**: `/Reminders/ImportantDates.js`

**Page Structure**:
```
Header Section
1. Page Title: "Important Dates" (English)
2. Include themed back button.
3. Maintain consistent styling.

Main Content
1. Two action buttons:
   * Add Voice (voice input for title & date)
   * Manual (manual entry)
2. Save data to Supabase `important_dates` table.
3. Show Added Important Dates section with placeholder if empty.
```