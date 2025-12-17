// Note: @testing-library/jest-native is deprecated
// Jest matchers are now built into @testing-library/react-native v12.4+
import '@testing-library/jest-dom';

// Mock React Native polyfills that use Flow syntax
jest.mock('@react-native/js-polyfills/error-guard', () => ({
  setGlobalErrorHandler: jest.fn(),
  getGlobalErrorHandler: jest.fn(),
}));

jest.mock('expo-linking', () => ({ openURL: jest.fn() }));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

