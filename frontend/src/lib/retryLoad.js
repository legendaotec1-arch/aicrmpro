/** Повторная загрузка dynamic import (iOS Safari иногда обрывает chunk при первом запросе). */
export function retryLoad(importFn, attempts = 3, delayMs = 1000) {
  return importFn().catch((error) => {
    if (attempts <= 1) throw error;
    return new Promise((resolve) => window.setTimeout(resolve, delayMs)).then(() =>
      retryLoad(importFn, attempts - 1, delayMs)
    );
  });
}
