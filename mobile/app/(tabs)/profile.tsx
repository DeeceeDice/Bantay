import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Badge,
  Button,
  Card,
  EmptyState,
  SectionHeader,
  StatTile,
  StatusBanner,
} from '../../src/components/ui';
import { Sheet } from '../../src/components/ui/Sheet';
import { Colors, Radius, Spacing } from '../../src/core/theme/colors';
import { Alert } from '../../src/core/utils/alert';
import { roleLabelKey } from '../../src/core/utils/hazardVisuals';
import { canVerify } from '../../src/data/models/enums';
import { initials, trustScore } from '../../src/data/models/types';
import { pendingForOfficial, reportsByUser } from '../../src/data/repositories/logic';
import { useApp } from '../../src/state/appStore';

/** Profile, stats and every app setting. */
export default function ProfileScreen(): React.ReactElement {
  const app = useApp();
  const { s, user, data, settings } = app;
  const [areaOpen, setAreaOpen] = useState(false);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <EmptyState icon="person-outline" message={s('logIn')} />
      </SafeAreaView>
    );
  }

  const myReports = reportsByUser(data.reports, user.id);
  const homeZone = data.zones.find((z) => z.id === user.homeZoneId) ?? null;
  const latestRequest = data.accessRequests[0] ?? null;

  const chooseArea = (zoneId: string | null): void => {
    setAreaOpen(false);
    void app.setHomeZone(zoneId).catch((e: unknown) => {
      Alert.alert(s('somethingWentWrong'), e instanceof Error ? e.message : String(e));
    });
  };
  const pendingCount = canVerify(user.role) ? pendingForOfficial(data.reports, user).length : 0;

  const confirmLogOut = (): void => {
    Alert.alert(s('logOutConfirmTitle'), s('logOutConfirmBody'), [
      { text: s('cancel'), style: 'cancel' },
      {
        text: s('logOut'),
        style: 'destructive',
        onPress: () => {
          void app.logOut().then(() => router.replace('/login'));
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(user.name)}</Text>
          </View>
          <View style={styles.headerBody}>
            <Text style={styles.name}>{user.name}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <View style={styles.badgeRow}>
              <Badge
                label={s(roleLabelKey(user.role))}
                color={canVerify(user.role) ? Colors.safe : Colors.brandBlue}
                icon={canVerify(user.role) ? 'shield' : 'directions-walk'}
                compact
              />
            </View>
          </View>
        </View>

        {user.status === 'suspended' && (
          <View style={styles.banner}>
            <StatusBanner
              icon="block"
              title={s('accountSuspendedTitle')}
              message={s('accountSuspendedBody')}
              color={Colors.brandRed}
            />
          </View>
        )}
        {latestRequest && latestRequest.status !== 'approved' && (
          <View style={styles.banner}>
            <StatusBanner
              icon={latestRequest.status === 'pending' ? 'hourglass-top' : 'block'}
              title={latestRequest.status === 'pending' ? s('requestPending') : s('requestDenied')}
              message={
                latestRequest.status === 'pending'
                  ? `${s(roleLabelKey(latestRequest.role))} - ${
                      data.zones.find((z) => z.id === latestRequest.zoneId)?.name ?? ''
                    }`
                  : latestRequest.decisionNote ?? undefined
              }
              color={latestRequest.status === 'pending' ? Colors.warning : Colors.inkMuted}
            />
          </View>
        )}

        <View style={styles.stats}>
          <StatTile
            value={String(user.reportsSubmitted)}
            label={s('reportsSubmitted')}
            color={Colors.brandBlue}
          />
          <StatTile
            value={String(
              canVerify(user.role) ? user.verificationsPerformed : user.reportsVerified,
            )}
            label={canVerify(user.role) ? s('verificationsDone') : s('reportsVerifiedStat')}
            color={Colors.safe}
          />
          <StatTile
            value={String(trustScore(user))}
            label={s('trustScore')}
            color={Colors.brandRed}
          />
        </View>

        <SectionHeader title={s('myReports')} />
        <Card padded={false}>
          <Row
            icon="assignment"
            label={s('myReports')}
            trailing={String(myReports.length)}
            onPress={() => router.push('/my-reports')}
          />
          <Divider />
          <Row
            icon="alt-route"
            label={s('savedRoutes')}
            trailing={String(data.routes.length)}
            onPress={() => router.push('/routes')}
          />
          {canVerify(user.role) && (
            <>
              <Divider />
              <Row
                icon="verified-user"
                label={s('verificationPanel')}
                trailing={String(pendingCount)}
                highlight
                onPress={() => router.push('/verification')}
              />
            </>
          )}
        </Card>

        <SectionHeader title={s('notificationPreferences')} />
        <Card padded={false}>
          <Row
            icon="place"
            label={s('myArea')}
            description={s('myAreaDesc')}
            trailing={homeZone?.name ?? s('noAreaChosen')}
            onPress={() => setAreaOpen(true)}
          />
          <Divider />
          <View style={styles.radiusRow}>
            <View style={styles.radiusHeader}>
              <Text style={styles.rowLabel}>{s('alertRadius')}</Text>
              <Badge
                label={`${settings.alertRadiusKm.toFixed(1)} km`}
                color={Colors.brandBlue}
                filled
                compact
              />
            </View>
            <Text style={styles.rowDesc}>{s('alertRadiusDesc')}</Text>
            <View style={styles.stepper}>
              {[0.5, 1, 2, 5, 10].map((km) => (
                <Pressable
                  key={km}
                  onPress={() => void app.updateSettings({ alertRadiusKm: km })}
                  style={[
                    styles.step,
                    settings.alertRadiusKm === km && styles.stepActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepText,
                      settings.alertRadiusKm === km && styles.stepTextActive,
                    ]}
                  >
                    {km < 1 ? `${km * 1000}m` : `${km}km`}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Divider />
          <View style={styles.languageRow}>
            <MaterialIcons name="translate" size={20} color={Colors.inkMuted} />
            <Text style={[styles.rowLabel, styles.languageLabel]}>{s('language')}</Text>
            <View style={styles.segment}>
              {(['en', 'fil'] as const).map((lang) => (
                <Pressable
                  key={lang}
                  onPress={() => void app.updateSettings({ language: lang })}
                  style={[
                    styles.segmentItem,
                    settings.language === lang && styles.segmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      settings.language === lang && styles.segmentTextActive,
                    ]}
                  >
                    {lang === 'en' ? s('english') : s('filipino')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Card>

        <SectionHeader title={s('helpAndSupport')} />
        <Card padded={false}>
          <Row
            icon="person-outline"
            label={s('changeRole')}
            trailing={s(roleLabelKey(user.role))}
            onPress={() => router.push('/role')}
          />
        </Card>

        <Button
          label={s('logOut')}
          variant="outline"
          icon="logout"
          color={Colors.brandRed}
          style={styles.logOut}
          onPress={confirmLogOut}
        />
        <Text style={styles.version}>Bantay 1.0.0</Text>
      </ScrollView>

      <Sheet visible={areaOpen} onClose={() => setAreaOpen(false)}>
        <Text style={styles.sheetTitle}>{s('myArea')}</Text>
        <Text style={styles.sheetSub}>{s('myAreaDesc')}</Text>
        {[null, ...data.zones.map((z) => z.id)].map((id) => {
          const zone = data.zones.find((z) => z.id === id) ?? null;
          const on = (user.homeZoneId ?? null) === id;
          return (
            <Pressable
              key={id ?? 'none'}
              onPress={() => chooseArea(id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={styles.areaRow}
            >
              <MaterialIcons
                name={on ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={22}
                color={on ? Colors.brandBlue : Colors.inkFaint}
              />
              <View style={styles.areaBody}>
                <Text style={styles.areaName}>{zone ? zone.name : s('clearArea')}</Text>
                {zone && <Text style={styles.areaCity}>{zone.city}</Text>}
              </View>
            </Pressable>
          );
        })}
      </Sheet>
    </SafeAreaView>
  );
}

function Row({
  icon,
  label,
  description,
  trailing,
  onPress,
  highlight = false,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  label: string;
  description?: string;
  trailing?: string;
  onPress: () => void;
  highlight?: boolean;
}): React.ReactElement {
  return (
    <Pressable style={styles.row} onPress={onPress} accessibilityRole="button">
      <MaterialIcons
        name={icon}
        size={20}
        color={highlight ? Colors.safe : Colors.inkMuted}
      />
      <View style={styles.rowBody}>
        <Text
          style={[styles.rowLabel, { color: highlight ? Colors.safeDark : Colors.ink }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {description && <Text style={styles.rowDesc}>{description}</Text>}
      </View>
      {trailing && <Text style={styles.rowTrailing}>{trailing}</Text>}
      <MaterialIcons name="chevron-right" size={20} color={Colors.inkFaint} />
    </Pressable>
  );
}

const Divider = (): React.ReactElement => <View style={styles.divider} />;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceAlt },
  scroll: { padding: Spacing.lg, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: Colors.brandBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.white, fontSize: 25, fontWeight: '800' },
  headerBody: { flex: 1, marginLeft: Spacing.lg },
  name: { fontSize: 19, fontWeight: '700', color: Colors.ink },
  email: { fontSize: 12.5, color: Colors.inkMuted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', marginTop: Spacing.sm },
  stats: { flexDirection: 'row', gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 16, fontWeight: '600', color: Colors.ink, marginLeft: Spacing.md },
  rowTrailing: { fontSize: 13, color: Colors.inkMuted, marginRight: 6 },
  rowDesc: { fontSize: 12.5, color: Colors.inkMuted, marginTop: 2, marginLeft: Spacing.md },
  banner: { marginBottom: Spacing.md },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: Colors.ink },
  sheetSub: { fontSize: 13.5, color: Colors.inkMuted, marginTop: Spacing.xs, marginBottom: Spacing.md },
  areaRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  areaBody: { marginLeft: Spacing.md },
  areaName: { fontSize: 15, fontWeight: '600', color: Colors.ink },
  areaCity: { fontSize: 12, color: Colors.inkMuted },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.line },
  radiusRow: { padding: Spacing.lg },
  radiusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', gap: 6, marginTop: Spacing.md },
  step: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: 'center',
  },
  stepActive: { backgroundColor: Colors.brandBlue, borderColor: Colors.brandBlue },
  stepText: { fontSize: 12, fontWeight: '700', color: Colors.inkMuted },
  stepTextActive: { color: Colors.white },
  languageRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg },
  languageLabel: { flex: 0 },
  segment: {
    flexDirection: 'row',
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  segmentItem: { paddingHorizontal: Spacing.md, paddingVertical: 6 },
  segmentActive: { backgroundColor: Colors.brandBlueLight },
  segmentText: { fontSize: 13, fontWeight: '600', color: Colors.inkMuted },
  segmentTextActive: { color: Colors.brandBlueDark, fontWeight: '700' },
  logOut: { marginTop: Spacing.xl },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.inkFaint,
    marginTop: Spacing.lg,
  },
});
