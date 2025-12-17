Below is a fully updated single **Markdown requirements document** that includes **all** UI/UX flow details (Entry Point, “What”, chips, progressive disclosure, “Specific Time” toggle, Active Experience, Dashboard UI, Accessibility, Tone, etc.) and maps them directly to the rule structure in `Reminder - Rules for default settings.docx` (the “spine”).[1][2][3]

***

# PoCo (Pocket Companion) — Reminder & Notification System Requirements

## Source documents
- `Reminder - Rules for default settings.docx` (business rules + default logic; primary structure for this spec).[1]
- `Reminder - UI-UX flow.docx` (screen behavior + UI content requirements).[2]
- `Reminder - Designing a notification system for the elderly.docx` (notification tier hierarchy + sensory patterns + escalation protocol).[3]

## Product goal
PoCo’s reminder system must bridge “vague input” into a usable reminder through smart defaults, while its notification system must communicate urgency clearly and safely for elderly users (avoiding alarm fatigue and sensory mismatches).[3][1]

***

# RU-0 — Global UX principles (applies to all rules)

## RU-0.1 Forgiving design
- Nothing is mandatory except the user’s intent; PoCo must avoid “Required” patterns that cause seniors to panic or quit.[2]
- The **Save** button must always be active; if the user only types “Doctor” and taps Save, PoCo accepts it as a rough note and can clarify later or apply defaults.[2]

## RU-0.2 Progressive disclosure
- The Add Reminder experience must use **Card-Based Progressive Disclosure** instead of a long scrolling form to keep the screen clean.[2]

***

# RU-1 — “My Day” Skeleton (Routine Anchors) (`Reminder - Rules for default settings.docx`)

## RU-1.1 Default routine anchors
PoCo must map routine concepts to specific timestamps using these out-of-the-box defaults, and these must be globally adjustable in a “My Routine” settings menu.[1]

| Routine input | Default time | Smart logic |
|---|---:|---|
| Morning / Breakfast | 08:00 AM | Changing Breakfast once in settings shifts all future Breakfast reminders automatically. [1] |
| Afternoon / Lunch | 12:30 PM | Intended as a practical midday anchor (e.g., mid-day meds). [1] |
| Evening / Dinner | 06:00 PM | Tied to common senior mealtime. [1] |
| Night / Bedtime | 09:00 PM | Useful for night meds / safety routines. [1] |

## RU-1.2 UI mapping: routine selection
- Add Reminder must present routine selectors as large tiles (Breakfast, Lunch, Dinner, Bedtime) instead of a time spinner.[2]
- This routine-based “When” approach is the default for seniors who think in routines rather than clock times.[2]

***

# RU-2 — Context-aware defaults by Category (`Reminder - Rules for default settings.docx`)

## RU-2.0 Add Reminder UI flow (mandatory mapping layer)
This section defines the UI surfaces that collect the minimal inputs needed for the RU-2 rules to apply.[1][2]

### RU-2.0.A Entry point
- The entry CTA must be a massive floating action button (bottom right) with a “Plus” icon and the word “Add”.[2]
- “Voice First”: immediately next to the text input, place a large Microphone icon to support speaking reminders (e.g., “Remind me to take my heart pill at breakfast”).[2]

### RU-2.0.B “What” (only mandatory field)
- Input label must be “What is this for?” with large text and high contrast.[2]
- Under the input, show three large icon-based “Quick Chips” for context:
- Medication.[2]
- Appointment.[2]
- Event/Other.[2]
- Smart UI: selecting a chip must subtly change subsequent options without reloading the page.[2]

### RU-2.0.C “When” (vague vs specific)
- Show routine selectors as large tiles: Breakfast, Lunch, Dinner, Bedtime.[2]
- Provide a “Specific Time” toggle as a small text link: “Set specific time” for appointments.[2]

### RU-2.0.D “Details” (optional & forgiving)
- Details must be collapsible and labeled “Add Photo or Details (Optional).”[2]
- Medication mode details:
- Photo capture via a large camera button (“Take a photo of the pill/bottle”).[2]
- Shape/Color support via simple swatches (e.g., Red, White, Blue).[2]
- Appointment mode details:
- Location must be free text (e.g., “Dr. Smith’s office”), not a forced map address.[2]
- Transport must be a simple checkbox: “Do you need a ride?” (can trigger a caregiver flag).[2]

***

## RU-2.1 Category drives system behavior
The system behavior must change based on the Category chip selected: Medication, Appointment, or Event/Other.[1]

## RU-2.2 Default delivery and scheduling behaviors
- Repeat defaults to Daily (especially for chronic conditions).[1]
- Notification sound defaults to a “Gentle Chime” (non-alarming).[1]
- If ignored, the reminder auto-snoozes for 15 minutes and repeats the chime.[1]

***

