import * as Crypto from 'expo-crypto';

/**
 * A v4 UUID for a new report, route or alert.
 *
 * Generated on the device rather than by the database so the row can be shown
 * the moment it is created and written in the same shape it was displayed.
 * The id columns are `uuid`, so anything else would be refused on insert.
 */
export const uuid = (): string => Crypto.randomUUID();
