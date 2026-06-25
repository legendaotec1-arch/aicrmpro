const seenStages = new Set();

/** Boot stage log — console only; server ping once per stage (diagnostics). */
export function bootLog(stage, extra = {}) {
  try {
    console.log(`[woner-boot] ${stage}`, extra);
  } catch {
    /* ignore */
  }

  // Never spam the server (was causing ERR_INSUFFICIENT_RESOURCES in a render loop).
  if (!stage || seenStages.has(stage)) return;
  seenStages.add(stage);

  // High-frequency storage events — console only.
  if (stage.startsWith('CLIENT_TOKEN_SAVE')) return;

  try {
    const payload = JSON.stringify({
      stage,
      t: Date.now(),
      path: typeof location !== 'undefined' ? location.pathname : '',
      search: typeof location !== 'undefined' ? location.search?.slice(0, 200) : '',
      ua: typeof navigator !== 'undefined' ? navigator.userAgent?.slice(0, 160) : '',
      ...extra,
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/debug-log', new Blob([payload], { type: 'application/json' }));
      return;
    }
    fetch('/api/debug-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
