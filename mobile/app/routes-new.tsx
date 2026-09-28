import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { BantayMap, MapMarker, MapPolyline } from '../src/components/map/BantayMap';
import { useMapController } from '../src/components/map/useMapController';
import { Button } from '../src/components/ui';
import { Field } from '../src/components/ui/AuthScaffold';
import { PlacementPin } from '../src/components/ui/Pins';
import { LatLng } from '../src/core/geo/latLng';
import { Colors, Spacing } from '../src/core/theme/colors';
import { describePoint } from '../src/data/seed/gazetteer';
import { useApp } from '../src/state/appStore';
import { useUserLocation } from '../src/state/LocationProvider';

/**
 * Creates a saved route by tapping a start and an end point on the map.
 *
 * Save stays disabled until both ends are placed and the route has a name, so
 * a half-finished route can never end up in the list.
 */
export default function NewRouteScreen(): React.ReactElement {
  const { s, addRoute } = useApp();
  const location = useUserLocation();
  const controller = useMapController({ center: location.current, zoom: 15 });

  const [start, setStart] = useState<LatLng | null>(null);
  const [end, setEnd] = useState<LatLng | null>(null);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);

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

  const polylines: MapPolyline[] =
    start && end
      ? [
          {
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
          {!start ? `${s('setStart')}. ${s('tapMapToSet')}` : !end ? `${s('setEnd')}. ${s('tapMapToSet')}` : s('saveRoute')}
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
          disabled={!canSave}
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
