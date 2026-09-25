/**
 * The only things Bantay keeps on the device, as opposed to in the database.
 *
 * Both are preferences about this phone rather than data about anyone:
 * whether the intro slides have been seen, and display settings. Accounts,
 * reports, routes and alerts all live in Supabase. The signed-in session is
 * persisted by the Supabase client itself.
 */
export const StoreKeys = {
  onboardingSeen: 'bantay.onboarding_seen',
  settings: 'bantay.settings',
} as const;
