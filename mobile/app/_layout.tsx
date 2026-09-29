import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBar } from '../src/components/ui';
import { Colors, Spacing } from '../src/core/theme/colors';
import { isSupabaseConfigured } from '../src/data/repositories/supabaseClient';
import { AppProvider, useApp } from '../src/state/appStore';
import { LocationProvider } from '../src/state/LocationProvider';

// Keep the phone's own splash up until the first screen has drawn, then fade
// it out, so there is never a blank frame between the two. The loading screen
// underneath draws the same white circle in the same place on the same blue.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 300, fade: true });

const hideSplash = (): void => SplashScreen.hide();

/**
 * Application root: dependency wiring and global chrome.
 *
 * Providers sit above the navigator so tab state - most importantly the map's
 * camera - survives navigating away and back.
 */
export default function RootLayout(): React.ReactElement {
  // A build with no database is a broken build, not an offline mode. Say so
  // instead of letting someone "sign up" into nowhere.
  if (!isSupabaseConfigured()) {
    return (
      <View style={styles.root} onLayout={hideSplash}>
        <NotConnected />
      </View>
    );
  }

  return (
    <View style={styles.root} onLayout={hideSplash}>
      <SafeAreaProvider>
        <AppProvider>
          <LocationProvider>
            <StatusBar style="dark" />
            <RootStack />
          </LocationProvider>
        </AppProvider>
      </SafeAreaProvider>
    </View>
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
  const { user, s } = useApp();

  return (
    <Stack
      screenOptions={{
        header: ({ navigation, options, back }) => (
          <StackHeader
            title={typeof options.title === 'string' ? options.title : ''}
            onBack={back ? navigation.goBack : undefined}
          />
        ),
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
        <Stack.Screen name="report" options={{ headerShown: false }} />
        <Stack.Screen name="verification" options={{ headerShown: false }} />
        <Stack.Screen name="directions" options={{ title: s('routePreview') }} />
        <Stack.Screen name="routes" options={{ title: s('savedRoutes') }} />
        <Stack.Screen name="routes-new" options={{ title: s('newRoute') }} />
        <Stack.Screen name="my-reports" options={{ title: s('myReports') }} />
        <Stack.Screen name="notifications" options={{ title: s('notificationPreferences') }} />
        <Stack.Screen name="help" options={{ title: s('helpAndSupport') }} />
      </Stack.Protected>
    </Stack>
  );
}

/** The white title bar every pushed screen shares, drawn under the status bar. */
function StackHeader({ title, onBack }: { title: string; onBack?: () => void }): React.ReactElement {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top, backgroundColor: Colors.surface }}>
      <AppBar title={title} leading={onBack ? 'back' : undefined} onLeading={onBack} />
    </View>
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
  root: { flex: 1, backgroundColor: Colors.brandBlue },
  notConnected: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xxl,
    backgroundColor: Colors.surface,
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.ink },
  body: { fontSize: 15, color: Colors.inkMuted, marginTop: Spacing.md, lineHeight: 22 },
});
