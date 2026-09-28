import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { BantayMap, MapMarker, MapPolyline } from '../src/components/map/BantayMap';
import { useMapController } from '../src/components/map/useMapController';
import { Button } from '../src/components/ui';
import { Field } from '../src/components/ui/AuthScaffold';
import { PlacementPin } from '../src/components/ui/Pins';
import { Geo, LatLng } from '../src/core/geo/latLng';
import { Colors, Spacing } from '../src/core/theme/colors';
import {
  computeRoutes,
  isGoogleMapsConfigured,
  pickSafestRoute,
  simplifyPath,
} from '../src/data/google/googleMaps';
import { verifiedHazards } from '../src/data/repositories/logic';
import { describePoint } from '../src/data/seed/gazetteer';
import { useApp } from '../src/state/appStore';
import { useUserLocation } from '../src/state/LocationProvider';

/**
 * Creates a saved route by tapping a start and an end point on the map.
 *
 * Save stays disabled until both ends are placed and the route has a name, so
 * a half-finished route can never end up in the list. With a Google Maps key
 * the route is snapped to real streets (the alternative passing the fewest
 * verified hazards), so its hazard badge measures the road actually taken.
 */
export default function NewRouteScreen(): React.ReactElement {
  const { s, data, addRoute } = useApp();
  const location = useUserLocation();
  const controller = useMapController({ center: location.current, zoom: 15 });

  const [start, setStart] = useState<LatLng | null>(null);
  const [end, setEnd] = useState<LatLng | null>(null);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [street, setStreet] = useState<{ key: string; path: LatLng[] | null } | null>(null);

  const hazards = useMemo(() => verifiedHazards(data.reports), [data.reports]);
  const routeKey = start && end ? `${start.lat},${start.lng}:${end.lat},${end.lng}` : null;
  const streetPath = street && street.key === routeKey ? street.path : null;
  const routing = isGoogleMapsConfigured() && routeKey !== null && street?.key !== routeKey;

  useEffect(() => {
    if (!start || !end || !routeKey || !isGoogleMapsConfigured()) return;
    const abort = new AbortController();
    computeRoutes(start, end, 'DRIVE', hazards, abort.signal).then(
      (options) => {
        const best = pickSafestRoute(options);
        setStreet({ key: routeKey, path: simplifyPath(best.path) });
        controller.fitPoints([start, end, ...best.path], {
          top: 60,
          right: 50,
          bottom: 60,
          left: 50,
        });
      },
      // No route: save with the straight-line approximation instead.
      () => {
        if (!abort.signal.aborted) setStreet({ key: routeKey, path: null });
      },
    );
    return () => abort.abort();
    // `controller` is a fresh object each render; depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, hazards]);

  const canSave = !!start && !!end && label.trim().length > 0;

  const handleTap = (point: LatLng): void => {
    if (!start) setStart(point);
    else setEnd(point);
  };

  const save = async (): Promise<void> => {
    if (!canSave || !start || !end) return;
    setBusy(true);
    await addRoute({
      label: label.trim(),
      start,
      startLabel: describePoint(start),
      end,
      endLabel: describePoint(end),
      path: streetPath ?? undefined,
    });
    setBusy(false);
    Alert.alert(s('routeSavedToast'));
    router.back();
  };

  const markers: MapMarker[] = [];
  if (start) {
    markers.push({
      id: 'start',
      point: start,
      width: 42,
      height: 50,
      render: () => <PlacementPin color={Colors.brandBlue} size={42} />,
    });
  }
  if (end) {
    markers.push({
      id: 'end',
      point: end,
      width: 42,
      height: 50,
      render: () => <PlacementPin color={Colors.brandRed} size={42} />,
    });
  }

  // Solid on real streets; dashed while routing or when only the straight
  // line is known.
  const polylines: MapPolyline[] =
    start && end
      ? [
          streetPath
            ? { points: streetPath, color: Colors.brandBlue, borderColor: Colors.white, width: 6 }
            : {
                points: [start, end],
                color: Colors.brandBlue,
                borderColor: Colors.white,
                width: 6,
                dashed: true,
              },
        ]
      : [];

  return (
    <View style={styles.container}>
      <View style={styles.hint}>
        <MaterialCommunityIcons name="gesture-tap" size={18} color={Colors.brandBlueDark} />
        <Text style={styles.hintText}>
          {!start
            ? `${s('setStart')}. ${s('tapMapToSet')}`
            : !end
              ? `${s('setEnd')}. ${s('tapMapToSet')}`
              : routing
                ? s('routeLoading')
                : streetPath
                  ? `${s('routeOnStreets')} · ${Geo.formatDistance(Geo.pathLengthMeters(streetPath))}`
                  : s('saveRoute')}
        </Text>
      </View>

      <View style={styles.mapWrap}>
        <BantayMap
          controller={controller}
          markers={markers}
          polylines={polylines}
          onPress={handleTap}
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.endpoints}>
          <Endpoint label={s('startPoint')} value={start ? describePoint(start) : '--'} color={Colors.brandBlue} />
          <Endpoint label={s('endPoint')} value={end ? describePoint(end) : '--'} color={Colors.brandRed} />
        </View>
        <Field
          label={s('routeName')}
          value={label}
          onChangeText={setLabel}
          placeholder={s('routeNameHint')}
          icon="label"
        />
        <Button
          label={s('saveRoute')}
          icon="check"
          disabled={!canSave || routing}
          loading={busy}
          onPress={save}
        />
      </View>
    </View>
  );
}

function Endpoint({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}): React.ReactElement {
  return (
    <View style={styles.endpoint}>
      <View style={styles.endpointHeader}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={styles.endpointLabel}>{label.toUpperCase()}</Text>
      </View>
      <Text style={styles.endpointValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brandBlueLight,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.brandBlueDark,
    marginLeft: 10,
  },
  mapWrap: { flex: 1 },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    backgroundColor: Colors.surface,
  },
  endpoints: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  endpoint: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 10,
    padding: Spacing.md,
  },
  endpointHeader: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, marginRight: 6 },
  endpointLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, color: Colors.inkFaint },
  endpointValue: { fontSize: 12.5, fontWeight: '600', color: Colors.ink, marginTop: 3 },
});
