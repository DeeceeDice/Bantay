import { Platform } from 'react-native';

/** True in the browser build. */
export const isWeb = Platform.OS === 'web';

/**
 * In a browser the app keeps a phone-sized column (centred on wide screens)
 * rather than stretching across a monitor; sheets match it.
 */
export const WEB_COLUMN_WIDTH = 480;
