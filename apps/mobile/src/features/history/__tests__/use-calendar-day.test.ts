import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { msUntilNextDay, startOfDay, useCalendarDay } from '../use-calendar-day';

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();

describe('day helpers', () => {
  it('finds the start of the local day and the time to the next one', () => {
    expect(startOfDay(at(2026, 10, 24, 15, 30))).toBe(at(2026, 10, 24));
    expect(msUntilNextDay(at(2026, 10, 24, 23, 59))).toBe(60_000);
  });
});

describe('useCalendarDay', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: at(2026, 10, 24, 23, 59) });
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('rolls over at local midnight', async () => {
    const { result } = await renderHook(() => useCalendarDay());
    expect(result.current).toBe(at(2026, 10, 24));
    await act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(result.current).toBe(at(2026, 10, 25));
  });

  it('catches up when the app returns to the foreground on a later day', async () => {
    const addListener = jest.mocked(AppState.addEventListener);
    addListener.mockClear();
    const { result } = await renderHook(() => useCalendarDay());
    const onChange = addListener.mock.calls[0]?.[1] as (state: AppStateStatus) => void;

    // Suspended apps don't run timers: move the clock without firing them.
    jest.setSystemTime(at(2026, 10, 27, 9));
    await act(() => onChange('active'));
    expect(result.current).toBe(at(2026, 10, 27));
  });
});
