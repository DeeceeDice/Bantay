import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, EmptyState } from '../src/components/ui';
import { Colors, Spacing } from '../src/core/theme/colors';
import { Alert } from '../src/core/utils/alert';
import { severityColor } from '../src/core/utils/hazardVisuals';
import { routePath } from '../src/data/models/types';
import { statusForRoute } from '../src/data/repositories/logic';
import { useApp } from '../src/state/appStore';

/** Saved commutes with a live "Clear" / "N hazards" status badge. */
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
                <View style={styles.cardRow}>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{route.label}</Text>
                    <Text style={styles.cardSub} numberOfLines={1}>
                      {route.startLabel} → {route.endLabel}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {routePath(route).length} points
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <Badge
                      label={
                        status.hazardCount === 0
                          ? s('statusClear')
                          : String(status.hazardCount)
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

      <View style={styles.footer}>
        <Button label={s('addRoute')} icon="add" onPress={() => router.push('/routes-new')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceAlt },
  list: { padding: Spacing.lg, gap: Spacing.md },
  card: { padding: Spacing.lg },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  cardSub: { fontSize: 12.5, color: Colors.inkMuted, marginTop: 3 },
  cardMeta: { fontSize: 11.5, color: Colors.inkFaint, marginTop: 3 },
  cardActions: { alignItems: 'flex-end', gap: Spacing.sm },
  deleteButton: { padding: Spacing.xs },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    backgroundColor: Colors.surface,
  },
});
