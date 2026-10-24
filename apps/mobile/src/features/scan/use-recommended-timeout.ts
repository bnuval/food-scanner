import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { log } from '@/lib/log';

/**
 * `baseMs`, extended to the user's Android accessibility "Time to take action" setting when
 * that is longer. Starts at `baseMs` until the system answers; iOS always returns `baseMs`.
 */
export function useRecommendedTimeout(baseMs: number): number {
  const [ms, setMs] = useState(baseMs);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.getRecommendedTimeoutMillis(baseMs)
      .then((recommended) => {
        if (alive && Number.isFinite(recommended)) setMs(Math.max(baseMs, recommended));
      })
      .catch((error: unknown) => log.warn('Recommended timeout unavailable', error));
    return () => {
      alive = false;
    };
  }, [baseMs]);
  return ms;
}
