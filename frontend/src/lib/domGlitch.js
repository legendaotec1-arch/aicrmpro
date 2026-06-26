/** React DOM reconciliation glitches (removeChild / insertBefore) — не критичны для UX */
export const DOM_GLITCH_RE = /removeChild|insertBefore|not a child of this node/i;

export function isDomGlitchError(error) {
  const message = error?.message || String(error || '');
  return DOM_GLITCH_RE.test(message);
}
