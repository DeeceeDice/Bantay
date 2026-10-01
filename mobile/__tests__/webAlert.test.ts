/**
 * The browser build's stand-in for Alert.alert: flows that continue from an
 * alert's button must still continue in a browser.
 */
import { Alert, Platform } from 'react-native';

import { installWebAlert } from '../src/core/platform/webAlert';

const g = globalThis as unknown as { alert: jest.Mock; confirm: jest.Mock };
const original = Alert.alert;

beforeEach(() => {
  Alert.alert = original;
  g.alert = jest.fn();
  g.confirm = jest.fn();
  Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });
  installWebAlert();
});

afterAll(() => {
  Alert.alert = original;
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
});

describe('web Alert.alert', () => {
  it('shows a single-button alert and then runs its action', () => {
    const done = jest.fn();
    Alert.alert('Request sent', 'A super admin will review it.', [{ text: 'Done', onPress: done }]);
    expect(g.alert).toHaveBeenCalledWith('Request sent\n\nA super admin will review it.');
    expect(done).toHaveBeenCalled();
  });

  it('runs the action when a two-button prompt is confirmed', () => {
    const logOut = jest.fn();
    const cancel = jest.fn();
    g.confirm.mockReturnValue(true);
    Alert.alert('Log out?', undefined, [
      { text: 'Cancel', style: 'cancel', onPress: cancel },
      { text: 'Log out', style: 'destructive', onPress: logOut },
    ]);
    expect(g.confirm).toHaveBeenCalledWith('Log out?\n\nOK: Log out');
    expect(logOut).toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it('runs the cancel button when the prompt is dismissed', () => {
    const remove = jest.fn();
    const cancel = jest.fn();
    g.confirm.mockReturnValue(false);
    Alert.alert('Delete route?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel', onPress: cancel },
      { text: 'Delete', style: 'destructive', onPress: remove },
    ]);
    expect(remove).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalled();
  });
});
