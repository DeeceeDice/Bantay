import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BantayMap } from '../src/components/map/BantayMap';
import { useMapController } from '../src/components/map/useMapController';
import { MapTypeToggle, usePlacementTiles } from '../src/components/map/usePlacementTiles';
import { AppBar, Badge, Button, Card, StatusBanner } from '../src/components/ui';
import { HazardPhoto } from '../src/components/ui/HazardPhoto';
import { Field } from '../src/components/ui/AuthScaffold';
import { PlacementPin } from '../src/components/ui/Pins';
import { StringKey } from '../src/core/i18n/strings';
import { LatLng } from '../src/core/geo/latLng';
import { Colors, Radius, Shadow, Spacing } from '../src/core/theme/colors';
import {
  hazardIcon,
  hazardLabelKey,
  severityColor,
  severityIcon,
  severityLabelKey,
} from '../src/core/utils/hazardVisuals';
import { compressReportPhoto } from '../src/core/utils/reportPhoto';
import {
  HAZARD_SEVERITIES,
  HAZARD_TYPES,
  HazardSeverity,
  HazardType,
} from '../src/data/models/enums';
import { HazardReport } from '../src/data/models/types';
import { describePoint } from '../src/data/seed/gazetteer';
import { useApp } from '../src/state/appStore';
import { useUserLocation } from '../src/state/LocationProvider';

const STEP_COUNT = 4;
const MAX_DESCRIPTION = 140;

const SEVERITY_DESC: Record<HazardSeverity, StringKey> = {
  passable_with_caution: 'severityCautionDesc',
  not_passable: 'severityBlockedDesc',
  life_threatening: 'severityDangerDesc',
};

/**
 * The four-step guided hazard report.
 *
 * One draft is held across all four steps, so going back never loses input
 * and the Next button can reflect whether the current step is complete.
 */
