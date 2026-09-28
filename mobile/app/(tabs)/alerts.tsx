import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBar, Badge, Card, EmptyState, SegmentedButton } from '../../src/components/ui';
import { Colors, Spacing } from '../../src/core/theme/colors';
import { alertColor, alertIcon } from '../../src/core/utils/hazardVisuals';
import { timeAgoCompact } from '../../src/core/utils/timeAgo';
import { AlertItem } from '../../src/data/models/types';
import { sortedAlerts } from '../../src/data/repositories/logic';
import { useApp } from '../../src/state/appStore';

/**
 * Chronological feed of everything Bantay has told the user.
 *
 * The saved-routes filter is the one that matters day to day: during a storm
 * the "everywhere" feed fills up fast, and most people only need to know
 * about the roads they actually travel.
 */
export default function AlertsScreen(): React.ReactElement {
  const { s, data, markAlertRead, markAllAlertsRead } = useApp();
  const [routesOnly, setRoutesOnly] = useState(false);

  const all = sortedAlerts(data.alerts);
  const visible = routesOnly ? all.filter((a) => a.onSavedRoute) : all;
  const hasUnread = all.some((a) => !a.isRead);

  const open = (alert: AlertItem): void => {
    void markAlertRead(alert.id);
    if (alert.reportId) {
      router.push({ pathname: '/(tabs)', params: { focusReport: alert.reportId } });
    } else if (alert.safeSpotId) {
      router.push({ pathname: '/(tabs)', params: { focusSpot: alert.safeSpotId } });
    } else if (alert.kind === 'account') {
      // Access decisions and suspensions: the profile shows where you stand.
      router.push('/(tabs)/profile');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar
        title={s('alerts')}
        actionLabel={hasUnread ? s('markAllRead') : undefined}
        onAction={() => void markAllAlertsRead()}
      />
      <View style={styles.body}>
        <View style={styles.segmentWrap}>
          <SegmentedButton
            segments={[
              { value: false, label: s('everywhereNearby') },
              { value: true, label: s('mySavedRoutes') },
            ]}
            value={routesOnly}
            onChange={setRoutesOnly}
          />
        </View>

        {visible.length === 0 ? (
          <EmptyState
            icon="notifications-none"
            title={s('allCaughtUp')}
            message={routesOnly ? s('noRouteAlerts') : s('noAlerts')}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {visible.map((alert) => {
              const accent = alertColor(alert.kind);
              return (
                <Card
                  key={alert.id}
                  onPress={() => open(alert)}
                  borderColor={alert.isRead ? Colors.line : `${accent}73`}
                  style={styles.card}
                >
                  <View style={styles.cardRow}>
                    <View style={[styles.cardIcon, { backgroundColor: `${accent}1F` }]}>
                      <MaterialIcons name={alertIcon(alert.kind)} size={20} color={accent} />
                    </View>
                    <View style={styles.cardBody}>
                      <View style={styles.cardHeader}>
                        <Text
                          style={[styles.cardTitle, !alert.isRead && styles.cardTitleUnread]}
                          numberOfLines={2}
                        >
                          {alert.title}
                        </Text>
                        <Text style={styles.cardTime}>{timeAgoCompact(alert.createdAt)}</Text>
                        {!alert.isRead && <View style={[styles.dot, { backgroundColor: accent }]} />}
                      </View>
                      <Text style={styles.cardText}>{alert.body}</Text>
                      {alert.onSavedRoute && (
                        <View style={styles.badgeRow}>
                          <Badge
                            label={s('mySavedRoutes')}
                            color={Colors.warningDark}
                            icon="alt-route"
                            compact
                          />
                        </View>
                      )}
                    </View>
                  </View>
                </Card>
              );
            })}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  body: { flex: 1, backgroundColor: Colors.surfaceAlt },
  segmentWrap: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  list: { paddingHorizontal: Spacing.lg, paddingTop: 4, paddingBottom: Spacing.xxl, gap: 10 },
  card: { padding: 14 },
  cardRow: { flexDirection: 'row' },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, marginLeft: Spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: Colors.ink },
  cardTitleUnread: { fontWeight: '800' },
  cardTime: { fontSize: 12.5, color: Colors.inkFaint, marginLeft: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6, marginTop: 5 },
  cardText: { fontSize: 14.5, lineHeight: 21, color: Colors.inkMuted, marginTop: 4 },
  badgeRow: { flexDirection: 'row', marginTop: Spacing.sm },
});
