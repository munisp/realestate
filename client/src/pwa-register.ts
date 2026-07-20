/**
 * PWA Service Worker Registration
 * Uses a non-blocking toast notification for updates (no confirm() dialog)
 */

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Dispatch a custom event so the UI can show a non-blocking toast
            window.dispatchEvent(new CustomEvent('sw-update-available', {
              detail: { worker: newWorker }
            }));
          }
        });
      });

      // Register periodic sync for price alerts (if supported)
      if ('periodicSync' in registration) {
        try {
          const status = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName });
          if (status.state === 'granted') {
            await (registration as any).periodicSync.register('update-alerts', { minInterval: 24 * 60 * 60 * 1000 });
          }
        } catch { /* not supported */ }
      }
    } catch (error) {
      console.error('[SW] Registration failed:', error);
    }
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export async function subscribeToPushNotifications(vapidPublicKey: string): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  const registration = await navigator.serviceWorker.ready;
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    return subscription;
  } catch (e) {
    console.error('[SW] Push subscription failed:', e);
    return null;
  }
}

export async function registerBackgroundSync(tag: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  if ('sync' in registration) {
    try { await (registration as any).sync.register(tag); } catch { /* not supported */ }
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}
