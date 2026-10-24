import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { useIdleTimer } from '../use-idle-timer';

const TIMEOUT = 90_000;

describe('useIdleTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('goes idle after the timeout without activity', async () => {
    const { result } = await renderHook(() => useIdleTimer(TIMEOUT));
    expect(result.current.idle).toBe(false);
    await act(async () => {
      jest.advanceTimersByTime(TIMEOUT - 1);
    });
    expect(result.current.idle).toBe(false);
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.idle).toBe(true);
  });

  it('restarts the period on activity', async () => {
    const { result } = await renderHook(() => useIdleTimer(TIMEOUT));
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    await act(async () => {
      result.current.markActive();
    });
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(result.current.idle).toBe(false);
    await act(async () => {
      jest.advanceTimersByTime(30_000);
    });
    expect(result.current.idle).toBe(true);
  });

  it('resumes with a fresh period', async () => {
    const { result } = await renderHook(() => useIdleTimer(TIMEOUT));
    await act(async () => {
      jest.advanceTimersByTime(TIMEOUT);
    });
    expect(result.current.idle).toBe(true);
    await act(async () => {
      result.current.resume();
    });
    expect(result.current.idle).toBe(false);
    await act(async () => {
      jest.advanceTimersByTime(TIMEOUT - 1);
    });
    expect(result.current.idle).toBe(false);
  });
});
