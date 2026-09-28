/**
 * Bantay brand palette.
 *
 * The logo is a blue eye with a red map-pin pupil, so deep red and blue carry
 * the brand while orange and green are reserved exclusively for hazard state
 * (pending vs. verified-safe). Nothing else in the UI may use the state
 * colours, so a glance at the map is unambiguous.
 */
export const Colors = {
  /** Primary brand red, from the map-pin pupil in the logo. */
  brandRed: '#C8102E',
  brandRedDark: '#9B0C23',
  brandRedLight: '#F7DDE2',

  /** Secondary brand blue, from the eye shape in the logo. */
  brandBlue: '#1B4FA0',
  brandBlueDark: '#123772',
  brandBlueLight: '#DFE8F5',

  /** Pending / unverified / caution state. */
  warning: '#F4772E',
  warningDark: '#C25718',
  warningLight: '#FDEAE0',

  /** Verified-safe state. */
  safe: '#2E9E44',
  safeDark: '#1F7330',
  safeLight: '#E0F3E4',

  /** The user's own live location. */
  userLocation: '#1E88E5',

  // Neutrals tuned for outdoor legibility: high contrast, low chroma.
  ink: '#14181F',
  inkMuted: '#5A6472',
  inkFaint: '#8B94A3',
  line: '#E2E6EC',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F7FA',
  white: '#FFFFFF',
} as const;

/**
 * Minimum tap target. Bantay is used one-handed, outdoors, in the rain, often
 * in a hurry, so every interactive control honours this.
 */
export const MIN_TAP_TARGET = 48;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

/** Shared elevation presets, since RN shadows differ per platform. */
export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
} as const;
