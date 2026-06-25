import { useEffect, useRef, useState } from 'react';

/** Page Visibility — pause polling when tab/WebView is in background (saves iOS Safari). */
export function usePageVisible() {
  const [visible, setVisible] = useState(() =>
    typeof document === 'undefined' ? true : document.visibilityState !== 'hidden'
  );

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  return visible;
}

/** setInterval that runs only while the page is visible; cleans up on unmount. */
export function useSafeInterval(callback, delayMs, enabled = true) {
  const cbRef = useRef(callback);
  cbRef.current = callback;
  const visible = usePageVisible();

  useEffect(() => {
    if (!enabled || !visible || !delayMs || delayMs <= 0) return undefined;
    const id = window.setInterval(() => cbRef.current(), delayMs);
    return () => window.clearInterval(id);
  }, [delayMs, enabled, visible]);
}

/** Ignore stale async results after unmount or dependency change. */
export function useMountedRef() {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  return mounted;
}
