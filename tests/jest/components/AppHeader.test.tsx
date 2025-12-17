import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AppHeader } from '@/components/AppHeader';

// Mock navigation
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

describe('AppHeader', () => {
  it('renders the header title correctly', () => {
    const { getByText } = render(<AppHeader title="PoCo" />);
    expect(getByText('PoCo')).toBeTruthy();
  });

  it('shows back button when canGoBack is true', () => {
    const { getByTestId } = render(
      <AppHeader title="Settings" canGoBack={true} />
    );
    expect(getByTestId('back-button')).toBeTruthy();
  });

  it('calls onBack when back button is pressed', () => {
    const onBack = jest.fn();
    const { getByTestId } = render(
      <AppHeader title="Settings" canGoBack={true} onBack={onBack} />
    );
    
    fireEvent.press(getByTestId('back-button'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders custom right action when provided', () => {
    const RightAction = () => <div testID="right-action">Menu</div>;
    const { getByTestId } = render(
      <AppHeader title="PoCo" rightAction={<RightAction />} />
    );
    expect(getByTestId('right-action')).toBeTruthy();
  });
});

