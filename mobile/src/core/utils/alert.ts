/**
 * The app's dialogs: React Native's own `Alert` on Android and iOS.
 *
 * Screens import `Alert` from here rather than from react-native, because
 * react-native-web implements `Alert.alert` as a no-op - in a browser every
 * error, confirmation and "Log out?" would silently do nothing. Metro picks
 * `alert.web.ts` for the web build instead of this file.
 */
export { Alert } from 'react-native';
