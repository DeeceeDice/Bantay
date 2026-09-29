import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

  // The name and tagline rise in under the logo; a soft ring keeps pulsing
  // outward from it - Bantay is watching - until the next screen is ready.
  const [intro] = useState(() => new Animated.Value(0));
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(intro, {
      toValue: 1,
      duration: 520,
      delay: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    let live = true;
    // No endless motion for people who have asked their phone for less.
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (live && !reduce) loop.start();
    });
    return () => {
      live = false;
      loop.stop();
    };
  }, [intro, pulse]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* Same size and place as the white circle on the phone's own splash,
          so the hand-over from it is seamless. */}
      <View style={styles.center} pointerEvents="none">
        <Animated.View
          style={[
            styles.ring,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
            },
          ]}
        />
        <View style={styles.logoCircle}>
          <BantayLogo size={118} />
        </View>
      </View>
      <Animated.View
        style={[
          styles.below,
          {
            opacity: intro,
            transform: [{ translateY: intro.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          },
        ]}
      >
        <Text style={styles.wordmark}>BANTAY</Text>
        <Text style={styles.tagline}>{s('tagline')}</Text>
        <ActivityIndicator color={Colors.white} style={styles.spinner} />
      </Animated.View>
    </View>
  );
}

const CIRCLE = 160;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.brandBlue },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: Colors.white,
  },
  // A true circle whatever the logo's proportions (the eye is twice as wide
  // as it is tall).
  logoCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Starts just under the circle, which stays exactly at the centre.
  below: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    marginTop: CIRCLE / 2 + Spacing.xxl,
    alignItems: 'center',
  },
  wordmark: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: 6,
  },
  tagline: { fontSize: 15.5, color: 'rgba(255,255,255,0.88)', marginTop: Spacing.sm },
  spinner: { marginTop: 36 },
});
