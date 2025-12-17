# PoCo (Pocket Companion) — JIRA Programmable Tasks (React Native)

This document converts RU-based requirements into JIRA-ready work items (Epics → Stories → Sub-tasks), assuming a cross-platform React Native implementation. [conversation_history:1]

## Epics (JIRA)

| Epic key | Epic name | Maps to RU | Outcome |
|---|---|---|---|
| E1 | Routine Anchors & Scheduling Core | RU-1, RU-7 | Routine anchors, “My Routine”, setup wizard, schedule generation. |
| E2 | Add Reminder (Forgiving Input) UI | RU-0, RU-2 | Card-based flow, FAB, voice-first, “What” field, chips, routine tiles, specific-time link, optional details. |
| E3 | Defaults Engine (Category Rules) | RU-2, RU-3, RU-4, RU-5 | Apply defaults for Medication/Appointment/Other, next-slot logic, conflict checks, buffers. |
| E4 | Notifications & Tier Delivery | RU-8 | Tier 1/2/3 delivery profiles + smart delivery behavior hooks. |
| E5 | Active Experience (Full-screen Alert) | RU-3, RU-8, RU-10 | Full-screen alert UI with actions (“I did it”, “Remind me…”, “Skip”), completion logging. |
| E6 | Dashboard “Command Center” | RU-10, RU-5.2 | Timeline view (Now/Next, Later Today), weather slot, Done Today, Floating Notes card. |
| E7 | Adaptive Learning | RU-6 | Detect repeated snooze patterns and prompt to adjust routine anchors. |
| E8 | Caregiver Safety Net (Tier-1 Escalation) | RU-9 | Escalation timeline, caregiver notification trigger, “Call Caregiver” UI state. |
| E9 | Accessibility & Content Tone | RU-11 | Typography/contrast/touch targets enforcement + non-robotic notification copy templates. |

---

## E1 — Routine Anchors & Scheduling Core (RU-1, RU-7)

### Story 1.1: Implement routine anchors model + defaults
**Sub-tasks**
- Define `RoutineAnchor` schema (Breakfast/Lunch/Dinner/Bedtime) and store default times.
- Implement persistence (local storage + migration strategy).
- Create rescheduling mechanism for future instances when anchors change.

**Acceptance criteria**
- Fresh install has defaults: Breakfast 08:00, Lunch 12:30, Dinner 18:00, Bedtime 21:00.
- Changing an anchor affects future reminders tied to it.

### Story 1.2: Build “My Routine” settings screen
**Sub-tasks**
- RN screen with large selectors for 4 anchor times.
- Validation and safe time entry (12/24h handling).
- Trigger rescheduling job on save (recompute future instances).

**Acceptance criteria**
- Editing Breakfast time shifts all future Breakfast-linked reminders.

### Story 1.3: First-run Setup Wizard (4 questions)
**Sub-tasks**
- Wizard screens + skip/confirm flow (no account-first).
- Store answers into routine anchors and seed schedule engine.

**Acceptance criteria**
- Completing wizard persists anchor times and uses them for “Next Slot Rule”.

---

## E2 — Add Reminder (Forgiving Input) UI (RU-0, RU-2)

### Story 2.1: Add Reminder entry point (FAB + “Add”)
**Sub-tasks**
- Implement floating action button bottom-right with plus icon and “Add”.
- Navigation route to Add Reminder flow.

**Acceptance criteria**
- FAB visible on Dashboard and opens Add Reminder flow.

### Story 2.2: Voice-first input (microphone next to input)
**Sub-tasks**
- Integrate speech-to-text module (platform permissions + fallback).
- Populate “What is this for?” field from voice transcription.

**Acceptance criteria**
- Mic starts capture; transcription appears in the input field.

### Story 2.3: Card-based progressive disclosure flow
**Sub-tasks**
- Build card container component + step transitions (avoid long scrolling form).
- Ensure Save is always enabled (forgiving design).

**Acceptance criteria**
- User can save with only “What” filled.

### Story 2.4: “What” field + category chips
**Sub-tasks**
- Implement “What is this for?” high-contrast large input.
- Implement chips (Medication, Appointment, Event/Other) with icons.
- Chip selection changes subsequent cards without reload.

**Acceptance criteria**
- Selecting a chip changes available “When/Details” options inline.

### Story 2.5: “When” selection (routine tiles + specific time link)
**Sub-tasks**
- Implement routine tiles: Breakfast/Lunch/Dinner/Bedtime.
- Implement “Set specific time” link for appointments.

**Acceptance criteria**
- Appointment flow can toggle to specific time entry; other flows default to routine selection.

### Story 2.6: Optional Details card (collapsible)
**Sub-tasks**
- Build collapsible “Add Photo or Details (Optional)” section.
- Medication details: camera capture + store photo reference; color swatches.
- Appointment details: free-text location; “Do you need a ride?” checkbox.

**Acceptance criteria**
- Optional details never block Save.

---

## E3 — Defaults Engine (Category Rules) (RU-2, RU-3, RU-4, RU-5)

### Story 3.1: Implement defaults resolution pipeline
**Sub-tasks**
- Create `resolveDefaults(input)` to output normalized reminder payload:
  - category
  - schedule (routine/specific time)
  - repeat
  - notification profile/tier
  - metadata (photo, location, ride flag, etc.)

**Acceptance criteria**
- Medication defaults repeat to Daily and uses baseline “gentle chime” behavior.

### Story 3.2: Next Slot Rule (General/Other)
**Sub-tasks**
- Implement “if no time provided, schedule at next routine anchor” algorithm.

