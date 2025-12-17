# Testing Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
# Core testing dependencies
npm install --save-dev \
  jest \
  jest-expo \
  @testing-library/react-native \
  @testing-library/jest-native \
  @testing-library/react-hooks \
  @testing-library/jest-dom \
  @testing-library/react \
  detox \
  detox-cli \
  cypress \
  supertest \
  @types/jest \
  @types/supertest \
  @types/node

# Additional React Native testing utilities
npm install --save-dev \
  @react-native-async-storage/async-storage \
  react-test-renderer
```

### 2. Configure Environment

#### Jest Configuration
✅ Already configured in `tests/jest/jest.config.js`

#### Detox Configuration
1. Update `tests/detox/.detoxrc.js` with your actual app paths
2. For iOS: Update `binaryPath` and `build` commands
3. For Android: Update `binaryPath` and `build` commands

#### Cypress Configuration
✅ Already configured in `tests/cypress/cypress.config.ts`
- Update `baseUrl` if your dev server runs on a different port

#### AI Evals Configuration
1. Copy `tests/ai-evals/config.example.json` to `tests/ai-evals/config.json`
2. Add your OpenAI API key
3. Adjust model settings as needed

### 3. Run Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E (Cypress)
npm run cypress:open

# Mobile E2E (Detox)
npm run test:detox

# API tests
npm run test:api

# AI evaluations
npm run test:ai-evals
```

## Platform-Specific Setup

### React Native / Expo Setup

If you're using Expo, ensure `jest-expo` is properly configured:

```json
{
  "jest": {
    "preset": "jest-expo"
  }
}
```

### Detox Setup

1. **iOS:**
   ```bash
   # Install Detox CLI globally
   npm install -g detox-cli
   
   # Build the app
   detox build --configuration ios.sim.debug
   
   # Run tests
   detox test --configuration ios.sim.debug
   ```

2. **Android:**
   ```bash
   # Build the app
   detox build --configuration android.emu.debug
   
   # Run tests
   detox test --configuration android.emu.debug
   ```

### Cypress Setup

1. **First time setup:**
   ```bash
   npx cypress open
   ```

2. **Run in CI:**
   ```bash
   npm run test:cypress
   ```

## Troubleshooting

### Common Issues

1. **Jest tests failing with module resolution:**
   - Check `moduleNameMapper` in `jest.config.js`
   - Ensure paths match your project structure

2. **Detox tests timing out:**
   - Increase timeout in `e2e.init.js`
   - Ensure simulator/emulator is running
   - Check app build paths

3. **Cypress tests failing:**
   - Ensure dev server is running
   - Check `baseUrl` in `cypress.config.ts`
   - Verify test selectors match actual DOM

4. **AI evals not running:**
   - Ensure `config.json` exists
   - Verify API key is valid
   - Check API rate limits

## Next Steps

1. Write tests for your existing components
2. Add more test cases as you develop features
3. Set up CI/CD to run tests automatically
4. Monitor test coverage and aim for >80%

