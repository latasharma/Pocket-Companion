/** @type {import('jest').Config} */

module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/setupTests.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../../$1',
    '^@react-native/js-polyfills/error-guard$': '<rootDir>/../../node_modules/@react-native/js-polyfills/error-guard.js',
  },
  testMatch: ['**/tests/jest/**/*.test.(ts|tsx)'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/__tests__/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native/.*|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
};

