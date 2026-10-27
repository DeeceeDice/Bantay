import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';

/**
 * System notifications for new alerts, on Android (the browser build uses
 * notifications.web.ts).
 *
 * These are local notifications: the app shows them itself when realtime
 * brings in a new alert while Bantay is running but not on screen. Nothing
 * reaches a phone whose app has been closed - that needs a push service
 * (Firebase Cloud Messaging), which Bantay does not have. See
 * docs/NOTIFICATIONS.md.
 */

const CHANNEL_ID = 'alerts';
let prepared: Promise<void> | null = null;

/** Sets the notification handler and the Android channel, once. */
export function prepareNotifications(): Promise<void> {
  prepared ??= (async () => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Hazard alerts',
        description: 'Verified hazards, typhoon warnings, broadcasts and your reports.',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#C8102E',
      });
    }
  })().catch(() => {
    prepared = null;
  });
  return prepared;
}

/**
 * Whether notifications may be shown, asking the person first when `ask` is
 * true and Android still allows asking.
 */
export async function notificationPermission(ask: boolean): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!ask || !current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** On screen, the Alerts tab's badge already says it; only notify when Bantay is not. */
export const appInBackground = (): boolean => AppState.currentState !== 'active';

export async function showAlertNotification(alert: {
  id: string;
  title: string;
  body: string;
}): Promise<void> {
  await prepareNotifications();
  await Notifications.scheduleNotificationAsync({
    content: { title: alert.title, body: alert.body, data: { alertId: alert.id } },
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
  });
}

/** Calls back when the person taps one of these notifications. */
export function onNotificationTap(callback: (alertId: string | null) => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const id = response.notification.request.content.data?.alertId;
    callback(typeof id === 'string' ? id : null);
  });
  return () => subscription.remove();
}
