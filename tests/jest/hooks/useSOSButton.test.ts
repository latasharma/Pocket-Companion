import { renderHook, act } from '@testing-library/react-hooks';
import { useSOSButton } from '@/hooks/useSOSButton';
import { triggerSOS } from '@/services/sos';

jest.mock('@/services/sos', () => ({
  triggerSOS: jest.fn().mockResolvedValue({ success: true }),
}));

describe('useSOSButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts idle', () => {
    const { result } = renderHook(() => useSOSButton());
    expect(result.current.state).toBe('idle');
  });

  it('transitions to success after triggering SOS', async () => {
    const { result } = renderHook(() => useSOSButton());

    await act(async () => {
      await result.current.handlePress();
    });

    expect(result.current.state).toBe('success');
    expect(triggerSOS).toHaveBeenCalledTimes(1);
  });

  it('transitions to error when SOS fails', async () => {
    (triggerSOS as jest.Mock).mockRejectedValueOnce(new Error('SOS failed'));

    const { result } = renderHook(() => useSOSButton());

    await act(async () => {
      await result.current.handlePress();
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toBeTruthy();
  });

  it('shows loading state during SOS trigger', async () => {
    (triggerSOS as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const { result } = renderHook(() => useSOSButton());

    act(() => {
      result.current.handlePress();
    });

    expect(result.current.state).toBe('loading');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
    });

    expect(result.current.state).toBe('success');
  });

  it('prevents multiple simultaneous SOS triggers', async () => {
    const { result } = renderHook(() => useSOSButton());

    await act(async () => {
      result.current.handlePress();
      result.current.handlePress();
      result.current.handlePress();
    });

    expect(triggerSOS).toHaveBeenCalledTimes(1);
  });

  it('resets state after timeout', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useSOSButton());

    await act(async () => {
      await result.current.handlePress();
    });

    expect(result.current.state).toBe('success');

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.state).toBe('idle');
    jest.useRealTimers();
  });
});