**Acceptance criteria**
- Creating a reminder at 10:00 with no time schedules at next anchor (e.g., Lunch 12:30).

### Story 3.3: Appointment buffers + day-only parsing
**Sub-tasks**
- Add appointment scheduling mode that creates “2 hours before” and “1 day before” reminders.
- Implement weekday parsing rule (“Friday” → upcoming Friday).

**Acceptance criteria**
- Appointment saves generate buffer reminders by default.

### Story 3.4: Appointment conflict detection
**Sub-tasks**
- Detect overlapping appointment times during save.
- Display gentle prompt and allow user decision (adjust/move).

**Acceptance criteria**
- Conflicts trigger a prompt instead of a hard error.

### Story 3.5: Incomplete input safety net (Floating Note creation)
**Sub-tasks**
- Detect back/close during Add Reminder and auto-save draft to dashboard.
- Draft card actions: Set Time / Delete.

**Acceptance criteria**
- Abandoned input appears as Floating Note on next dashboard load.

---

## E4 — Notifications & Tier Delivery (RU-8)

### Story 4.1: Cross-platform local notification service wrapper
**Sub-tasks**
- Implement RN wrapper to schedule/cancel/update local notifications (Android + iOS).
- Support repeating and one-time schedules.

**Acceptance criteria**
- App can schedule and reschedule reminders after anchor changes.

### Story 4.2: Tier profiles (T1/T2/T3) as configuration
**Sub-tasks**
- Define tier profiles (sound channel, vibration pattern, priority, full-screen intent flags).
- Map category → tier (configurable).

**Acceptance criteria**
- Tier 1 uses highest interruptiveness; Tier 3 is non-intrusive (list/badge-only when feasible).

### Story 4.3: Smart delivery behaviors hooks
**Sub-tasks**
- Implement ramp-up volume strategy (within OS constraints) with fallback.
- Implement “in-hand” heuristic hooks where feasible (motion/proximity constraints acknowledged).

**Acceptance criteria**
- Delivery layer supports a strategy interface and degrades gracefully per platform.

---

## E5 — Active Experience (Full-screen Alert) (RU-3, RU-8, RU-10)

### Story 5.1: Full-screen alert screen (notification landing)
**Sub-tasks**
- Implement `ReminderAlertScreen` with large visuals and text.
- Render medication photo + instruction icons (with food/water) when present.

**Acceptance criteria**
- Notification opens a full-screen command UI (not only a tiny banner-only experience).

### Story 5.2: Action buttons behavior
**Sub-tasks**
- “I did it” → mark complete + log timestamp.
- “Remind me in 15 mins” → schedule follow-up at +15 minutes.
- “Skip this” → mark skipped (define state).

**Acceptance criteria**
- Button labels match exactly and avoid the word “Snooze”.

---

## E6 — Dashboard “Command Center” (RU-10, RU-5.2)

### Story 6.1: Timeline dashboard layout
**Sub-tasks**
- Implement vertical timeline sections: Weather header, Now/Next card, Later Today list.

**Acceptance criteria**
- Now/Next is visually dominant; Later Today scrolls.

### Story 6.2: Done Today section
**Sub-tasks**
- Implement “Done Today” list with green check and completion time.

**Acceptance criteria**
- Completed items move to Done Today instead of disappearing.

### Story 6.3: Floating Notes card rendering
**Sub-tasks**
- Display floating note at top with Set Time/Delete actions.

**Acceptance criteria**
- Draft card appears as a recovery mechanism for incomplete input.

---

## E7 — Adaptive Learning (RU-6)

### Story 7.1: Snooze pattern detection job
**Sub-tasks**
- Track snooze events and detect pattern: “same anchor snoozed to same later time 3 days in a row”.
- On day 4, show prompt to update routine anchor time.
- If accepted, update anchor and reschedule future reminders.

**Acceptance criteria**
- Prompt appears only after threshold; accepting updates anchor and reschedules.

---

## E8 — Caregiver Safety Net (Tier-1 Escalation) (RU-9)

### Story 8.1: Tier-1 escalation state machine
**Sub-tasks**
- Implement escalation timers: T+0 alert, +15 repeat, +45 nudge, +60 caregiver escalation.
- Stop escalation when reminder is marked done.

**Acceptance criteria**
- Escalation milestones trigger in order for Tier-1 items if unacknowledged.

### Story 8.2: Caregiver notification integration (backend-dependent)
**Sub-tasks**
- Define API contract/event for “unacknowledged Tier-1 at +60”.
- Implement push trigger path (server-driven recommended) and store caregiver link info.

**Acceptance criteria**
- Caregiver receives a message that meds were not marked done.

### Story 8.3: “Call Caregiver” UI state
**Sub-tasks**
- When escalation triggers, show prominent “Call Caregiver [Name]” CTA in the user UI.

**Acceptance criteria**
- Escalation state changes on-device UI to include call action.

---

## E9 — Accessibility & Tone (RU-11)

### Story 9.1: Accessibility compliance pass
**Sub-tasks**
- Enforce min 48x48dp touch targets in RN components.
- Implement typography/contrast tokens (off-white background, dark text) and test across key screens.

**Acceptance criteria**
- All primary actions meet touch target and contrast guidance.

### Story 9.2: Notification copy tone templates
**Sub-tasks**
- Create message template system that supports warm, contextual phrasing (non-robotic).

**Acceptance criteria**
- Appointment/medication notifications can render friendly text (e.g., greeting + helpful item).

---

## Open technical decisions (to finalize estimates)
1) Expo or bare React Native?
2) Is caregiver escalation server-backed (recommended) or on-device only?
