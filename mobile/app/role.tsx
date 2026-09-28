import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBar, Badge, Button, StatusBanner } from '../src/components/ui';
import { Field } from '../src/components/ui/AuthScaffold';
import { Colors, Radius, Spacing } from '../src/core/theme/colors';
import { roleDescKey, roleLabelKey } from '../src/core/utils/hazardVisuals';
import {
  OFFICIAL_ROLES,
  OfficialRole,
  SelfServiceRole,
  isSelfServiceRole,
} from '../src/data/models/enums';
import { useApp } from '../src/state/appStore';

type Choice = SelfServiceRole | OfficialRole;
const CHOICES: readonly Choice[] = ['commuter', 'barangay_official', 'school_admin', 'business_owner'];
const isOfficial = (role: Choice): role is OfficialRole =>
  (OFFICIAL_ROLES as readonly string[]).includes(role);

function RoleIcon({ role, color }: { role: Choice; color: string }): React.ReactElement {
  switch (role) {
    case 'commuter':
      return <MaterialIcons name="directions-walk" size={24} color={color} />;
    case 'barangay_official':
      return <MaterialCommunityIcons name="shield-outline" size={24} color={color} />;
    case 'school_admin':
      return <MaterialCommunityIcons name="school-outline" size={24} color={color} />;
    default:
      return <MaterialCommunityIcons name="storefront-outline" size={24} color={color} />;
  }
}

/**
 * Role picker, shown straight after sign-up and from Profile.
 *
 * Commuter and business owner are yours to pick. Barangay official and
 * school admin carry verification powers, so choosing one files an access
 * request instead: it is stored in the database, a super admin decides it
 * in Bantay Admin, and approval changes the role of this same account. The
 * database refuses a self-granted official role, so there is no shortcut to
 * offer here even by mistake.
 */