export default function ReportScreen(): React.ReactElement {
  const { s, user, submitReport } = useApp();
  const location = useUserLocation();

  const [step, setStep] = useState(0);
  const [point, setPoint] = useState<LatLng>(location.current);
  const [type, setType] = useState<HazardType | null>(null);
  const [severity, setSeverity] = useState<HazardSeverity | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState<HazardReport | null>(null);

  const controller = useMapController({ center: location.current, zoom: 17 });
  const tiles = usePlacementTiles();
  const addressLabel = describePoint(point);

  const hasInput = type !== null || severity !== null || photoUri !== null;

  /** Back a step, or leave - checking first if anything would be lost. */
  const back = (): void => {
    if (step > 0) {
      setStep(step - 1);
      return;
    }
    if (!hasInput) {
      router.back();
      return;
    }
    Alert.alert(s('cancel'), s('discardReport'), [
      { text: s('back'), style: 'cancel' },
      { text: s('confirm'), style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const backToMap = (report: HazardReport): void =>
    router.replace({ pathname: '/(tabs)', params: { focusReport: report.id } });

  // Android's back button steps back through the report the same way, and
  // after submitting it returns to the map.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (submitted) backToMap(submitted);
      else back();
      return true;
    });
    return () => sub.remove();
  });

  if (submitted) {
    return (
      <SafeAreaView style={styles.success} edges={['top', 'bottom']}>
        <View style={styles.successInner}>
          <View style={styles.successIcon}>
            <MaterialIcons name="check" size={58} color={Colors.safe} />
          </View>
          <Text style={styles.successTitle}>{s('reportSubmittedTitle')}</Text>
          <Text style={styles.successBody}>{s('reportSubmittedBody')}</Text>
          <Card style={styles.successCard}>
            <View style={styles.successRow}>
              <View style={styles.successPhoto}>
                <HazardPhoto uri={submitted.photoUri} type={submitted.type} height={62} radius={10} />
              </View>
              <View style={styles.successDetails}>
                <Text style={styles.successType}>{s(hazardLabelKey(submitted.type))}</Text>
                <Text style={styles.successAddress}>{submitted.addressLabel}</Text>
                <View style={styles.successBadge}>
                  <Badge label={s('pendingBadge')} color={Colors.warning} icon="schedule" compact />
                </View>
              </View>
            </View>
          </Card>
          <Button label={s('backToMap')} icon="map" onPress={() => backToMap(submitted)} />
        </View>
      </SafeAreaView>
    );
  }

  const header = (
    <View style={styles.header}>
      <AppBar
        title={s('reportHazard')}
        leading={step === 0 ? 'close' : 'back'}
        onLeading={back}
      />
      <View style={styles.progress}>
        <Text style={styles.stepLabel}>
          {s('step')} {step + 1}/{STEP_COUNT}
        </Text>
        <View style={styles.bars}>
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <Pressable
              key={i}
              // Tapping a completed step jumps back to it; later steps stay
              // locked until the current one is done.
              onPress={i < step ? () => setStep(i) : undefined}
              style={[
                styles.bar,
                { backgroundColor: i <= step ? Colors.brandRed : Colors.line },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );

  // The database refuses a suspended account's report; say so up front
  // rather than after four steps of filling it in.
  if (user?.status === 'suspended') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header}
        <View style={styles.suspended}>
          <StatusBanner
            icon="block"
            title={s('accountSuspendedTitle')}
            message={s('accountSuspendedBody')}
            color={Colors.brandRed}
          />
        </View>
      </SafeAreaView>
    );
  }

  const canAdvance =
    step === 0 ? true : step === 1 ? !!type : step === 2 ? !!severity : !!photoUri;

  const attach = async (source: 'camera' | 'library'): Promise<void> => {
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(s('stepPhotoTitle'), s('stepPhotoBody'));
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              // Downscaling keeps report payloads small enough to upload over
              // a congested network during a storm, which is exactly when the
              // app is used most.
              quality: 0.8,
              allowsEditing: false,
            })
          : await ImagePicker.launchImageLibraryAsync({
              quality: 0.8,
              mediaTypes: ['images'],
            });

      if (!result.canceled && result.assets.length > 0) {
        // Stored in the report itself so officials on other devices see it.
        setPhotoUri(await compressReportPhoto(result.assets[0].uri));
      }
    } catch (error) {
      Alert.alert(s('somethingWentWrong'), String(error));
    }
  };

  const submit = async (): Promise<void> => {
    if (!type || !severity || !photoUri) return;
    setBusy(true);
    let report: Awaited<ReturnType<typeof submitReport>>;
    try {
      report = await submitReport({
        type,
        severity,
        location: point,
        addressLabel,
        description,
        photoUri,
      });
    } catch (error) {
      // The database refused it - signed out, offline, or a policy said no.
      // Say so, rather than leaving the button spinning on a report that
      // was never stored.
      Alert.alert(s('somethingWentWrong'), error instanceof Error ? error.message : String(error));
      return;
    } finally {
      setBusy(false);
    }

    setSubmitted(report);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {header}

      {step === 0 && (
        <View style={styles.flex}>
          <View style={styles.intro}>
            <Text style={styles.title}>{s('stepLocationTitle')}</Text>
            <Text style={styles.body}>{s('stepLocationBody')}</Text>
          </View>
          <View style={styles.mapWrap}>
            <BantayMap
              controller={controller}
              tileSource={tiles.source}
              onCameraChange={(camera) => setPoint(camera.center)}
            />
            {/* The pin is fixed to the centre and the map moves under it,
                which is far easier one-handed than dragging a small target. */}
            <View style={styles.pinOverlay} pointerEvents="none">
              <PlacementPin />
            </View>
            <Pressable
              onPress={() => controller.moveTo(location.current, 17)}
              style={styles.recentre}
              accessibilityRole="button"
              accessibilityLabel={s('recenter')}
            >
              <MaterialIcons name="my-location" size={21} color={Colors.brandBlue} />
            </Pressable>
            {tiles.googleAvailable && (
              <MapTypeToggle
                value={tiles.mapType}
                onChange={tiles.setMapType}
                labels={{ roadmap: s('mapRoadmap'), satellite: s('mapSatellite') }}
                style={styles.mapType}
              />
            )}
          </View>
          <View style={styles.addressBar}>
            <MaterialCommunityIcons name="map-marker-outline" size={20} color={Colors.brandRed} />
            <View style={styles.addressBody}>
              <Text style={styles.addressLabel}>{addressLabel}</Text>
              <Text style={styles.addressCoords}>
                {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {step === 1 && (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>{s('stepTypeTitle')}</Text>
          <Text style={styles.body}>{addressLabel}</Text>
          <View style={styles.options}>
            {HAZARD_TYPES.map((t) => (
              <OptionCard
                key={t}
                selected={type === t}
                icon={hazardIcon(t)}
                title={s(hazardLabelKey(t))}
                color={Colors.brandRed}
                selectedBackground={Colors.brandRedLight}
                onPress={() => setType(t)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {step === 2 && (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>{s('stepSeverityTitle')}</Text>
          <Text style={styles.body}>
            {type ? `${s(hazardLabelKey(type))} - ${addressLabel}` : addressLabel}
          </Text>
          <View style={styles.options}>
            {HAZARD_SEVERITIES.map((sev) => (
              <OptionCard
                key={sev}
                selected={severity === sev}
                icon={severityIcon(sev)}
                title={s(severityLabelKey(sev))}
                description={s(SEVERITY_DESC[sev])}
                color={severityColor(sev)}
                tinted
                onPress={() => setSeverity(sev)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {step === 3 && (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>{s('stepPhotoTitle')}</Text>
          <Text style={styles.body}>{s('stepPhotoBody')}</Text>

          <View style={styles.photoFrame}>
            {photoUri ? (
              <>
                <HazardPhoto uri={photoUri} type={type ?? 'other'} height={230} />
                <Pressable style={styles.clearPhoto} onPress={() => setPhotoUri(null)}>
                  <MaterialIcons name="close" size={19} color={Colors.white} />
                </Pressable>
              </>
            ) : (
              <View style={styles.photoEmpty}>
                {type ? (
                  <MaterialIcons name={hazardIcon(type)} size={42} color={Colors.warningDark} />
                ) : (
                  <MaterialIcons name="add-a-photo" size={42} color={Colors.warningDark} />
                )}
                <Text style={styles.photoEmptyText}>{s('photoRequiredNotice')}</Text>
              </View>
            )}
          </View>

          <View style={styles.photoButtons}>
            <Button
              label={photoUri ? s('retakePhoto') : s('takePhoto')}
              variant="outline"
              icon="photo-camera"
              style={styles.photoButton}
              onPress={() => void attach('camera')}
            />
            <Button
              label={s('chooseFromGallery')}
              variant="outline"
              icon="photo-library"
              style={styles.photoButton}
              onPress={() => void attach('library')}
            />
          </View>

          <View style={styles.descriptionWrap}>
            <Text style={styles.descriptionTitle}>{s('descriptionOptional')}</Text>
            <Field
              label={s('descriptionOptional')}
              floatingLabel={false}
              value={description}
              onChangeText={setDescription}
              placeholder={s('descriptionHint')}
              maxLength={MAX_DESCRIPTION}
              multiline
            />
            <Text style={styles.counter}>
              {description.length}/{MAX_DESCRIPTION}
            </Text>
          </View>
        </ScrollView>
      )}

      <View style={styles.footer}>
        {step === STEP_COUNT - 1 && !photoUri && (
          <View style={styles.notice}>
            <MaterialIcons name="info-outline" size={16} color={Colors.warningDark} />
            <Text style={styles.noticeText}>{s('photoRequiredNotice')}</Text>
          </View>
        )}
        <View style={styles.footerRow}>
          {step > 0 && (
            <Button
              label={s('back')}
              variant="outline"
              style={styles.backButton}
              onPress={back}
              disabled={busy}
            />
          )}
          <Button
            label={step === STEP_COUNT - 1 ? s('submitReport') : s('next')}
            icon={step === STEP_COUNT - 1 ? 'send' : undefined}
            style={styles.nextButton}
            disabled={!canAdvance}
            loading={busy}
            onPress={() => (step === STEP_COUNT - 1 ? void submit() : setStep(step + 1))}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function OptionCard({
  selected,
  icon,
  title,
  description,
  color,
  selectedBackground,
  tinted = false,
  onPress,
}: {
  selected: boolean;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  description?: string;
  color: string;
  selectedBackground?: string;
  /** Show the colour even while unselected, as the severity scale does. */
  tinted?: boolean;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.option,
        description ? styles.optionTall : null,
        {
          backgroundColor: selected ? (selectedBackground ?? `${color}1A`) : Colors.surface,
          borderColor: selected ? color : Colors.line,
          borderWidth: selected ? 2 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.optionIcon,
          {
            backgroundColor: selected ? color : tinted ? `${color}1F` : Colors.surfaceAlt,
          },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={23}
          color={selected ? Colors.white : tinted ? color : Colors.inkMuted}
        />
      </View>
      <View style={styles.optionBody}>
        <Text style={styles.optionTitle}>{title}</Text>
        {description && <Text style={styles.optionDesc}>{description}</Text>}
      </View>
      <MaterialIcons
        name={selected ? 'check-circle' : 'radio-button-unchecked'}
        size={24}
        color={selected ? color : Colors.inkFaint}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  suspended: { flex: 1, padding: Spacing.lg, backgroundColor: Colors.surfaceAlt },
  success: { flex: 1, backgroundColor: Colors.surfaceAlt },
  successInner: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    padding: 24,
  },
  successIcon: {
    alignSelf: 'center',
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: Colors.safeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: Colors.ink,
    textAlign: 'center',
    marginTop: Spacing.xxl,
  },
  successBody: {
    fontSize: 14.5,
    lineHeight: 21,
    color: Colors.inkMuted,
    textAlign: 'center',
    marginTop: 10,
  },
  successCard: { marginTop: 26, marginBottom: 24 },
  successRow: { flexDirection: 'row', alignItems: 'center' },
  successPhoto: { width: 62, height: 62, borderRadius: 10, overflow: 'hidden' },
  successDetails: { flex: 1, marginLeft: 14 },
  successType: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  successAddress: { fontSize: 12.5, lineHeight: 17.5, color: Colors.inkFaint, marginTop: 2 },
  successBadge: { flexDirection: 'row', marginTop: Spacing.sm },
  container: { flex: 1, backgroundColor: Colors.surfaceAlt },
  header: { backgroundColor: Colors.surface },
  flex: { flex: 1 },
  progress: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  stepLabel: { fontSize: 12, fontWeight: '700', color: Colors.inkMuted },
  bars: { flexDirection: 'row', gap: 5, marginTop: Spacing.sm },
  bar: { flex: 1, height: 5, borderRadius: 3 },
  intro: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.ink, letterSpacing: -0.3 },
  body: { fontSize: 14.5, color: Colors.inkMuted, marginTop: 6, lineHeight: 21 },
  mapWrap: { flex: 1, overflow: 'hidden' },
  pinOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 52,
  },
  mapType: { position: 'absolute', top: 12, right: 14 },
  recentre: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
  },
  addressBody: { flex: 1, marginLeft: 10 },
  addressLabel: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  addressCoords: { fontSize: 12.5, color: Colors.inkFaint, marginTop: 2 },
  options: { marginTop: Spacing.xl, gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    padding: 14,
  },
  optionTall: { alignItems: 'flex-start', padding: Spacing.lg },
  optionBody: { flex: 1, marginLeft: 14, marginRight: Spacing.sm },
  optionDesc: { fontSize: 12.5, lineHeight: 17.5, color: Colors.inkFaint, marginTop: Spacing.xs },
  optionIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  photoFrame: {
    marginTop: 18,
    borderRadius: Radius.md,
    overflow: 'hidden',
    minHeight: 176,
  },
  photoEmpty: {
    height: 176,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: `${Colors.warning}80`,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmptyText: { color: Colors.warningDark, fontWeight: '600', marginTop: 10 },
  clearPhoto: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtons: { flexDirection: 'row', gap: 10, marginTop: 14 },
  photoButton: { flex: 1 },
  descriptionWrap: { marginTop: 24 },
  descriptionTitle: { fontSize: 16, fontWeight: '700', color: Colors.ink, marginBottom: Spacing.sm },
  counter: { fontSize: 12, color: Colors.inkFaint, textAlign: 'right', marginTop: -8 },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    backgroundColor: Colors.surface,
  },
  notice: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  noticeText: {
    fontSize: 12.5,
    color: Colors.warningDark,
    fontWeight: '600',
    marginLeft: Spacing.sm,
    flex: 1,
  },
  footerRow: { flexDirection: 'row', gap: Spacing.md },
  backButton: { flex: 1 },
  nextButton: { flex: 2 },
});
