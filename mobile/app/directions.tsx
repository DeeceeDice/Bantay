import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import { BantayMap, MapMarker, MapPolyline } from '../src/components/map/BantayMap';
import { useMapController } from '../src/components/map/useMapController';
import { Button } from '../src/components/ui';
import { HazardPin, PlacementPin, UserLocationDot } from '../src/components/ui/Pins';
import { Geo, LatLng, latLng } from '../src/core/geo/latLng';
import { Colors, Radius, Shadow, Spacing } from '../src/core/theme/colors';
import { hazardLabelKey } from '../src/core/utils/hazardVisuals';
import { formatClock, formatDuration } from '../src/core/utils/timeAgo';
import { severityRank } from '../src/data/models/enums';
import { HazardReport } from '../src/data/models/types';
import { ROUTE_HAZARD_THRESHOLD_METERS, verifiedHazards } from '../src/data/repositories/logic';
import { useApp } from '../src/state/appStore';
import { useUserLocation } from '../src/state/LocationProvider';

const TICK_MS = 400;

/**
 * Route preview and simulated turn-by-turn navigation.
 *
 * The route is generated locally by bending a straight line away from any
 * verified hazard that sits on it, which demonstrates avoidance end to end
 * without a routing provider. Swapping in a real directions API means
 * replacing `buildRoute`; the ETA, progress and hazard warnings already work
 * off whatever polyline comes back.
 */
export default function DirectionsScreen(): React.ReactElement {
  const { s, data, settings } = useApp();
  const location = useUserLocation();
  const params = useLocalSearchParams<{ lat?: string; lng?: string; label?: string }>();

  const destination = useMemo<LatLng>(
    () => latLng(Number(params.lat ?? 0), Number(params.lng ?? 0)),
    [params.lat, params.lng],
  );
  // Captured once at mount so the route does not re-plan as the user moves.
  const [origin] = useState<LatLng>(() => location.current);
  const controller = useMapController({ center: origin, zoom: 15 });

  const [navigating, setNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const route = useMemo(
    () => buildRoute(origin, destination, verifiedHazards(data.reports)),
    [origin, destination, data.reports],
  );

  const hazardsOnRoute = useMemo(
    () =>
      verifiedHazards(data.reports).filter(
        (h) => Geo.distanceToPathMeters(h.location, route) <= ROUTE_HAZARD_THRESHOLD_METERS,
      ),
    [data.reports, route],
  );

  useEffect(() => {
    controller.fitPoints(route, { top: 130, right: 56, bottom: 260, left: 56 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!navigating) return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
      setProgress((p) => {
        const next = Math.min(1, p + 0.01);
        controller.moveTo(Geo.interpolateAlongPath(route, next), 17);
        if (next >= 1) setNavigating(false);
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigating, route]);

  const distance = Geo.pathLengthMeters(route);
  const remaining = Geo.drivingTimeSeconds(distance) * (1 - progress);
  const arrival = new Date(nowMs + remaining * 1000);
  const position = navigating ? Geo.interpolateAlongPath(route, progress) : origin;

  const markers: MapMarker[] = [
    {
      id: 'origin',
      point: position,
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
    ...hazardsOnRoute.map((hazard) => ({
      id: `hz-${hazard.id}`,
      point: hazard.location,
      width: 38,
      height: 46,
      render: () => <HazardPin type={hazard.type} status={hazard.status} size={38} />,
    })),
  ];

  const polylines: MapPolyline[] = [
    { points: route, color: Colors.brandBlue, borderColor: Colors.white, width: 7 },
  ];

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: navigating ? s('navigatingTo') : s('routePreview') }} />
      <BantayMap controller={controller} markers={markers} polylines={polylines} />

      <View style={styles.panel}>
        {navigating && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        )}
        <Text style={styles.destination} numberOfLines={2}>
          {params.label ?? s('routePreview')}
        </Text>

        <View style={styles.stats}>
          <Stat label={s('arriveIn')} value={formatDuration(remaining, settings.language)} />
          <Stat label={s('eta')} value={formatClock(arrival, settings.language)} />
          <Stat label={s('distance')} value={Geo.formatDistance(distance)} />
        </View>

        {hazardsOnRoute.length === 0 ? (
          <Text style={styles.clear}>{s('avoidingHazards')}</Text>
        ) : (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              {hazardsOnRoute.length} · {s(hazardLabelKey(hazardsOnRoute[0].type))}
            </Text>
          </View>
        )}

        <Button
          label={navigating ? s('endNavigation') : s('startNavigation')}
          icon={navigating ? 'stop' : 'navigation'}
          color={navigating ? Colors.inkMuted : undefined}
          style={styles.navButton}
          onPress={() => {
            if (navigating) {
              setNavigating(false);
              setProgress(0);
            } else {
              setProgress(0);
              setNavigating(true);
            }
          }}
        />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Builds a polyline from the user to the destination, detouring around
 * hazards that would otherwise sit on the direct line.
 */
function buildRoute(
  origin: LatLng,
  destination: LatLng,
  hazards: readonly HazardReport[],
): LatLng[] {
  const direct = [origin, destination];
  const blocking = hazards.filter(
    (h) => Geo.distanceToPathMeters(h.location, direct) <= 90,
  );

  if (blocking.length === 0) {
    return [origin, Geo.interpolateAlongPath(direct, 0.5), destination];
  }

  // Offset the midpoint perpendicular to the direct line, away from the worst
  // hazard, which produces a believable detour around the block.
  const midpoint = Geo.interpolateAlongPath(direct, 0.5);
  const worst = blocking.reduce((a, b) =>
    severityRank[a.severity] >= severityRank[b.severity] ? a : b,
  );

  const away = (Geo.bearingDegrees(midpoint, worst.location) + 180) % 360;
  const radians = (away * Math.PI) / 180;
  const DETOUR_METERS = 260;

  // Bearing is clockwise from north, so east is sin and north is cos.
  const detour = Geo.offsetMeters(
    midpoint,
    DETOUR_METERS * Math.sin(radians),
    DETOUR_METERS * Math.cos(radians),
  );

  return [
    origin,
    Geo.interpolateAlongPath([origin, detour], 0.6),
    detour,
    Geo.interpolateAlongPath([detour, destination], 0.4),
    destination,
  ];
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
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.brandBlueLight,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  progressFill: { height: 6, backgroundColor: Colors.brandBlue },
  destination: { fontSize: 16, fontWeight: '700', color: Colors.ink },
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
