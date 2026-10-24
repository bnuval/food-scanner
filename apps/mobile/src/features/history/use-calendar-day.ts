import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Local midnight at the start of the day containing `now`. */
export function startOfDay(now: number): number {
  const date = new Date(now);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Milliseconds from `now` until the next local midnight (DST-safe: built from calendar fields). */
export function msUntilNextDay(now: number): number {
  const date = new Date(now);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime() - now;
}

/**
 * Start of the current local day. Changes at midnight, and when the app returns to the
 * foreground on a later day (timers don't run while the app is suspended), so labels such
 * as "Today, 10:32" can be recomputed by passing this value into the formatting.
 */
export function useCalendarDay(): number {
  const [day, setDay] = useState(() => startOfDay(Date.now()));

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      const now = Date.now();
      setDay(startOfDay(now)); // Same day → same number → no re-render.
      // A timer that fires a little early just schedules another, shorter one.
      timer = setTimeout(refresh, msUntilNextDay(now));
    };
    timer = setTimeout(refresh, msUntilNextDay(Date.now()));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, []);

  return day;
}