# RU-3 — Medication defaults (Category = Medication) (`Reminder - Rules for default settings.docx`)

## RU-3.1 Defaults
- Repeat defaults to Daily for medications.[1]
- If ignored, auto-snooze for 15 minutes and repeat.[1]

## RU-3.2 Notification UI mapping (“Active Experience”)
When the reminder goes off, PoCo must use a full-screen alert because standard iOS/Android banners are too small and vanish too quickly.[2]

- Wake screen: wake the phone with a gentle, distinct chime (avoid jarring alarms).[2]
- Visuals (Medication):
- Show the photo the user took of the pill.[2]
- Use huge instruction text (example: “Take Blue Pill”).[2]
- Show supportive instruction icons like “With Food” / “With Water.”[2]
- Action buttons (avoid “Snooze” wording):
- Button 1 (Green, Large): “I did it.”[2]
- Button 2 (Yellow, Medium): “Remind me in 15 mins.”[2]
- Button 3 (Grey, Small): “Skip this.”[2]

## RU-3.3 Urgency-tier mapping (delivery behavior)
Medication items can be Tier 1 Critical depending on urgency examples, and Tier 1 behavior includes low-frequency rhythmic chime, distinct heavy haptics, voice overlay after ~10 seconds if not dismissed, full-screen takeover, and max brightness wake.[3]

***

# RU-4 — Appointment defaults (Category = Appointment) (`Reminder - Rules for default settings.docx`)

## RU-4.1 Reminder buffers (“Get Ready” logic)
Appointment reminders must default to “2 Hours Before” and “1 Day Before,” because at-time reminders are too late and PoCo should calculate “get ready” time.[1]

## RU-4.2 Day-only input assumption
If the user enters “Friday,” the system assumes “this coming Friday.”[1]

## RU-4.3 Conflict check
If the user attempts to book two appointments at the same time, PoCo must show a gentle conflict prompt (“You already have Dentist at this time. Should we move one?”).[1]

## RU-4.4 UI mapping (appointments)
- “Specific Time” toggle must be available via a small link (“Set specific time”) for appointments.[2]
- Appointment details must allow free-text location (e.g., “Dr. Smith’s office”).[2]
- Appointment details must include “Do you need a ride?” checkbox (caregiver flag).[2]

## RU-4.5 Urgency-tier mapping (delivery behavior)
Appointments are an explicit example of Tier 2 Action Required, which uses a pleasant 3-note melody, double-tap haptics, and a large banner that doesn’t block unlocking.[3]

***

# RU-5 — General / Other defaults (Category = General/Other) (`Reminder - Rules for default settings.docx`)

## RU-5.1 Next Slot Rule
If no time is provided, the reminder defaults to the next available routine anchor (not “Now”).[1]
Example: adding “Call Grandson” at 10:00 AM defaults to Lunch (12:30 PM).[1]

## RU-5.2 Incomplete input safety net (Floating Note)
If a user types something (e.g., “Heart Doctor”) and closes the app/back-outs, PoCo must auto-save it as a Floating Note on the dashboard.[1]
The Floating Note UI must be a small card at the top of the main screen that says the user started a note and asks whether to set a time.[1]
Floating Note options must be: Set Time and Delete.[1]

## RU-5.3 UI mapping (forgiving capture)
The “Save always active” principle supports turning partial input into a rough note that can later be scheduled via defaults or user follow-up.[2]

## RU-5.4 Urgency-tier mapping (delivery behavior)
General passive information aligns with Tier 3 Passive Info, which uses soft/silent behavior and populates the Today list/badges without intrusive pop-ups.[3]

***

# RU-6 — Adaptive Learning (“Best in Market”) (`Reminder - Rules for default settings.docx`)

## RU-6.1 Snooze pattern learning
If the user repeatedly snoozes a routine anchor (e.g., Breakfast 8:00 AM → 9:00 AM) three days in a row, PoCo must prompt on the fourth day to permanently change the Morning time to the observed time.[1]
The prompt must be polite and framed as helpful (“I noticed you usually take your morning pills around 9:00 AM…”).[1]

***

# RU-7 — Global adjustments (Setup Wizard) (`Reminder - Rules for default settings.docx`)

## RU-7.1 First-run routine setup
On first install, PoCo must not start with account details; it must ask four routine questions (breakfast/coffee, lunch, dinner, bedtime) and use the answers to populate backend logic.[1]

***

# RU-8 — Notification hierarchy (tiers) (`Reminder - Designing a notification system for the elderly.docx`)

## RU-8.1 Tier behaviors (sound/haptics/screen)
PoCo must categorize reminders into three urgency tiers, and the phone’s behavior must change drastically by tier.[3]

