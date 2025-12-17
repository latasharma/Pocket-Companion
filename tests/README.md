# Testing Guide for ai-pocket-companion Mobile App

## ✅ Test Suites for Your Mobile App

Your mobile app (`ai-pocket-companion`) now has a complete testing architecture!

### 1. **Jest** - Unit & Integration Tests
**For:** Testing React Native components, hooks, and utilities

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode (auto-rerun on changes)
npm run test:coverage # See coverage report
```

### 2. **Detox** - Mobile E2E Tests
**For:** End-to-end testing on iOS/Android simulators/devices

```bash
npm run test:detox
```

### 3. **Supertest** - API Tests
**For:** Testing your backend API endpoints

```bash
npm run test:api
```

### 4. **AI Evals** - AI Response Testing
**For:** Testing PoCo's AI companion responses

```bash
npm run test:ai-evals
```

---

## Quick Start

### 1. Install Testing Dependencies

```bash
cd /Users/latasharma/ai-pocket-companion

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

### 2. Run Tests

```bash
# Unit tests
npm test

# E2E tests (after building app)
npm run test:detox

# API tests
npm run test:api
```

---

## Testing Your CONNECT Feature

Since CONNECT is a mobile app feature, test it with:

### Jest Component Tests
```bash
# Create test file
touch tests/jest/components/ConnectScreen.test.tsx

# Run tests
npm test
```

### Detox E2E Tests
```bash
# Test complete user flows
npm run test:detox
```

### API Tests
```bash
# Test backend endpoints
npm run test:api
```

---

## Project Structure

```
ai-pocket-companion/
├── tests/
│   ├── jest/          # Unit & Integration Tests
│   ├── detox/         # Mobile E2E Tests
│   ├── supertest/     # API Tests
│   └── ai-evals/      # AI Response Evaluations
└── package.json       # Test scripts added ✅
```

---

## Next Steps

1. Install dependencies (see above)
2. Write tests for your components
3. Run tests as you develop
4. Use the templates in `tests/jest/` as examples

Your test suites are ready to use! 🎉
