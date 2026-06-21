function legacyCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.cssText = 'position:fixed;top:0;left:0;width:2em;height:2em;padding:0;border:none;opacity:0;';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

/**
 * Копирует текст в буфер (Clipboard API + запасной execCommand).
 */
export async function copyToClipboard(text) {
  const value = String(text ?? '').trim();
  if (!value) {
    throw new Error('Пустая ссылка');
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      /* fallback */
    }
  }

  if (legacyCopy(value)) {
    return true;
  }

  throw new Error('Copy failed');
}
