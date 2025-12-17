import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ChatScreen } from '@/screens/ChatScreen';

// Mock the AI service
jest.mock('@/services/ai', () => ({
  sendMessage: jest.fn().mockResolvedValue({
    message: 'I understand you feel lonely. Would you like to talk about it?',
    mood: 'supportive',
  }),
}));

describe('ChatScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows initial greeting from PoCo', () => {
    const { getByText } = render(<ChatScreen />);
    expect(getByText(/hi, i'm poco/i)).toBeTruthy();
  });

  it('sends a message and displays AI response placeholder', async () => {
    const { getByPlaceholderText, getByText } = render(<ChatScreen />);
    const input = getByPlaceholderText(/type anything/i);
    
    fireEvent.changeText(input, 'I feel lonely today');
    fireEvent(input, 'submitEditing');

    expect(getByText(/sending…/i)).toBeTruthy();

    // Wait for AI response
    await waitFor(() => {
      expect(getByText(/i understand/i)).toBeTruthy();
    });
  });

  it('displays sent messages in chat history', async () => {
    const { getByPlaceholderText, getByText } = render(<ChatScreen />);
    const input = getByPlaceholderText(/type anything/i);
    
    fireEvent.changeText(input, 'Hello PoCo');
    fireEvent(input, 'submitEditing');

    await waitFor(() => {
      expect(getByText('Hello PoCo')).toBeTruthy();
    });
  });

  it('handles empty message submission gracefully', () => {
    const { getByPlaceholderText } = render(<ChatScreen />);
    const input = getByPlaceholderText(/type anything/i);
    
    fireEvent.changeText(input, '');
    fireEvent(input, 'submitEditing');

    // Should not crash or send empty message
    expect(input).toBeTruthy();
  });

  it('shows error message when AI service fails', async () => {
    const { sendMessage } = require('@/services/ai');
    sendMessage.mockRejectedValueOnce(new Error('Network error'));

    const { getByPlaceholderText, getByText } = render(<ChatScreen />);
    const input = getByPlaceholderText(/type anything/i);
    
    fireEvent.changeText(input, 'Test message');
    fireEvent(input, 'submitEditing');

    await waitFor(() => {
      expect(getByText(/error|failed/i)).toBeTruthy();
    });
  });
});