export default function RoleScreen(): React.ReactElement {
  const { s, user, data, selectRole, requestAccess } = useApp();
  const [selected, setSelected] = useState<Choice | null>(null);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [organization, setOrganization] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false);

  const pending = data.accessRequests.find((r) => r.status === 'pending') ?? null;
  const latest = data.accessRequests[0] ?? null;
  const managedRole = user !== null && !isSelfServiceRole(user.role);
  const zoneName = (id: string | null): string =>
    data.zones.find((z) => z.id === id)?.name ?? '';
  // Opened from Profile, as opposed to straight after sign-up.
  const changing = router.canGoBack();

  // From sign-up there is nothing to go back to; from Profile there is.
  const done = (): void => {
    if (changing) router.back();
    else router.replace('/location');
  };

  const zonesForRole =
    selected && isOfficial(selected)
      ? data.zones.filter((z) => z.kind === (selected === 'school_admin' ? 'school' : 'barangay'))
      : [];

  const advance = async (): Promise<void> => {
    if (!selected) return;

    if (!isOfficial(selected)) {
      setBusy(true);
      try {
        await selectRole(selected);
      } catch (e) {
        Alert.alert(s('somethingWentWrong'), e instanceof Error ? e.message : undefined);
        return;
      } finally {
        setBusy(false);
      }
      done();
      return;
    }

    const next = {
      zone: zoneId ? null : s('zoneRequired'),
      organization: organization.trim().length >= 2 ? null : s('organizationRequired'),
    };
    setErrors(next);
    if (next.zone || next.organization || !zoneId) return;

    setBusy(true);
    try {
      await requestAccess({ role: selected, zoneId, organization, reason });
    } catch (e) {
      Alert.alert(s('somethingWentWrong'), e instanceof Error ? e.message : undefined);
      return;
    } finally {
      setBusy(false);
    }
    Alert.alert(s('requestSentTitle'), s('requestSentBody'), [{ text: s('done'), onPress: done }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {changing && <AppBar title={s('changeRole')} leading="back" onLeading={() => router.back()} />}
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{s('chooseRole')}</Text>
        <Text style={styles.subtitle}>{s('chooseRoleSub')}</Text>

        {managedRole && user && (
          <View style={styles.banner}>
            <StatusBanner
              icon="admin-panel-settings"
              title={s(roleLabelKey(user.role))}
              message={user.barangay}
              color={Colors.safe}
            />
          </View>
        )}

        {!managedRole && pending && (
          <View style={styles.banner}>
            <StatusBanner
              icon="hourglass-top"
              title={s('requestPending')}
              message={`${s(roleLabelKey(pending.role))} - ${zoneName(pending.zoneId)}`}
              color={Colors.warning}
            />
          </View>
        )}

        {!managedRole && !pending && latest?.status === 'denied' && (
          <View style={styles.banner}>
            <StatusBanner
              icon="block"
              title={s('requestDenied')}
              message={latest.decisionNote ?? undefined}
              color={Colors.inkMuted}
            />
          </View>
        )}

        <View style={styles.cards}>
          {!managedRole &&
            CHOICES.map((role) => {
              const isSelected = selected === role;
              const blocked = isOfficial(role) && pending !== null;
              return (
                <Pressable
                  key={role}
                  onPress={() => {
                    if (blocked) return;
                    setSelected(role);
                    setZoneId(null);
                    setErrors({});
                  }}
                  disabled={blocked}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected, disabled: blocked }}
                  style={[
                    styles.card,
                    blocked && styles.cardBlocked,
                    {
                      backgroundColor: isSelected ? Colors.brandBlueLight : Colors.surface,
                      borderColor: isSelected ? Colors.brandBlue : Colors.line,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: isSelected ? Colors.brandBlue : Colors.brandBlueLight },
                    ]}
                  >
                    <RoleIcon role={role} color={isSelected ? Colors.white : Colors.brandBlue} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{s(roleLabelKey(role))}</Text>
                    <Text style={styles.cardDesc}>{s(roleDescKey(role))}</Text>
                    {isOfficial(role) && (
                      <View style={styles.badgeRow}>
                        <Badge label={s('needsApproval')} color={Colors.warning} icon="verified-user" compact />
                      </View>
                    )}
                  </View>
                  <MaterialIcons
                    name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={24}
                    color={isSelected ? Colors.brandBlue : Colors.inkFaint}
                  />
                </Pressable>
              );
            })}
        </View>

        {selected && isOfficial(selected) && (
          <View style={styles.request}>
            <Text style={styles.requestTitle}>{s('requestAccessTitle')}</Text>
            <Text style={styles.requestSub}>{s('requestAccessSub')}</Text>

            <Text style={styles.fieldLabel}>{s('chooseZone')}</Text>
            <View style={styles.zones}>
              {zonesForRole.map((z) => {
                const on = zoneId === z.id;
                return (
                  <Pressable
                    key={z.id}
                    onPress={() => setZoneId(z.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    style={[styles.zone, on && styles.zoneOn]}
                  >
                    <Text style={[styles.zoneName, on && styles.zoneNameOn]}>{z.name}</Text>
                    <Text style={[styles.zoneCity, on && styles.zoneNameOn]}>{z.city}</Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.zone && <Text style={styles.error}>{errors.zone}</Text>}

            <Field
              label={s('organization')}
              value={organization}
              onChangeText={setOrganization}
              error={errors.organization}
              icon="apartment"
              maxLength={120}
            />
            <Field
              label={s('accessReason')}
              value={reason}
              onChangeText={setReason}
              icon="notes"
              maxLength={500}
              multiline
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {managedRole ? (
          <Button label={s('done')} onPress={done} />
        ) : (
          <>
            <Button
              label={
                selected && isOfficial(selected)
                  ? s('submitRequest')
                  : changing
                    ? s('save')
                    : s('next')
              }
              onPress={advance}
              disabled={!selected}
              loading={busy}
            />
            {pending && (
              <Button
                label={s('continueAsCommuter')}
                variant="outline"
                onPress={done}
                style={styles.secondary}
              />
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { paddingHorizontal: 24, paddingTop: Spacing.xxl, paddingBottom: Spacing.md },
  title: { fontSize: 26, fontWeight: '800', color: Colors.ink, letterSpacing: -0.4 },
  subtitle: { fontSize: 14.5, color: Colors.inkMuted, marginTop: Spacing.sm, lineHeight: 21 },
  banner: { marginTop: Spacing.lg },
  cards: { marginTop: Spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  cardBlocked: { opacity: 0.45 },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, marginLeft: 14, marginRight: Spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  cardDesc: { fontSize: 12.5, color: Colors.inkFaint, marginTop: 3, lineHeight: 17.5 },
  badgeRow: { flexDirection: 'row', marginTop: Spacing.sm },
  request: { marginTop: Spacing.xl },
  requestTitle: { fontSize: 18, fontWeight: '800', color: Colors.ink },
  requestSub: { fontSize: 13.5, color: Colors.inkMuted, marginTop: Spacing.xs, lineHeight: 20 },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.inkMuted,
    marginTop: Spacing.lg,
    marginBottom: 6,
  },
  zones: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  zone: {
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    margin: 4,
    backgroundColor: Colors.surface,
  },
  zoneOn: { backgroundColor: Colors.brandBlue, borderColor: Colors.brandBlue },
  zoneName: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  zoneCity: { fontSize: 11.5, color: Colors.inkMuted, marginTop: 1 },
  zoneNameOn: { color: Colors.white },
  error: { fontSize: 12.5, color: Colors.brandRed, marginTop: 5, fontWeight: '600' },
  footer: { paddingHorizontal: 24, paddingTop: Spacing.sm, paddingBottom: 24 },
  secondary: { marginTop: Spacing.md },
});
