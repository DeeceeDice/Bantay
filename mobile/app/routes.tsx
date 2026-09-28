import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BantayMap } from '../src/components/map/BantayMap';
import { useMapController } from '../src/components/map/useMapController';
import { Badge, Card, EmptyState } from '../src/components/ui';
import { Colors, Radius, Shadow, Spacing } from '../src/core/theme/colors';
import { severityColor } from '../src/core/utils/hazardVisuals';
import { SavedRoute, routePath } from '../src/data/models/types';
import { statusForRoute } from '../src/data/repositories/logic';
import { useApp } from '../src/state/appStore';

/** Saved commutes, each with a map preview and a live "Clear" / "N hazards" badge. */
export default function RoutesScreen(): React.ReactElement {
  const { s, data, deleteRoute, restoreRoute } = useApp();
  const [busyId, setBusyId] = useState<string | null>(null);

  const confirmDelete = (routeId: string): void => {
    const route = data.routes.find((r) => r.id === routeId);
    if (!route) return;

    Alert.alert(s('deleteLabel'), route.label, [
      { text: s('cancel'), style: 'cancel' },
      {
        text: s('deleteLabel'),
        style: 'destructive',
        onPress: () => {
          setBusyId(routeId);
          void deleteRoute(routeId).then(() => {
            setBusyId(null);
            // Undo restores the row rather than re-creating it, so the route
            // keeps its id and any alerts that already reference it.
            Alert.alert(s('routeDeleted'), undefined, [
              { text: s('undo'), onPress: () => void restoreRoute(route) },
              { text: s('done'), style: 'cancel' },
            ]);
          });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {data.routes.length === 0 ? (
        <EmptyState icon="alt-route" message={s('noSavedRoutes')} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {data.routes.map((route) => {
            const status = statusForRoute(data.reports, route);
            const color = status.hazardCount === 0
              ? Colors.safe
              : severityColor(status.worstSeverity ?? 'not_passable');

            return (
              <Card
                key={route.id}
                borderColor={status.hazardCount === 0 ? Colors.line : `${color}66`}
                padded={false}
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: '/directions',
                    params: {
                      lat: String(route.end.lat),
                      lng: String(route.end.lng),
                      label: route.endLabel,
                    },
                  })
                }
              >
                <RoutePreview route={route} color={color} />
                <View style={styles.cardRow}>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{route.label}</Text>
                    <Text style={styles.cardSub} numberOfLines={1}>
                      {route.startLabel}  →  {route.endLabel}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <Badge
                      label={
                        status.hazardCount === 0
                          ? s('statusClear')
                          : `${status.hazardCount} ${
                              status.hazardCount === 1 ? s('hazardOne') : s('hazardMany')
                            }`
                      }
                      color={color}
                      icon={status.hazardCount === 0 ? 'check-circle' : 'warning'}
                      filled={status.hazardCount > 0}
                    />
                    <Pressable
                      onPress={() => confirmDelete(route.id)}
                      hitSlop={10}
                      disabled={busyId === route.id}
                      style={styles.deleteButton}
                      accessibilityLabel={s('deleteLabel')}
                    >
                      <MaterialIcons name="delete-outline" size={22} color={Colors.brandRed} />
                    </Pressable>
                  </View>
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}

      <Pressable
        onPress={() => router.push('/routes-new')}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        accessibilityRole="button"
      >
        <MaterialIcons name="add" size={24} color={Colors.white} />
        <Text style={styles.fabLabel}>{s('addRoute')}</Text>
      </Pressable>
    </View>
  );
}

/** A still map of the route, drawn in its status colour. */
function RoutePreview({ route, color }: { route: SavedRoute; color: string }): React.ReactElement {
  const controller = useMapController({ center: route.start, zoom: 15 });
  // Once: the fit waits for the map's first layout, and the preview never
  // moves after that.
  useEffect(() => {
    controller.fitPoints(routePath(route), { top: 28, right: 28, bottom: 28, left: 28 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.preview} pointerEvents="none">
      <BantayMap
        controller={controller}
        interactive={false}
        showAttribution={false}
        dimTiles
        polylines={[{ points: routePath(route), color, borderColor: Colors.white, width: 5 }]}
        markers={[
          {
            id: 'start',
            point: route.start,
            width: 14,
            height: 14,
            anchor: 'centre',
            render: () => <View style={[styles.endpoint, { backgroundColor: Colors.brandBlue }]} />,
          },
          {
            id: 'end',
            point: route.end,
            width: 14,
            height: 14,
            anchor: 'centre',
            render: () => <View style={[styles.endpoint, { backgroundColor: Colors.brandRed }]} />,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceAlt },
  list: { padding: Spacing.lg, paddingBottom: 96, gap: Spacing.md },
  card: { overflow: 'hidden' },
  preview: { height: 108 },
  endpoint: { flex: 1, borderRadius: 7, borderWidth: 2.5, borderColor: Colors.white },
  cardRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  cardBody: { flex: 1, marginRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  cardSub: { fontSize: 12.5, lineHeight: 17.5, color: Colors.inkFaint, marginTop: 3 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  deleteButton: { padding: Spacing.xs },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    height: 56,
    borderRadius: Radius.md,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brandRed,
    ...Shadow.floating,
  },
  fabPressed: { opacity: 0.9 },
  fabLabel: { color: Colors.white, fontSize: 15.5, fontWeight: '700', marginLeft: Spacing.md },
});
