# Remainder Feature - React Native screens

## Document Purpose
You are enhancing an existing React Native mobile application called Pocket Companion, which is designed mainly for elderly users. The goal is to introduce a new Reminder feature while keeping the app’s current design, theme, and navigation fully consistent.

---

## Table of Contents
1. [Startup screen]
2. [Reminder Options Screen]
3. [Medications Screen]
4. [Add Medications Screen]
   
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

## 3. Medications Screen

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
1. Remove the image which is added in top section. In place of the image add a title text "Add your medications or supplements" in a big bold fonts so that it can be easily readable by elderly people.
2. Add a description text "You can scan bottles or add them manually. This helps us personalize your experience." in a regular font size so that it can be easily readable by elderly people.
3. Match the layout, spacing, font sizes, and overall structure shown in the reference image.
4. Apply the app’s existing theme for:
    * Background colors
    * Button colors
5. Use a humanist sans-serif font suitable for elderly users (e.g., Atkinson Hyperlegible or similar).
6. Display two action buttons at the bottom, exactly as shown in the reference image:
    * Scan: 
        * Opens the camera to capture a photo of the medicine or prescription.
        * After returning from the camera, display the captured image in the UI.
        * Show a close (✕) button at the top-right of the image to allow removal and retaking the photo.
    * Manual:
        * Navigates to /Reminders/AddMedications.js.
7. Include an Added Medications section:
    * Fetch and display all medication records from the medications table in the Supabase database.
    * If no records exist, show the placeholder UI exactly as shown in the reference image.
```
## 4. Add Medications Screen

### 4.1 Overview Page Layout

**Page Route**: `/Reminders/AddMedications.js`

**Page Structure**:
```
Header Section
1. Page Title: "Add Reminder" (English)
2. Include a back button styled according to the current app theme.
3. Maintain the same background and overall styling as the rest of the app.

Main content
1. Use the image located at /docs/Add_Medication_Manual.jpeg as the exact UI reference.
2. Match the layout, spacing, font sizes, and structure shown in the reference image.
3. Apply the app’s existing theme for:
    * Background colors
    * Button colors
4. Use a humanist sans-serif font suitable for elderly users (e.g., Atkinson Hyperlegible or similar).
5. Add Verification Checklist above "Save Medicine" button, exactly shown in the reference image, styled using the current app theme.
6. Include a single action button at the bottom, styled using the app theme.
7. When the user taps “Save Medicine”, save all entered details to the Supabase database.
8. Create a new table named medications in Supabase to store this information.
```
## 5. Appointments Screen

### 5.1 Overview Page Layout

**Page Route**: `/Reminders/Appointments.js`

**Page Structure**:
```
Header Section
1. Page Title: "Appointments" (English)
2. Include a back button styled according to the current app theme.
3. Maintain the same background and overall styling as the rest of the app.

Main content
1. Display two action buttons at the bottom, exactly as shown in the reference image:
    * Access Calendar / Email: 
        * Automatically retrieve appointment details from the user’s calendar or email.
        * Add all the necessary permissions for Android and IOS platform to access the device calendar and fetch all the appointments from there.
        * Once the appointments are fetch successfully from calendar, populate below values inside these text input filed (Title | Date & Time | Location).
    * Manual - Let users add an appointment themselves by entering:
        * Title
        * Date & Time
        * Location
2. Include a single action button at the bottom, styled using the app theme.
3. When the user taps “Save Appointment, save all entered details to the Supabase database.
4. Create a new table named medications in Supabase to store this information.
5. Include an Added Appointments section:
    * Fetch and display all appointments records from the appointment table in the Supabase database.
    * If no records exist, show the placeholder UI exactly as shown in the reference image.
```

## 6. ImportantDates Screen

### 6.1 Overview Page Layout

**Page Route**: `/Reminders/ImportantDates.js`

**Page Structure**:
```
Header Section
1. Page Title: "Important Dates" (English)
2. Include a back button styled according to the current app theme.
3. Maintain the same background and overall styling as the rest of the app.

Main content
1. Display two action buttons at the bottom, exactly as shown in the reference image:
    * Add Voice: 
        * The user can add the title and date using voice input.
        * There will be 2 input fields Title and date and the values can be filled up using voice input.
        
    * Manual - Let users add an Important Date themselves by entering:
        * Title
        * Date

2. Include a single action button at the bottom, styled using the app theme.
3. When the user taps “Save The Date, save all entered details to the Supabase database.
4. Create a new table named importantDates in Supabase to store this information.
5. Include an Added Important Date section:
    * Fetch and display all appointments records from the importantDates table in the Supabase database.
    * If no records exist, show the placeholder UI exactly as shown in the reference image.
```
