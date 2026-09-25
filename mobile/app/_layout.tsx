import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors, Spacing } from '../src/core/theme/colors';
import { isSupabaseConfigured } from '../src/data/repositories/supabaseClient';
import { AppProvider, useApp } from '../src/state/appStore';
import { LocationProvider } from '../src/state/LocationProvider';

/**
 * Application root: dependency wiring and global chrome.
 *
 * Providers sit above the navigator so tab state - most importantly the map's
 * camera - survives navigating away and back.
 */
export default function RootLayout(): React.ReactElement {
  // A build with no database is a broken build, not an offline mode. Say so
  // instead of letting someone "sign up" into nowhere.
  if (!isSupabaseConfigured()) return <NotConnected />;

  return (
    <SafeAreaProvider>
      <AppProvider>
        <LocationProvider>
          <StatusBar style="dark" />
          <RootStack />
        </LocationProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}

/**
 * The route guard.
 *
 * Everything past log-in sits behind `Stack.Protected`, which only opens when
 * there is a user - and the only way to get one is a session Supabase issued
 * for an account in its database. While the guard is closed those screens do
 * not exist: a deep link, a stale navigation or a session that ends mid-use
 * all land back on the splash screen, which routes to log-in.
 */
function RootStack(): React.ReactElement {
  const { user } = useApp();

  return (
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

      <Stack.Protected guard={user !== null}>
        <Stack.Screen name="role" options={{ headerShown: false }} />
        <Stack.Screen name="location" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="report" options={{ title: 'Report a Hazard' }} />
        <Stack.Screen name="verification" options={{ title: 'Verification Panel' }} />
        <Stack.Screen name="directions" options={{ title: 'Route preview' }} />
        <Stack.Screen name="routes" options={{ title: 'Saved Routes' }} />
        <Stack.Screen name="routes-new" options={{ title: 'New route' }} />
        <Stack.Screen name="my-reports" options={{ title: 'My reports' }} />
      </Stack.Protected>
    </Stack>
  );
}

function NotConnected(): React.ReactElement {
  return (
    <View style={styles.notConnected}>
      <Text style={styles.title}>Bantay is not connected to a database</Text>
      <Text style={styles.body}>
        This build has no Supabase project configured, so accounts cannot be created or signed
        in to. Set expo.extra.supabase in app.json, or EXPO_PUBLIC_SUPABASE_URL and
        EXPO_PUBLIC_SUPABASE_ANON_KEY in .env, then rebuild with --clear.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notConnected: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xxl,
    backgroundColor: Colors.surface,
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.ink },
  body: { fontSize: 15, color: Colors.inkMuted, marginTop: Spacing.md, lineHeight: 22 },
});
