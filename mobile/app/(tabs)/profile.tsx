import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppBar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  NavRow,
  SectionHeader,
  SegmentedButton,
  StatTile,
  StatusBanner,
} from '../../src/components/ui';
import { Geo } from '../../src/core/geo/latLng';
import { Colors, Spacing } from '../../src/core/theme/colors';
import { roleIcon, roleLabelKey } from '../../src/core/utils/hazardVisuals';
import { canVerify } from '../../src/data/models/enums';
import { initials, trustScore } from '../../src/data/models/types';
import { pendingForOfficial, reportsByUser } from '../../src/data/repositories/logic';
import { useApp } from '../../src/state/appStore';

/** Profile, stats and every app setting. */
export default function ProfileScreen(): React.ReactElement {
  const app = useApp();
  const { s, user, data, settings } = app;

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <AppBar title={s('profile')} />
        <View style={styles.body}>
          <EmptyState icon="person-outline" message={s('logIn')} />
        </View>
      </SafeAreaView>
    );
  }

  const myReports = reportsByUser(data.reports, user.id);
  const latestRequest = data.accessRequests[0] ?? null;
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
      <AppBar title={s('profile')} />
      <ScrollView style={styles.body} contentContainerStyle={styles.scroll}>
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
                icon={roleIcon(user.role)}
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
          <NavRow
            icon="assignment"
            label={s('myReports')}
            trailing={String(myReports.length)}
            onPress={() => router.push('/my-reports')}
          />
          <Divider />
          <NavRow
            icon="alt-route"
            label={s('savedRoutes')}
            trailing={String(data.routes.length)}
            onPress={() => router.push('/routes')}
          />
          {canVerify(user.role) && (
            <>
              <Divider />
              <NavRow
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
          <NavRow
            icon="notifications-none"
            label={s('notificationPreferences')}
            trailing={Geo.formatRadius(settings.alertRadiusKm)}
            onPress={() => router.push('/notifications')}
          />
          <Divider />
          <View style={styles.languageRow}>
            <MaterialIcons name="translate" size={20} color={Colors.inkMuted} />
            <Text style={styles.languageLabel}>{s('language')}</Text>
            <SegmentedButton
              compact
              segments={[
                { value: 'en' as const, label: s('english') },
                { value: 'fil' as const, label: s('filipino') },
              ]}
              value={settings.language}
              onChange={(language) => void app.updateSettings({ language })}
            />
          </View>
        </Card>

        <SectionHeader title={s('helpAndSupport')} />
        <Card padded={false}>
          <NavRow
            icon="person-outline"
            label={s('changeRole')}
            trailing={s(roleLabelKey(user.role))}
            onPress={() => router.push('/role')}
          />
          <Divider />
          <NavRow
            icon="help-outline"
            label={s('helpAndSupport')}
            onPress={() => router.push('/help')}
          />
        </Card>

        <Button
          label={s('logOut')}
          variant="outline"
          icon="logout"
          color={Colors.brandRed}
          borderColor={`${Colors.brandRed}66`}
          style={styles.logOut}
          onPress={confirmLogOut}
        />
        <Text style={styles.version}>Bantay 1.0.0</Text>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  body: { flex: 1, backgroundColor: Colors.surfaceAlt },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
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
  email: { fontSize: 12.5, lineHeight: 17.5, color: Colors.inkFaint, marginTop: 2 },
  badgeRow: { flexDirection: 'row', marginTop: Spacing.sm },
  stats: { flexDirection: 'row', gap: 10 },
  banner: { marginBottom: Spacing.md },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.md,
    paddingVertical: Spacing.md,
  },
  languageLabel: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.ink, marginLeft: 14 },
  logOut: { marginTop: 22 },
  version: {
    textAlign: 'center',
    fontSize: 12.5,
    color: Colors.inkFaint,
    marginTop: 14,
  },
});
