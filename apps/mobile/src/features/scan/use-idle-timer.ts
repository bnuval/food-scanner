import { useEffect, useRef, useState } from 'react';

/**
 * Becomes idle after `timeoutMs` without a `markActive()` call. `markActive` only stamps a
 * ref (cheap enough for every touch); `resume()` leaves the idle state and starts a fresh
 * period. No timer runs while idle or after unmount.
 */
export function useIdleTimer(timeoutMs: number) {
  const [idle, setIdle] = useState(false);
  const lastActiveAt = useRef(0);

  useEffect(() => {
    if (idle) return;
    lastActiveAt.current = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      const left = lastActiveAt.current + timeoutMs - Date.now();
      if (left <= 0) setIdle(true);
      else timer = setTimeout(check, left);
    };
    timer = setTimeout(check, timeoutMs);
    return () => clearTimeout(timer);
  }, [idle, timeoutMs]);

  const markActive = () => {
    lastActiveAt.current = Date.now();
  };

  const resume = () => {
    lastActiveAt.current = Date.now();
    setIdle(false);
  };

  return { idle, markActive, resume };
}
