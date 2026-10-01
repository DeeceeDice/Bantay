import { Alert, AlertButton, Platform } from 'react-native';

/**
 * React Native's `Alert.alert` does nothing in a browser, and several flows
 * continue from an alert's button (request sent -> done, log out?, delete
 * route?). In the browser build, show the browser's own dialogs instead:
 *
 * - one button (or none): an alert, then that button's action;
 * - two or more: a confirm whose OK runs the non-cancel action and whose
 *   Cancel runs the cancel button, with the action named in the text.
 */
export function installWebAlert(): void {
  if (Platform.OS !== 'web') return;
  const browser = globalThis as unknown as {
    alert: (text: string) => void;
    confirm: (text: string) => boolean;
  };

  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]): void => {
    const text = [title, message].filter((part) => !!part).join('\n\n');
    const list = buttons ?? [];
    if (list.length <= 1) {
      browser.alert(text);
      list[0]?.onPress?.();
      return;
    }
    const cancel = list.find((b) => b.style === 'cancel') ?? list[0];
    const action = list.find((b) => b !== cancel) ?? list[list.length - 1];
    const prompt = action.text ? `${text}\n\nOK: ${action.text}` : text;
    if (browser.confirm(prompt)) action.onPress?.();
    else cancel.onPress?.();
  };
}
