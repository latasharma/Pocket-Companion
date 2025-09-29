# PoCo PRD Snapshot (Working)

## 1) Product Overview
- Purpose: Voice-first, companion-like AI for elders; friendly, fast, and private.
- Audience: Elders (65+), caregivers, families.
- Tone/Brand: Emerald green branding, warm companion tone, simple UX.

## 2) Goals (Must-Haves for v1.x)
1. Reliable voice + chat with low latency and cost control.
2. Clear, accessible UI with large text and simple navigation.
3. App Store safety via feature flags (agents and experiments off in prod).
4. Foundation for elder health features: medication and health check-ins.

## 3) Non-Goals (for now)
- Full reminders suite, complex caregiver dashboards, advanced healthcare integrations, and subscription/Connect for this variant.

## 4) Scope & Requirements

### 4.1 Core Experience
- Chat powered by Gemini; stable fallback behavior.
- Voice input and output (ElevenLabs planned/available), no multi-step mic friction.
- Conversation history and error handling.
- Branding consistency: emerald palette, logo, and accessible typography.

### 4.2 Navigation & Profile
- Tab navigation: Home, Chat, Profile.
- Profile: avatar upload and basic preferences.

### 4.3 Elder Health (Phase 2 foundations)
- Medication: reminders, taken/not-taken logging, basic schedule view.
- Health check-ins: mood/symptom daily check-ins, lightweight history.
- Safety basics: emergency contacts and medical ID card.

### 4.4 Architecture & Safety
- Agent architecture scaffold with supervisor + specialist agents.
- Controlled via env flags; default disabled in production.
- Build variants possible (e.g., without Connect/Subscription), with release records.

## 5) Acceptance Criteria (Representative)
1. When agents are disabled in prod, no agent code paths execute.
2. Tabs visible with routes: Home, Chat, Profile.
3. Profile screen lets user set an avatar and saves it locally.
4. User can add a medication reminder and receives a local notification at time.
5. User can log a dose as taken/missed and see it reflected in a simple history.
6. Daily check-in allows mood and 1–2 symptoms; entries list shows last 7 days.
7. Emergency card shows name, DOB, allergies, medications, and emergency contacts.
8. Voice flows work end-to-end: speak → transcribe → respond → optional TTS.
9. App uses emerald theme consistently; no purple defaults appear.

## 6) Out of Scope (This Release)
- Subscriptions, paywalls, Connect; wearable integrations; telemedicine; provider messaging; caregiver web dashboard.

## 7) Current Build vs PRD Delta

### Already Delivered
- RN + Expo app, Expo Router, NativeWind.
- Chat with Gemini; message history; error states.
- Voice I/O integrated; brand theme applied.
- Agent framework (disabled in prod) with flags.
- iOS Build 16 recorded as “without Connect/Subscription.”

### Gaps to Close Next
- Implement tab navigation.
- Build Profile with avatar and preferences.
- Implement medication reminders + logging (local notifications acceptable initially).
- Add daily health check-in flow with minimal UI.
- Create emergency contacts + medical ID screens.

## 8) Risks & Mitigations
- Voice UX friction: adopt single-tap or auto-stop patterns.
- App Store risk: keep flags off; verify before each release.
- Cost/latency: cache, short prompts, and streaming responses.

## 9) Tracking & Evidence
- Release records: `PROJECT_STATUS.md`.
- Verification notes: `TEST_RESULTS.md`.
- This PRD snapshot: `PRD_SNAPSHOT.md` (living document; update as scope evolves).


