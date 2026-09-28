import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Card, EmptyState } from '../src/components/ui';
import { HazardPhoto } from '../src/components/ui/HazardPhoto';
import { Colors, Spacing } from '../src/core/theme/colors';
import { hazardLabelKey, rejectReasonLabelKey, statusColor } from '../src/core/utils/hazardVisuals';
import { timeAgoCompact } from '../src/core/utils/timeAgo';
import { StringKey } from '../src/core/i18n/strings';
import { ReportStatus } from '../src/data/models/enums';
import { reportsByUser } from '../src/data/repositories/logic';
import { useApp } from '../src/state/appStore';

/** Every report the signed-in user has filed, with its current state. */
export default function MyReportsScreen(): React.ReactElement {
  const { s, user, data } = useApp();
  const reports = user ? reportsByUser(data.reports, user.id) : [];

  if (reports.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState icon="assignment" message={s('noReportsYet')} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.list}>
      {reports.map((report) => (
        <Card
          key={report.id}
          style={styles.card}
          onPress={
            report.status === 'rejected'
              ? undefined
              : () => router.push({ pathname: '/(tabs)', params: { focusReport: report.id } })
          }
        >
          <View style={styles.row}>
            <View style={styles.photo}>
              <HazardPhoto uri={report.photoUri} type={report.type} height={62} radius={10} />
            </View>
            <View style={styles.body}>
              <Text style={styles.title}>{s(hazardLabelKey(report.type))}</Text>
              <Text style={styles.sub} numberOfLines={1}>
                {report.addressLabel}
              </Text>
              <View style={styles.badges}>
                <Badge
                  label={s(STATUS_LABEL[report.status])}
                  color={statusColor(report.status)}
                  icon={STATUS_ICON[report.status]}
                  filled={report.status === 'verified'}
                  compact
                />
                <Badge
                  label={timeAgoCompact(report.reportedAt)}
                  color={Colors.inkMuted}
                  icon="schedule"
                  compact
                />
                {report.confirmCount > 0 && (
                  <Badge
                    label={String(report.confirmCount)}
                    color={Colors.safe}
                    icon="how-to-vote"
                    compact
                  />
                )}
              </View>
              {report.status === 'rejected' && report.rejectReason && (
                <Text style={styles.reason}>
                  {s(rejectReasonLabelKey(report.rejectReason))}
                  {report.rejectNote ? ` - ${report.rejectNote}` : ''}
                </Text>
              )}
            </View>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const STATUS_LABEL: Record<ReportStatus, StringKey> = {
  pending: 'pendingBadge',
  verified: 'verifiedBadge',
  rejected: 'rejectedBadge',
  flagged: 'flaggedBadge',
};

const STATUS_ICON = {
  pending: 'schedule',
  verified: 'verified',
  rejected: 'cancel',
  flagged: 'outlined-flag',
} as const satisfies Record<ReportStatus, string>;

const styles = StyleSheet.create({
  reason: { fontSize: 12.5, color: Colors.inkMuted, marginTop: Spacing.sm, lineHeight: 18 },
  container: { flex: 1, backgroundColor: Colors.surfaceAlt },
  list: { padding: Spacing.lg, paddingBottom: Spacing.xxl, gap: Spacing.md },
  card: { padding: 14 },
  row: { flexDirection: 'row' },
  photo: { width: 62, height: 62, borderRadius: 10, overflow: 'hidden' },
  body: { flex: 1, marginLeft: 13 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  sub: { fontSize: 12.5, color: Colors.inkFaint, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
});
