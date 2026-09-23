import React, { createContext, useContext } from 'react';

import { LocationState, useLocation } from './useLocation';

const LocationContext = createContext<LocationState | null>(null);

/**
 * Shares one location subscription across the whole app. Without this each
 * screen would start its own GPS watcher, which drains battery fast on the
 * cheap phones this app targets.
 */
export function LocationProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const value = useLocation();
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useUserLocation(): LocationState {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useUserLocation must be used inside LocationProvider');
  return ctx;
}