| Tier | Goal | Audio | Haptic | Screen |
|---|---|---|---|---|
| Tier 1 Critical | Must be noticed; cannot be ignored. [3] | Low-frequency rhythmic chime “gong” pulse (avoid high-pitched beep). [3] | “Heartbeat” long-heavy pattern. [3] | Full-screen takeover, wake at 100% brightness. [3] |
| Tier 2 Action Required | Get attention but don’t startle. [3] | Pleasant 3-note melody (major key). [3] | Two quick vibrations (“tap”). [3] | Large banner covering top ~50% without blocking unlocking. [3] |
| Tier 3 Passive Info | Inform without interrupting. [3] | Soft pop/water drop, or silent if phone is in use. [3] | Single weak tick. [3] | Badge/list only; silently populates Today list. [3] |

## RU-8.2 Smart delivery features
- Ramp-up volume: start low and fade up to avoid startling seniors who keep ring volume high.[3]
- Pocket/motion detection: if phone is in hand, mute/lower audio and rely on vibration because they can see it.[3]
- Frequency shift: alert sounds should be engineered in a lower range (500–1,000 Hz) to suit age-related hearing changes.[3]
- Visual urgency coding: tier-specific colors/icons (e.g., blue/white for meds; amber for appointments; soft green/lavender for passive).[3]

***

# RU-9 — Safety net escalation protocol (Tier 1 Critical) (`Reminder - Designing a notification system for the elderly.docx`)

## RU-9.1 Escalation timeline
If a Tier 1 Critical reminder is ignored, PoCo must follow: initial alert (T+0), auto-snooze repeat (~+15 min), stronger “nudge” (~+45 min), and escalation (~+60 min).[3]

## RU-9.2 Caregiver escalation and user UI change
At ~+60 minutes, PoCo must send a push notification to the caregiver app/account indicating the reminder was not marked done.[3]
At escalation, the user’s screen must change to show a “Call Caregiver [Name]” button anticipating caregiver outreach.[3]
Caregiver sync is also reflected in the UI/UX requirements as a safety net for ignored medication reminders at 60 minutes.[2]

***

# RU-10 — Dashboard “Command Center” (`Reminder - UI-UX flow.docx`)

## RU-10.1 Timeline dashboard layout
The dashboard must act as the command center and use a vertical timeline rather than a monthly calendar grid.[2]
Top section must highlight “Now / Next” as a large primary card.[2]
Middle section must show “Later Today” as a scrollable list.[2]
Weather must appear at the very top because it helps build a habit of opening PoCo.[2]

## RU-10.2 “Did I take it?” solver (Done Today)
Completed items must not disappear; they must move to “Done Today” with a green check and the time completed to reassure users.[2]

***

# RU-11 — Accessibility + companion tone (`Reminder - UI-UX flow.docx`)

## RU-11.1 Visual accessibility specs
- Typeface should be a humanist sans-serif (e.g., Atkinson Hyperlegible) for clarity between similar characters.[2]
- Contrast should be dark text on off-white (pure white can cause glare for cataracts).[2]
- Touch targets must be at least 48x48 pixels for all clickable elements.[2]

## RU-11.2 Notification tone (companion aspect)
Notification copy should not sound robotic; it should be warm and contextual (example shown in the UI/UX doc).[2]

***

## Screen-to-rule mapping (implementation checklist)
This is the minimum set of screens/surfaces implied by the rules and UI/UX flow.[1][2]

| Surface | Must support | Primary rule IDs |
|---|---|---|
| Dashboard (Main Screen) | Timeline, Now/Next, Later Today, Weather, Done Today, Floating Note card. [2][1] | RU-5.2, RU-10 |
| Add Reminder (Card flow) | Entry point FAB + mic; “What” input; category chips; “When” routine tiles; “Specific time” link; optional details collapse. [2] | RU-0, RU-1, RU-2 |
| My Routine (Settings) | Edit Breakfast/Lunch/Dinner/Bedtime anchors; propagate changes. [1] | RU-1 |
| Setup Wizard | 4 routine questions; seeds backend. [1] | RU-7 |
| Full-screen Notification | Wake screen, big visuals, 3 action buttons, avoid “Snooze,” complete → Done Today. [2] | RU-3, RU-8, RU-10 |
| Tier-1 Escalation State | Nudge + caregiver push + “Call Caregiver” CTA. [3] | RU-9 |

---
## References
- [1] Reminders & rules for default settings (https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/154033243/0f446150-5e66-4011-87c1-f4e95bf1f95b/Reminder-Rules-for-default-settings.docx)
- [2] UI/UX for Reminder(https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/154033243/d7fb198a-64c3-426e-a6a3-5b8eea85ed45/Reminder-UI-UX-flow.docx)
- [3] Reminder notification feature for Pocket Companion (PoCo)(https://ppl-ai-file-upload.s3.amazonaws.com/web/direct-files/attachments/154033243/7255c48c-3fee-4674-94f7-23e69d7f9367/Reminder-Designing-a-notification-system-for-the-elderly.docx)
