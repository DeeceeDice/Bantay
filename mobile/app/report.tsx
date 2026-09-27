import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BantayMap } from '../src/components/map/BantayMap';
import { useMapController } from '../src/components/map/useMapController';
import { Button, StatusBanner } from '../src/components/ui';
import { HazardPhoto } from '../src/components/ui/HazardPhoto';
import { Field } from '../src/components/ui/AuthScaffold';
import { PlacementPin } from '../src/components/ui/Pins';
import { LatLng } from '../src/core/geo/latLng';
import { Colors, Radius, Spacing } from '../src/core/theme/colors';
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
import { describePoint } from '../src/data/seed/gazetteer';
import { useApp } from '../src/state/appStore';
import { useUserLocation } from '../src/state/LocationProvider';

const STEP_COUNT = 4;
const MAX_DESCRIPTION = 140;

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

  const controller = useMapController({ center: location.current, zoom: 17 });
  const addressLabel = describePoint(point);

  // The database refuses a suspended account's report; say so up front
  // rather than after four steps of filling it in.
  if (user?.status === 'suspended') {
    return (
      <View style={styles.suspended}>
        <StatusBanner
          icon="block"
          title={s('accountSuspendedTitle')}
          message={s('accountSuspendedBody')}
          color={Colors.brandRed}
        />
      </View>
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

    Alert.alert(s('reportSubmittedTitle'), s('reportSubmittedBody'), [
      {
        text: s('backToMap'),
        onPress: () =>
          router.replace({ pathname: '/(tabs)', params: { focusReport: report.id } }),
      },
    ]);
  };

  const back = (): void => {
    if (step === 0) {
      router.back();
      return;
    }
    setStep(step - 1);
  };

  return (
    <View style={styles.container}>
      <View style={styles.progress}>
        <Text style={styles.stepLabel}>
          {s('step')} {step + 1}/{STEP_COUNT}
        </Text>
        <View style={styles.bars}>
          {Array.from({ length: STEP_COUNT }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                { backgroundColor: i <= step ? Colors.brandRed : Colors.line },
              ]}
            />
          ))}
        </View>
      </View>

      {step === 0 && (
        <View style={styles.flex}>
          <View style={styles.intro}>
            <Text style={styles.title}>{s('stepLocationTitle')}</Text>
            <Text style={styles.body}>{s('stepLocationBody')}</Text>
          </View>
          <View style={styles.mapWrap}>
            <BantayMap
              controller={controller}
              onCameraChange={(camera) => setPoint(camera.center)}
            />
            {/* The pin is fixed to the centre and the map moves under it,
                which is far easier one-handed than dragging a small target. */}
            <View style={styles.pinOverlay} pointerEvents="none">
              <PlacementPin />
            </View>
          </View>
          <View style={styles.addressBar}>
            <MaterialIcons name="place" size={20} color={Colors.brandRed} />
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
                color={severityColor(sev)}
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
                <HazardPhoto uri={photoUri} type={type ?? 'other'} height={220} />
                <Pressable style={styles.clearPhoto} onPress={() => setPhotoUri(null)} hitSlop={8}>
                  <MaterialIcons name="close" size={19} color={Colors.white} />
                </Pressable>
              </>
            ) : (
              <View style={styles.photoEmpty}>
                <MaterialIcons name="add-a-photo" size={42} color={Colors.warningDark} />
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
            <Field
              label={`${s('descriptionOptional')} (${description.length}/${MAX_DESCRIPTION})`}
              value={description}
              onChangeText={setDescription}
              placeholder={s('descriptionHint')}
              maxLength={MAX_DESCRIPTION}
              multiline
            />
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
          <Button
            label={s('back')}
            variant="outline"
            style={styles.backButton}
            onPress={back}
            disabled={busy}
          />
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
    </View>
  );
}

function OptionCard({
  selected,
  icon,
  title,
  color,
  onPress,
}: {
  selected: boolean;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  color: string;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.option,
        {
          backgroundColor: selected ? `${color}14` : Colors.surface,
          borderColor: selected ? color : Colors.line,
          borderWidth: selected ? 2 : 1,
        },
      ]}
    >
      <View
        style={[styles.optionIcon, { backgroundColor: selected ? color : Colors.surfaceAlt }]}
      >
        <MaterialIcons name={icon} size={23} color={selected ? Colors.white : Colors.inkMuted} />
      </View>
      <Text style={styles.optionTitle}>{title}</Text>
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
  container: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },
  progress: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  stepLabel: { fontSize: 12, fontWeight: '700', color: Colors.inkMuted },
  bars: { flexDirection: 'row', gap: 5, marginTop: Spacing.sm },
  bar: { flex: 1, height: 5, borderRadius: 3 },
  intro: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md },
  scroll: { padding: Spacing.xl, paddingBottom: Spacing.xxl },
  title: { fontSize: 22, fontWeight: '800', color: Colors.ink },
  body: { fontSize: 14.5, color: Colors.inkMuted, marginTop: 6, lineHeight: 21 },
  mapWrap: { flex: 1, overflow: 'hidden' },
  pinOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 52,
  },
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
  },
  addressBody: { flex: 1, marginLeft: Spacing.md },
  addressLabel: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  addressCoords: { fontSize: 12, color: Colors.inkMuted, marginTop: 2 },
  options: { marginTop: Spacing.xl, gap: Spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  optionIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.ink, marginHorizontal: Spacing.md },
  photoFrame: {
    marginTop: Spacing.lg,
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
  photoEmptyText: { color: Colors.warningDark, fontWeight: '600', marginTop: Spacing.sm },
  clearPhoto: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoButtons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
  photoButton: { flex: 1 },
  descriptionWrap: { marginTop: Spacing.xl },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    backgroundColor: Colors.surface,
  },
  notice: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
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
