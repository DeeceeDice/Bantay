import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../src/components/ui';
import { Colors, Spacing } from '../src/core/theme/colors';
import { useApp } from '../src/state/appStore';
import { useUserLocation } from '../src/state/LocationProvider';

/**
 * Location permission request.
 *
 * "Not now" is a first-class path, not a dark pattern: it takes the user into
 * the app immediately with the map centred on Manila, because a commuter in a
 * storm should never be locked out of hazard data over a permission prompt.
 */
export default function LocationScreen(): React.ReactElement {
  const { s, updateSettings } = useApp();
  const location = useUserLocation();
  const [busy, setBusy] = useState(false);

  const allow = async (): Promise<void> => {
    setBusy(true);
    const granted = await location.requestAndLocate();
    await updateSettings({ locationGranted: granted });
    setBusy(false);
    if (!granted) Alert.alert(s('locationTitle'), s('locationDeniedNotice'));
    router.replace('/(tabs)');
  };

  const notNow = async (): Promise<void> => {
    location.useFallback();
    await updateSettings({ locationGranted: false });
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="my-location" size={66} color={Colors.brandBlue} />
        </View>
        <Text style={styles.title}>{s('locationTitle')}</Text>
        <Text style={styles.text}>{s('locationBody')}</Text>
        <Button
          label={s('allowLocation')}
          icon="location-on"
          onPress={allow}
          loading={busy}
          style={styles.allow}
        />
        <Pressable onPress={notNow} disabled={busy} style={styles.notNow}>
          <Text style={styles.notNowText}>{s('notNow')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  body: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingTop: 24,
    paddingBottom: Spacing.xxl,
  },
  iconCircle: {
    alignSelf: 'center',
    width: 152,
    height: 152,
    borderRadius: 76,
    backgroundColor: Colors.brandBlueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.ink,
    textAlign: 'center',
    marginTop: 40,
  },
  text: {
    fontSize: 16,
    lineHeight: 23,
    color: Colors.inkMuted,
    textAlign: 'center',
    marginTop: 14,
  },
  allow: { marginTop: 40 },
  notNow: { alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 10 },
  notNowText: { fontSize: 15.5, fontWeight: '700', color: Colors.brandBlue },
});
