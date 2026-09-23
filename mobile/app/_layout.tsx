import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '../src/core/theme/colors';
import { AppProvider } from '../src/state/appStore';
import { LocationProvider } from '../src/state/LocationProvider';

/**
 * Application root: dependency wiring and global chrome.
 *
 * Providers sit above the navigator so tab state - most importantly the map's
 * camera - survives navigating away and back.
 */
export default function RootLayout(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <LocationProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: Colors.surface },
              headerTintColor: Colors.ink,
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: Colors.surfaceAlt },
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />
            <Stack.Screen name="role" options={{ headerShown: false }} />
            <Stack.Screen name="location" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="report" options={{ title: 'Report a Hazard' }} />
            <Stack.Screen name="verification" options={{ title: 'Verification Panel' }} />
            <Stack.Screen name="directions" options={{ title: 'Route preview' }} />
            <Stack.Screen name="routes" options={{ title: 'Saved Routes' }} />
            <Stack.Screen name="routes-new" options={{ title: 'New route' }} />
            <Stack.Screen name="my-reports" options={{ title: 'My reports' }} />
          </Stack>
        </LocationProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
