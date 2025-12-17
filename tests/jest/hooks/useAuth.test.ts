import { renderHook, act, waitFor } from '@testing-library/react-hooks';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with null user', () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });

    const { result } = renderHook(() => useAuth());
    
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it('loads user session on mount', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
    };

    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: mockUser } },
    });

    const { result, waitForNextUpdate } = renderHook(() => useAuth());

    await waitForNextUpdate();

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.loading).toBe(false);
  });

  it('signs in user successfully', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
    };

    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: mockUser, session: { user: mockUser } },
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn('test@example.com', 'password123');
    });

    expect(result.current.user).toEqual(mockUser);
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('handles sign in errors', async () => {
    const mockError = { message: 'Invalid credentials' };

    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      data: { user: null, session: null },
      error: mockError,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn('test@example.com', 'wrongpassword');
    });

    expect(result.current.user).toBeNull();
    expect(result.current.error).toBe(mockError.message);
  });

  it('signs out user successfully', async () => {
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({
      error: null,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('listens to auth state changes', () => {
    const mockUnsubscribe = jest.fn();
    const mockCallback = jest.fn();

    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((callback) => {
      // Simulate auth state change
      setTimeout(() => {
        callback('SIGNED_IN', {
          data: { session: { user: { id: '123' } } },
        });
      }, 100);
      return { data: { subscription: null }, unsubscribe: mockUnsubscribe };
    });

    const { result } = renderHook(() => useAuth());

    expect(supabase.auth.onAuthStateChange).toHaveBeenCalled();
  });
});

