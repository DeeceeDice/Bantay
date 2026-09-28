import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BantayLogo } from '../src/components/ui/Pins';
import { Colors, Spacing } from '../src/core/theme/colors';
import { StoreKeys } from '../src/data/repositories/storeKeys';
import { useApp } from '../src/state/appStore';
import { useUserLocation } from '../src/state/LocationProvider';

/**
 * First screen on every launch.
 *
 * Routes on what the app already knows: a brand-new install goes to
 * onboarding, a returning but logged-out user to login, and a logged-in user
 * straight to the map.
 */
export default function SplashScreen(): React.ReactElement {
  const { ready, user, settings, s } = useApp();
  const location = useUserLocation();

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    (async () => {
      const onboarded = await AsyncStorage.getItem(StoreKeys.onboardingSeen);
      if (cancelled) return;

      if (onboarded !== 'true') {
        router.replace('/onboarding');
        return;
      }
      if (!user) {
        router.replace('/login');
        return;
      }
      // A returning user should land on a map already centred on them, so
      // take the fix now rather than after the map paints.
      if (settings.locationGranted) await location.requestAndLocate();
      else location.useFallback();
      if (!cancelled) router.replace('/(tabs)');
    })();

    return () => {
      cancelled = true;
    };
    // `location` is a fresh object each render; depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, settings.locationGranted]);

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <BantayLogo size={92} />
      </View>
      <Text style={styles.wordmark}>Bantay</Text>
      <Text style={styles.tagline}>{s('tagline')}</Text>
      <ActivityIndicator color={Colors.white} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    backgroundColor: Colors.white,
    borderRadius: 999,
    padding: 26,
  },
  wordmark: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.white,
    marginTop: Spacing.xxl,
    letterSpacing: -1,
  },
  tagline: { fontSize: 15.5, color: 'rgba(255,255,255,0.88)', marginTop: Spacing.sm },
  spinner: { marginTop: 44 },
});
