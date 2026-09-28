import { Stack, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { BantayMap, MapMarker, MapPolyline } from '../src/components/map/BantayMap';
import { useMapController } from '../src/components/map/useMapController';
import { Button } from '../src/components/ui';
import { HazardPin, PlacementPin, UserLocationDot } from '../src/components/ui/Pins';
import { Geo, LatLng, latLng } from '../src/core/geo/latLng';
import { Colors, Radius, Shadow, Spacing } from '../src/core/theme/colors';
import { hazardLabelKey } from '../src/core/utils/hazardVisuals';
import { formatClock, formatDuration } from '../src/core/utils/timeAgo';
import {
  RouteOption,
  TravelMode,
  computeRoutes,
  googleMapsDirectionsUrl,
  isGoogleMapsConfigured,
  pickSafestRoute,
} from '../src/data/google/googleMaps';
import { FreeTierExhausted } from '../src/data/google/freeTier';
import { verifiedHazards } from '../src/data/repositories/logic';
import { useApp } from '../src/state/appStore';
import { useUserLocation } from '../src/state/LocationProvider';

type Result =
  | { key: string; ok: true; chosen: RouteOption; alternatives: number; avoided: number; arriveAt: number }
  | { key: string; ok: false; message: string };

/**
 * Route preview on real streets.
 *
 * The route comes from Google's Routes API. Bantay asks for every alternative
 * and shows the one that passes the fewest verified hazards; when all of them
 * pass one, the hazards are listed rather than hidden. Turn-by-turn guidance
 * is handed to the Google Maps app, which does it properly.
 */
export default function DirectionsScreen(): React.ReactElement {
  const { s, data, settings } = useApp();
  const location = useUserLocation();
  const params = useLocalSearchParams<{ lat?: string; lng?: string; label?: string }>();

  const destination = useMemo<LatLng>(
    () => latLng(Number(params.lat ?? 0), Number(params.lng ?? 0)),
    [params.lat, params.lng],
  );
  // Captured once so the route does not re-plan as the user moves.
  const [origin] = useState<LatLng>(() => location.current);
  const controller = useMapController({ center: origin, zoom: 15 });
  const [mode, setMode] = useState<TravelMode>('DRIVE');
  const [result, setResult] = useState<Result | null>(null);

  const hazards = useMemo(() => verifiedHazards(data.reports), [data.reports]);
  const requestKey = `${mode}:${destination.lat},${destination.lng}`;
  const loading = isGoogleMapsConfigured() && result?.key !== requestKey;

  useEffect(() => {
    if (!isGoogleMapsConfigured()) return;
    const abort = new AbortController();
    computeRoutes(origin, destination, mode, hazards, abort.signal).then(
      (options) => {
        const chosen = pickSafestRoute(options);
        const worst = Math.max(...options.map((o) => o.hazards.length));
        setResult({
          key: requestKey,
          ok: true,
          chosen,
          alternatives: options.length,
          avoided: Math.max(0, worst - chosen.hazards.length),
          arriveAt: Date.now() + chosen.durationSeconds * 1000,
        });
        controller.fitPoints(chosen.path, { top: 130, right: 56, bottom: 300, left: 56 });
      },
      (error: unknown) => {
        if (abort.signal.aborted) return;
        setResult({
          key: requestKey,
          ok: false,
          message:
            error instanceof FreeTierExhausted
              ? s('freeTierUsedUp')
              : error instanceof Error
                ? error.message
                : String(error),
        });
      },
    );
    return () => abort.abort();
    // `controller` is a fresh object each render; depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, origin, destination, mode, hazards]);

  const route = result?.ok && result.key === requestKey ? result : null;

  const markers: MapMarker[] = [
    {
      id: 'origin',
      point: origin,
      width: 22,
      height: 22,
      anchor: 'centre',
      render: () => <UserLocationDot />,
    },
    {
      id: 'destination',
      point: destination,
      width: 46,
      height: 55,
      render: () => <PlacementPin size={46} />,
    },
    ...(route?.chosen.hazards ?? []).map((hazard) => ({
      id: `hz-${hazard.id}`,
      point: hazard.location,
      width: 38,
      height: 46,
      render: () => <HazardPin type={hazard.type} status={hazard.status} size={38} />,
    })),
  ];

  const polylines: MapPolyline[] = route
    ? [{ points: route.chosen.path, color: Colors.brandBlue, borderColor: Colors.white, width: 7 }]
    : [];

  const openInGoogleMaps = (): void => {
    void Linking.openURL(googleMapsDirectionsUrl(origin, destination, mode)).catch(() => {
      Alert.alert(s('somethingWentWrong'), s('routeOpenFailed'));
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: s('routePreview') }} />
      <BantayMap controller={controller} markers={markers} polylines={polylines} />

      <View style={styles.panel}>
        <Text style={styles.destination} numberOfLines={2}>
          {params.label ?? s('routePreview')}
        </Text>

        <View style={styles.segment}>
          {(['DRIVE', 'WALK'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              accessibilityRole="radio"
              accessibilityState={{ selected: mode === m }}
              style={[styles.segmentItem, mode === m && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>
                {m === 'DRIVE' ? s('modeDrive') : s('modeWalk')}
              </Text>
            </Pressable>
          ))}
        </View>

        {!isGoogleMapsConfigured() ? (
          <Text style={styles.note}>{s('routeNoKey')}</Text>
        ) : loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Colors.brandBlue} />
            <Text style={styles.note}>{s('routeLoading')}</Text>
          </View>
        ) : result && !result.ok ? (
          <Text style={styles.note}>
            {s('routeUnavailable')} {result.message}
          </Text>
        ) : route ? (
          <>
            <View style={styles.stats}>
              <Stat
                label={s('arriveIn')}
                value={formatDuration(route.chosen.durationSeconds, settings.language)}
              />
              <Stat label={s('eta')} value={formatClock(new Date(route.arriveAt), settings.language)} />
              <Stat label={s('distance')} value={Geo.formatDistance(route.chosen.distanceMeters)} />
            </View>

            {route.chosen.hazards.length === 0 ? (
              <Text style={styles.clear}>
                {route.avoided > 0
                  ? s('routeAvoided').replace('{n}', String(route.avoided))
                  : s('routeClear')}
              </Text>
            ) : (
              <View style={styles.warning}>
                <Text style={styles.warningText}>
                  {s('routeHazards').replace('{n}', String(route.chosen.hazards.length))}{' '}
                  {route.chosen.hazards.map((h) => s(hazardLabelKey(h.type))).join(', ')}
                </Text>
              </View>
            )}
          </>
        ) : null}

        <Button
          label={s('openInGoogleMaps')}
          icon="navigation"
          style={styles.navButton}
          onPress={openInGoogleMaps}
        />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceAlt },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxl,
    ...Shadow.floating,
  },
  destination: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  segment: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  segmentItem: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center' },
  segmentActive: { backgroundColor: Colors.brandBlueLight },
  segmentText: { fontSize: 13.5, fontWeight: '600', color: Colors.inkMuted },
  segmentTextActive: { color: Colors.brandBlueDark, fontWeight: '700' },
  loading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.lg },
  note: { fontSize: 13, color: Colors.inkMuted, marginTop: Spacing.lg, lineHeight: 19 },
  stats: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  stat: { flex: 1 },
  statLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.7, color: Colors.inkFaint },
  statValue: { fontSize: 17, fontWeight: '800', color: Colors.ink, marginTop: 3 },
  clear: { fontSize: 13, fontWeight: '600', color: Colors.safeDark, marginTop: Spacing.lg },
  warning: {
    backgroundColor: Colors.warningLight,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: `${Colors.warning}59`,
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  warningText: { fontSize: 13, fontWeight: '600', color: Colors.warningDark },
  navButton: { marginTop: Spacing.lg },
});
