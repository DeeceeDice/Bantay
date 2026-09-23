import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import { LatLng, latLng } from '../core/geo/latLng';
import { FALLBACK_USER_LOCATION } from '../data/seed/seedData';

export type LocationSource = 'device' | 'fallback' | 'unknown';

export interface LocationState {
  current: LatLng;
  source: LocationSource;
  isLocating: boolean;
  hasRealFix: boolean;
  requestAndLocate(): Promise<boolean>;
  refresh(): Promise<void>;
  useFallback(): void;
}

/**
 * The user's live location, with a graceful fallback.
 *
 * Declining location still lets the user in, so this hook never blocks: if
 * permission is refused, the hardware is off, or the fix times out, it
 * reports the Manila fallback and flags the source, so the UI can explain why
 * the blue dot is where it is rather than silently lying about accuracy.
 */
export function useLocation(): LocationState {
  const [current, setCurrent] = useState<LatLng>(FALLBACK_USER_LOCATION);
  const [source, setSource] = useState<LocationSource>('unknown');
  const [isLocating, setIsLocating] = useState(false);
  const watcher = useRef<Location.LocationSubscription | null>(null);

  const fallback = useCallback((): false => {
    setCurrent(FALLBACK_USER_LOCATION);
    setSource('fallback');
    setIsLocating(false);
    return false;
  }, []);

  const requestAndLocate = useCallback(async (): Promise<boolean> => {
    setIsLocating(true);
    try {
      const services = await Location.hasServicesEnabledAsync();
      if (!services) return fallback();

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) return fallback();

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrent(latLng(position.coords.latitude, position.coords.longitude));
      setSource('device');
      setIsLocating(false);

      // Track movement so the blue dot follows the user.
      watcher.current?.remove();
      watcher.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 15 },
        (update) => {
          setCurrent(latLng(update.coords.latitude, update.coords.longitude));
        },
      );
      return true;
    } catch {
      // Any failure at all - timeout, revoked permission mid-call, an
      // unsupported platform - degrades to the fallback rather than trapping
      // the user on an error screen.
      return fallback();
    }
  }, [fallback]);

  const refresh = useCallback(async (): Promise<void> => {
    if (source !== 'device') return;
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrent(latLng(position.coords.latitude, position.coords.longitude));
    } catch {
      // Keep the last good fix.
    }
  }, [source]);

  useEffect(() => () => watcher.current?.remove(), []);

  return {
    current,
    source,
    isLocating,
    hasRealFix: source === 'device',
    requestAndLocate,
    refresh,
    useFallback: fallback,
  };
}
