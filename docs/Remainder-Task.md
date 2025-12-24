# Remainder Feature - React Native screens

## Document Purpose
This document provides detailed specifications for **Reminder features** to be added to your existing Pocket Companion React Native mobile app. These features will specifically target the elderly people market.

---

## Table of Contents
1. [The Dashboard UI (Main Screen)]
2. [Add Reminder]
3. [The "Active" Experience (The Notification)]
   
---

## 1. The Dashboard UI (Main Screen) 

### 1.1 Overview Page Layout

**Page Route**: `/Reminders/ReminderOnBoardingScreen.js`

**Page Structure**:
```
Header Section
1. Page Title: "Reminder Command Center" (English)
2. Add a back button in the appbar based on the current theme of the project.
3. Use the same theme for background of the screen used in the whole project.

Main Content
1. Show list of reminders that is added in the supabase database (use the current structure of supabase database). If no data is available then show appropriate message.
2. The Timeline View: Don't use a monthly calendar grid (too small). Use a vertical timeline.
   1. Top Section: "Now / Next." The single most important upcoming task is highlighted in a large card.
   2. Middle Section: "Later Today." A scrollable list of the rest of the day. 
   3. Weather Integration: At the very top, show the weather. Weather integration should be done and should fetch the correct data based on the users current location.
   4. A massive, floating action button (bottom right) with a "Plus" icon and the word "Add".
3. “Did I take it?” helper: Many people worry whether they already completed a task just a few minutes ago.
   1. When you mark a task as done, it doesn’t disappear.
   2. Instead, it moves to a “Done Today” section at the bottom of the screen, showing a green checkmark and the exact time it was completed.
   3. This helps users quickly confirm and feel reassured that the task is already done.
```

## 2. Add Reminder

### 2.1 Overview Page Layout

**Page Route**: `/Reminders/AddReminderScreen.js`

**Page Structure**:
```
Header Section
1. Page Title: "Add Reminder" (English)
2. Add a back button in the appbar based on the current theme of the project.
3. Use the same theme for background of the screen used in the whole project.
4. Use supabase database (use the current structure of supabase database). to store all the details of this screen. Do not keep all the fields as mandatory. Once all the details are added in the screen, on click of save button, it should save the details into database and should create a reminder.

Main Content
1. Put a label "What" in the top left section with proper alignment.
2. Put a text input in the top section of the screen below "What" label. This will be a mandatory field. The placeholder text for this input field will be "What is this for?"
3. Immediately next to the text input, place a large Microphone Icon (use the app theme to create this icon). Large Microphone Icon should be clickable.
4. The "Incomplete Input" Safety Net - If the user types "Heart Doctor" and immediately closes the app and hit back button or close the app, it should Auto-saves in supabase database (use the current structure of supabase database). and from UI point of view show a "Floating Note" on the ReminderOnBoardingScreen.js screen like small card appears at the top of the screen.
ForEg: "You started a note about 'Heart Doctor'. Do you want to set a time?" 
         Options: [Set Time] [Delete] 
5. Quick Chips: Below the text box, show three large, icon-based buttons for context:
   * - 💊 Medication
   * - User-Doctor Icon Appointment 
   * - 🎂 Event/Other
6. The system behavior should change based on the Category chip the user has selected:
   1. If category is Medication:-
      1.1 - Repeat Logic: Defaults to "Daily.".
      1.2 - Notification Sound: Defaults to "Gentle Chime" (Non-alarming).
      1.3 - Snooze Behavior: If ignored, the system auto-snoozes for 15 minutes (Critical safety feature) and repeats the chime.
   2. If category is Appointment
      2.1 - Reminder Buffer: Defaults to "2 Hours Before" + "1 Day Before." 
      2.2 - Input Assumption: If the user enters "Friday," the system assumes "This coming Friday." 
      2.3 - Conflict Check: If they try to book two appointments at the same time, a gentle prompt appears: "You already have 'Dentist' at this time. Should we move one?"
   3. If category is Event/Other
      3.1 - Time Logic (The "Next Slot" Rule):
         3.1.1 - If no time is provided, the system defaults to the next available routine anchor. 
         3.1.2 - Example: User adds "Call Grandson" at 10:00 AM. System defaults the reminder to "Lunch (12:30 PM)" rather than "Now."
         3.1.3 - Reasoning: If they are adding it now, they are likely busy. Reminding them at the next break is more effective.
7. Smart UI: Selecting a chip subtly changes the subsequent options without reloading the page. 
8. Implement the voice feature on click of Microphone Icon. Whatever user says it should be added in the text input field.
9. Create large tile-based routine selector with options:
   1. 🌅 Breakfast - The system default time should be 08:00 AM.
   2. ☀️ Lunch - The system default time should be 12:30 PM.
   3. 🌙 Dinner - The system default time should be 06:00 PM.
   4. 🛏️ Bedtime - The system default time should be 09:00 PM.
   5. Add "Set specific time" toggle link below routine options
   6. Implement time picker for "Specific Time" option.
   7. Implement the Snooze pattern:
      7.1 - If the user always snoozes their 8:00 AM "Breakfast" reminder to 9:00 AM three days in a row: On the fourth day, the app should displays a polite prompt: "I noticed you usually take your morning pills around 9:00 AM. Should we change your 'Morning' time to 9:00 AM permanently?"
10. Create a new screen which will be used as a Setup Wizard for setting up the default times of Breakfast | Lunch | Dinner | Bedtime. Store all the necessary details in to supabase database (use the current structure of supabase database). so that it can be retrieved when needed. The setup wizard should follow below 4 points:
   1. What time do you usually have coffee/breakfast?
   2. What time do you eat lunch?
   3. What time is dinner?
   4. What time do you go to bed?
11. Optional Details card (collapsible)
   1. Build collapsible “Add Photo or Details (Optional)” section.
   2. Medication details: camera capture + store photo reference; color swatches.
   3. Appointment details: free-text location; “Do you need a ride?” checkbox.
   4. Event details: When Event / Other is selected just hide this whole "Optional details" card.
   5. Make the UI card with proper size so that the controls does not go outside of the card. Consider both Medication and Appointment section.
**Acceptance criteria**
- Optional details never block Save.
```

## 3. The "Active" Experience (The Notification)

### 3.1 Overview Page Layout

**Page Route**: `/Reminders/NotificationScreen.js`

**Page Structure**:
```
Main content
1. Page Title: "Attention" (English)
2. Create a full screen type alert, but it should not cover the whole full screen. There should be spacing added proper from Left/Top/Right/Bottom so it will look like a full screen dialog / alert notification.
2. Add a close button (x) on top of this dialog / alert notification and use the current theme of the project.
3. Use the same theme for background of the screen used in the whole project.
4. The "Full Screen" Alert
   1.  Wake Screen: The app wakes the phone with a gentle, distinct chime (avoid jarring alarms).
   2.  Visuals:
       1.  Medication: Show the Photo they took of the pill. Huge text: "Take Blue Pill." 
       2.  Instruction: "With Food" or "With Water" (using icons).
   3. Action Buttons (The "Snooze" Logic): 
      1. Avoid the word "Snooze" (it's confusing). 
      2. Button 1 (Green, Large): "I did it."
      3. Button 2 (Yellow, Medium): "Remind me in 15 mins."
      4. Button 3 (Grey, Small): "Skip this."
```