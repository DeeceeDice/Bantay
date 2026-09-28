import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import { Barangay } from '../src/data/models/types';
import { useApp } from '../src/state/appStore';
import { useBarangayCentre, useBarangaySearch } from '../src/state/useBarangaySearch';

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
 *
 * A barangay official names their barangay from the PSA's official list
 * (PSGC) - any of the country's 42,000 - and Google Places finds it on the
 * map. If Bantay has no zone there yet, approval creates one.
 */
export default function RoleScreen(): React.ReactElement {
  const { s, user, data, selectRole, requestAccess } = useApp();
  const [selected, setSelected] = useState<Choice | null>(null);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [barangayQuery, setBarangayQuery] = useState('');
  const [barangay, setBarangay] = useState<Barangay | null>(null);
  const search = useBarangaySearch(barangay ? '' : barangayQuery);
  const located = useBarangayCentre(barangay);
  const [organization, setOrganization] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false);

  const pending = data.accessRequests.find((r) => r.status === 'pending') ?? null;
  const latest = data.accessRequests[0] ?? null;
  const managedRole = user !== null && !isSelfServiceRole(user.role);
  const zoneName = (id: string | null): string =>
    data.zones.find((z) => z.id === id)?.name ?? '';
  const requestPlace = (r: { zoneId: string | null; barangay: Barangay | null }): string =>
    zoneName(r.zoneId) || (r.barangay ? `${r.barangay.name}, ${r.barangay.city}` : '');
  const byPsgc = selected === 'barangay_official';
  const existingZone = barangay ? data.zones.find((z) => z.psgcCode === barangay.code) ?? null : null;
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
      zone: (byPsgc ? barangay : zoneId) ? null : s(byPsgc ? 'barangayRequired' : 'zoneRequired'),
      organization: organization.trim().length >= 2 ? null : s('organizationRequired'),
    };
    setErrors(next);
    if (next.zone || next.organization) return;
    // Wait for the map lookup so the centre goes with the request.
    if (byPsgc && !existingZone && located.locating) return;

    setBusy(true);
    try {
      await requestAccess({
        role: selected,
        zoneId: byPsgc ? (existingZone?.id ?? null) : zoneId,
        psgc: byPsgc && barangay ? { code: barangay.code, center: located.center } : undefined,
        organization,
        reason,
      });
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
              message={`${s(roleLabelKey(pending.role))} - ${requestPlace(pending)}`}
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
                    setBarangay(null);
                    setBarangayQuery('');
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

            {byPsgc ? (
              <>
                <Text style={styles.fieldLabel}>{s('yourBarangay')}</Text>
                {barangay ? (
                  <View style={styles.picked}>
                    <MaterialIcons name="location-city" size={22} color={Colors.brandBlue} />
                    <View style={styles.pickedBody}>
                      <Text style={styles.pickedName}>{barangay.name}</Text>
                      <Text style={styles.pickedSub}>
                        {barangay.city}, {barangay.province}
                      </Text>
                      <Text style={styles.pickedNote}>
                        {existingZone
                          ? s('barangayHasZone')
                          : located.locating
                            ? s('barangayLocating')
                            : located.center
                              ? `${s('barangayFoundAt')} ${located.address ?? ''}`
                              : s('barangayNotLocated')}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        setBarangay(null);
                        setBarangayQuery('');
                      }}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={s('change')}
                    >
                      <Text style={styles.change}>{s('change')}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <Field
                      label={s('barangaySearchHint')}
                      value={barangayQuery}
                      onChangeText={setBarangayQuery}
                      icon="search"
                      autoComplete="off"
                      error={errors.zone}
                      maxLength={80}
                    />
                    {search.searching && <ActivityIndicator color={Colors.brandBlue} />}
                    {search.error && <Text style={styles.error}>{search.error}</Text>}
                    {!search.searching &&
                      !search.error &&
                      barangayQuery.trim().length >= 2 &&
                      search.results.length === 0 && (
                        <Text style={styles.hint}>{s('noBarangayFound')}</Text>
                      )}
                    {search.results.map((b) => (
                      <Pressable
                        key={b.code}
                        onPress={() => {
                          setBarangay(b);
                          setErrors((e) => ({ ...e, zone: null }));
                        }}
                        accessibilityRole="button"
                        style={styles.result}
                      >
                        <Text style={styles.resultName}>{b.name}</Text>
                        <Text style={styles.resultSub}>
                          {b.city}, {b.province}
                        </Text>
                      </Pressable>
                    ))}
                    {barangayQuery.length === 0 && (
                      <Text style={styles.hint}>{s('psgcSource')}</Text>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
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
              </>
            )}

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
              disabled={!selected || (byPsgc && !existingZone && located.locating)}
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
  hint: { fontSize: 12.5, color: Colors.inkMuted, marginBottom: Spacing.md, lineHeight: 18 },
  result: {
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  resultName: { fontSize: 14.5, fontWeight: '700', color: Colors.ink },
  resultSub: { fontSize: 12, color: Colors.inkMuted, marginTop: 1 },
  picked: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 2,
    borderColor: Colors.brandBlue,
    backgroundColor: Colors.brandBlueLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  pickedBody: { flex: 1, marginHorizontal: Spacing.md },
  pickedName: { fontSize: 15.5, fontWeight: '800', color: Colors.ink },
  pickedSub: { fontSize: 12.5, color: Colors.inkMuted, marginTop: 2 },
  pickedNote: { fontSize: 12, color: Colors.brandBlueDark, marginTop: Spacing.sm, lineHeight: 17 },
  change: { fontSize: 13.5, fontWeight: '700', color: Colors.brandBlue },
  footer: { paddingHorizontal: 24, paddingTop: Spacing.sm, paddingBottom: 24 },
  secondary: { marginTop: Spacing.md },
});
