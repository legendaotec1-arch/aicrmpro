import { useCallback, useRef } from 'react';

/** Игнорирует повторные вызовы чаще delayMs (защита от «долбёжки» по кнопкам на тач-экране). */
export function useLeadingThrottle(callback, delayMs = 320) {
  const cbRef = useRef(callback);
  const lastAtRef = useRef(0);
  cbRef.current = callback;

  return useCallback(
    (...args) => {
      const now = Date.now();
      if (now - lastAtRef.current < delayMs) return;
      lastAtRef.current = now;
      cbRef.current(...args);
    },
    [delayMs]
  );
}
