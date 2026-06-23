/** Remove legacy service workers that blocked Safari/Telegram with stale caches. */
export async function purgeServiceWorkersAndCaches() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    // ignore
  }

  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch {
      // ignore
    }
  }
}

export async function manageServiceWorkers() {
  await purgeServiceWorkersAndCaches();
}
