# Mobile App Testing Guide

## Test Suites for Your PoCo Mobile App

Since you're building a **mobile app** (not a web app), here's what you actually need:

### ✅ **Jest** - Unit & Integration Tests
**For:** Testing React Native components, hooks, and utilities

**What it tests:**
- Individual components (ChatScreen, AppHeader, etc.)
- Custom hooks (useAuth, useSOSButton, etc.)
- Utility functions (formatMoodEntry, etc.)

**Run it:**
```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode (auto-rerun on changes)
npm run test:coverage       # See coverage report
```

### ✅ **Detox** - Mobile E2E Tests
**For:** End-to-end testing of your mobile app on iOS/Android

**What it tests:**
- Complete user flows (onboarding, login, chat, SOS)
- App navigation
- User interactions (taps, swipes, typing)
- Real device/simulator testing

**Run it:**
```bash
npm run test:detox
```

### ✅ **Supertest** - API Tests
**For:** Testing your backend API endpoints

**What it tests:**
- Authentication endpoints
- SOS API endpoints
- Any other backend APIs

**Run it:**
```bash
npm run test:api
```

### ✅ **AI Evals** - AI Response Testing
**For:** Testing PoCo's AI companion responses

**What it tests:**
- Safety of AI responses
- Coaching effectiveness
- Medication handling

**Run it:**
```bash
npm run test:ai-evals
```

---

## ❌ **Cypress** - NOT NEEDED
**Skip this!** Cypress is for web applications. Since you're building a mobile app, you don't need it.

---

## Quick Start for Mobile App Testing

### 1. Install Testing Dependencies

```bash
npm install --save-dev \
  jest \
  jest-expo \
  @testing-library/react-native \
  @testing-library/jest-native \
  @testing-library/react-hooks \
  detox \
  detox-cli \
  supertest \
  @types/jest \
  @types/supertest
```

### 2. Start Testing Your Mobile App

#### Test Components (Jest)
```bash
# Create a test file
touch tests/jest/components/YourComponent.test.tsx

# Run tests
npm test
```

#### Test E2E Flows (Detox)
```bash
# Make sure your app is built
detox build --configuration ios.sim.debug

# Run E2E tests
npm run test:detox
```

#### Test APIs (Supertest)
```bash
# Create API test
touch tests/supertest/your-api.test.ts

# Run API tests
npm run test:api
```

---

## Testing Your CONNECT Feature (Mobile App)

Since CONNECT is a mobile app feature, here's what to test:

### 1. Component Tests (Jest)
Test your React Native components:
- `ConnectScreen` component
- `GroupCard` component
- `ActivityList` component

### 2. Hook Tests (Jest)
Test your custom hooks:
- `useConnect` hook
- `useGroupJoin` hook
- `useActivityRSVP` hook

### 3. E2E Tests (Detox)
Test complete user flows:
- Browse groups
- Join a group
- View activities
- RSVP to an event
- Report inappropriate content

### 4. API Tests (Supertest)
Test backend endpoints:
- GET /api/connect/groups
- POST /api/connect/groups/:id/join
- GET /api/connect/activities
- POST /api/connect/report

---

## Focus on These Test Suites

1. **Jest** - Most important for day-to-day development
2. **Detox** - Critical for ensuring the app works end-to-end
3. **Supertest** - Important for backend reliability
4. **AI Evals** - Essential for PoCo's AI companion quality

**Skip Cypress** - It's only for web apps!

