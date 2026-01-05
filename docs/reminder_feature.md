# Reminder Feature – React Native Screens (With OCR Integration)

## Document Purpose
You are enhancing an existing React Native mobile application called **Pocket Companion**, designed mainly for elderly users. The goal is to introduce a new **Reminder feature** while keeping the app’s current design, theme, and navigation fully consistent.

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
1. Add a new option named “Reminder” in the main content area.
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
1. Page title should be “Reminder”.
2. Include a themed back button in the app bar.
3. Use the same background and overall styling as other screens in the app.
4. To design the header section take reference from this file `/app/chat.js`.

Main content
1. Remove the image which is added in top section. In place of the image add a title text "Add your medications or supplements" in big bold fonts for elderly readability.
2. Add description text "You can scan bottles or add them manually. This helps us personalize your experience.".
3. Match the layout, spacing, font sizes, and structure shown in the reference image.
4. Apply the app’s existing theme (backgrounds, buttons, typography).
5. Use a humanist sans-serif font suitable for elderly users (e.g., Atkinson Hyperlegible).
6. Display two action buttons at the bottom:
   * Scan (OCR flow)
   * Manual (manual entry)
7. Include an Added Medications section with placeholder UI if empty.
```

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
7. On “Save Medicine”, store data in Supabase `medications` table.
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
- Before Breakfast — 07:00 AM
- After Breakfast — 08:00 AM (renamed from Breakfast)
- Lunch — 12:30 PM
- Dinner — 06:00 PM
- Bedtime — 09:00 PM

The UI/UX of **Before Breakfast** must be exactly the same as other time cards.

#### Data Changes
Use the existing `times` JSON array to store selected values, including `"07:00"` for Before Breakfast.

#### Notification Rules
- Schedule one notification per selected time
- Repeat daily

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

