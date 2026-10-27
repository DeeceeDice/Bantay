/**
 * System notifications for new alerts, in the browser build: the browser's
 * own Notification API, shown while the Bantay tab is open but hidden.
 *
 * Desktop browsers show these. Chrome on Android only shows notifications
 * from a service worker, which this build does not have, so there a failed
 * notification is simply skipped - the Alerts tab still has the alert.
 */

const tapListeners = new Set<(alertId: string | null) => void>();

const supported = (): boolean => typeof window !== 'undefined' && 'Notification' in window;

export async function prepareNotifications(): Promise<void> {}

/**
 * Whether notifications may be shown. Browsers only let a page ask in
 * answer to a tap, so `ask` should be true only from the settings switch.
 */
export async function notificationPermission(ask: boolean): Promise<boolean> {
  if (!supported()) return false;
  if (Notification.permission === 'granted') return true;
  if (!ask || Notification.permission === 'denied') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

export const appInBackground = (): boolean =>
  typeof document !== 'undefined' && document.visibilityState === 'hidden';

export async function showAlertNotification(alert: {
  id: string;
  title: string;
  body: string;
}): Promise<void> {
  if (!supported() || Notification.permission !== 'granted') return;
  try {
    const shown = new Notification(alert.title, { body: alert.body, tag: alert.id });
    shown.onclick = () => {
      window.focus();
      tapListeners.forEach((listener) => listener(alert.id));
      shown.close();
    };
  } catch {
    // Chrome on Android: notifications need a service worker. Skipped.
  }
}

export function onNotificationTap(callback: (alertId: string | null) => void): () => void {
  tapListeners.add(callback);
  return () => {
    tapListeners.delete(callback);
  };
}
