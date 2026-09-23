import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, Card, EmptyState } from '../src/components/ui';
import { HazardPhoto } from '../src/components/ui/HazardPhoto';
import { Geo } from '../src/core/geo/latLng';
import { Colors, Spacing } from '../src/core/theme/colors';
import {
  hazardLabelKey,
  severityColor,
  severityIcon,
  severityLabelKey,
} from '../src/core/utils/hazardVisuals';
import { timeAgoCompact } from '../src/core/utils/timeAgo';
import { canVerify } from '../src/data/models/enums';
import { pendingForOfficial } from '../src/data/repositories/logic';
import { useApp } from '../src/state/appStore';

/**
 * Where barangay officials and school admins act on community reports.
 *
 * Verifying a report is what turns an orange pin red for every other user, so
 * this screen shows the evidence - photo, severity, confirmations - next to
 * the decision rather than making officials dig for it.
 */
export default function VerificationScreen(): React.ReactElement {
  const { s, user, data, verifyReport, rejectReport } = useApp();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!user || !canVerify(user.role)) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="lock"
          message="This panel is only available to barangay officials and school admins."
        />
      </View>
    );
  }

  const pending = pendingForOfficial(data.reports, user);

  const confirmReject = (reportId: string): void => {
    Alert.alert(s('rejectConfirmTitle'), s('rejectConfirmBody'), [
      { text: s('cancel'), style: 'cancel' },
      {
        text: s('reject'),
        style: 'destructive',
        onPress: () => {
          setBusyId(reportId);
          void rejectReport(reportId).then(() => {
            setBusyId(null);
            Alert.alert(s('reportRejectedToast'));
          });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.areaHeader}>
        <MaterialIcons name="shield" size={20} color={Colors.brandBlueDark} />
        <View style={styles.areaBody}>
          <Text style={styles.areaTitle}>{s('pendingInYourArea')}</Text>
          <Text style={styles.areaSub}>
            {user.barangay} - {Geo.formatDistance(user.areaRadiusMeters)} radius
          </Text>
        </View>
        <Badge label={String(pending.length)} color={Colors.brandBlueDark} filled />
      </View>

      {pending.length === 0 ? (
        <EmptyState icon="verified" title={s('allCaughtUp')} message={s('nothingToVerify')} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {pending.map((report) => (
            <Card key={report.id} padded={false} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.photo}>
                  <HazardPhoto uri={report.photoUri} type={report.type} height={74} radius={10} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{s(hazardLabelKey(report.type))}</Text>
                  <Text style={styles.cardSub} numberOfLines={2}>
                    {report.addressLabel}
                  </Text>
                  <View style={styles.badges}>
                    <Badge
                      label={s(severityLabelKey(report.severity))}
                      color={severityColor(report.severity)}
                      icon={severityIcon(report.severity)}
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
                    {report.flagCount > 0 && (
                      <Badge
                        label={String(report.flagCount)}
                        color={Colors.brandRed}
                        icon="flag"
                        compact
                      />
                    )}
                  </View>
                </View>
              </View>

              {report.description.length > 0 && (
                <Text style={styles.quote}>&quot;{report.description}&quot;</Text>
              )}
              <Text style={styles.reporter}>
                {s('reportedBy')} {report.reporterName}
              </Text>

              <View style={styles.actions}>
                <Button
                  label={s('reject')}
                  variant="outline"
                  icon="close"
                  color={Colors.inkMuted}
                  style={styles.rejectButton}
                  disabled={busyId === report.id}
                  onPress={() => confirmReject(report.id)}
                />
                <Button
                  label={s('verify')}
                  icon="verified"
                  color={Colors.safe}
                  style={styles.verifyButton}
                  loading={busyId === report.id}
                  onPress={() => {
                    setBusyId(report.id);
                    void verifyReport(report.id).then(() => {
                      setBusyId(null);
                      Alert.alert(s('reportVerifiedToast'));
                    });
                  }}
                />
              </View>
            </Card>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceAlt },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.brandBlueLight,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  areaBody: { flex: 1, marginLeft: Spacing.md },
  areaTitle: { fontSize: 14, fontWeight: '700', color: Colors.brandBlueDark },
  areaSub: { fontSize: 12, color: Colors.brandBlue, marginTop: 1 },
  list: { padding: Spacing.lg, gap: Spacing.md },
  card: { overflow: 'hidden' },
  cardTop: { flexDirection: 'row', padding: Spacing.lg, paddingBottom: Spacing.md },
  photo: { width: 74, height: 74, borderRadius: 10, overflow: 'hidden' },
  cardBody: { flex: 1, marginLeft: Spacing.md },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  cardSub: { fontSize: 12.5, color: Colors.inkMuted, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
  quote: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.inkMuted,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  reporter: {
    fontSize: 12.5,
    color: Colors.inkFaint,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    padding: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.line,
  },
  rejectButton: { flex: 1 },
  verifyButton: { flex: 2 },
});
