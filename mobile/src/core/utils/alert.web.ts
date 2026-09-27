import type { AlertButton } from 'react-native';

/**
 * `Alert.alert` for the web build, on the browser's own dialogs.
 *
 * react-native-web leaves `Alert.alert` as a no-op, so without this a browser
 * never shows an error, never confirms a log-out and never leaves the report
 * flow. Buttons map onto what a browser offers: none, or a single one, is a
 * `window.alert` followed by that button's action; an action beside a cancel
 * button is a `window.confirm`, whose OK runs the action.
 */
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]): void {
    const cancel = buttons?.find((b) => b.style === 'cancel');
    const actions = (buttons ?? []).filter((b) => b !== cancel);
    const text = message ? `${title}\n\n${message}` : title;

    const action = actions[0];
    if (!action || !cancel) {
      window.alert(text);
      (action ?? cancel)?.onPress?.();
      return;
    }

    // "Log out?" already asks the question; "Route deleted" needs "Undo?".
    const asks = action.text && !title.toLowerCase().includes(action.text.toLowerCase());
    if (window.confirm(asks ? `${text}\n\n${action.text}?` : text)) action.onPress?.();
    else cancel.onPress?.();
  },
};
