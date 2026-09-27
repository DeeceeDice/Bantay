import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BantayMap, MapCircle, MapMarker } from '../../src/components/map/BantayMap';
import { useMapController } from '../../src/components/map/useMapController';
import { Badge, Button, StatusBanner } from '../../src/components/ui';
import { HazardPhoto } from '../../src/components/ui/HazardPhoto';
import { HazardPin, SafeSpotPin, UserLocationDot } from '../../src/components/ui/Pins';
import { Sheet } from '../../src/components/ui/Sheet';
import { Geo } from '../../src/core/geo/latLng';
import { Colors, Radius, Shadow, Spacing } from '../../src/core/theme/colors';
import { Alert } from '../../src/core/utils/alert';
import {
  hazardLabelKey,
  safeSpotIcon,
  severityColor,
  severityIcon,
  severityLabelKey,
  statusColor,
} from '../../src/core/utils/hazardVisuals';
import { timeAgo } from '../../src/core/utils/timeAgo';
import { isAwaitingReview } from '../../src/data/models/enums';
import { SafetyCheckResult } from '../../src/data/models/types';
import { checkSafety } from '../../src/data/repositories/logic';
import { DEFAULT_CENTER } from '../../src/data/seed/seedData';
import { searchPlaces } from '../../src/data/seed/gazetteer';
import { useApp } from '../../src/state/appStore';
import { useUserLocation } from '../../src/state/LocationProvider';

/** The live hazard map: Bantay's home screen. */
export default function MapScreen(): React.ReactElement {
  const app = useApp();
  const { s, data, settings, user } = app;
  const location = useUserLocation();
  // Destructured so hooks can depend on the coordinate itself. `location` is
  // a fresh object each render, and `location.current` is a property access
  // the dependency checker cannot track.
  const { current: userPoint, hasRealFix } = location;
  const params = useLocalSearchParams<{ focusReport?: string; focusSpot?: string }>();

  // Initialised from the fix the splash screen already took, so there is no
  // need to re-centre in an effect - and no camera yank if the user has
  // already panned by the time a later fix arrives.
  const controller = useMapController({
    center: hasRealFix ? userPoint : DEFAULT_CENTER,
    zoom: 15.5,
  });
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [safety, setSafety] = useState<SafetyCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [query, setQuery] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // A deep link from Alerts or Safe Spots asks the map to focus something.
  // Reacting to a navigation param is exactly what an effect is for, and the
  // selection it sets is consumed on the next render rather than cascading.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (params.focusReport) {
      const report = data.reports.find((r) => r.id === params.focusReport);
      if (report) {
        controller.moveTo(report.location, 17);
        setSelectedReportId(report.id);
      }
      router.setParams({ focusReport: undefined });
    } else if (params.focusSpot) {
      const spot = data.safeSpots.find((sp) => sp.id === params.focusSpot);
      if (spot) {
        controller.moveTo(spot.location, 17);
        setSelectedSpotId(spot.id);
      }
      router.setParams({ focusSpot: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.focusReport, params.focusSpot]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const runSafetyCheck = useCallback(async () => {
    setChecking(true);
    setSafety(null);
    // A brief scan so the check reads as deliberate work rather than a banner
    // that blinks into existence.
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSafety(checkSafety(data.reports, userPoint, settings.alertRadiusKm * 1000));
    setChecking(false);
  }, [data.reports, userPoint, settings.alertRadiusKm]);

  const suggestions = useMemo(() => {
    if (query.trim().length === 0) return [];
    const places = searchPlaces(query, 4).map((p) => ({
      key: `place-${p.name}`,
      label: p.name,
      sub: p.area,
      location: p.location,
      icon: 'place' as const,
      color: Colors.brandBlue,
    }));
    const spots = data.safeSpots
      .filter((sp) => sp.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3)
      .map((sp) => ({
        key: `spot-${sp.id}`,
        label: sp.name,
        sub: sp.addressLabel,
        location: sp.location,
        icon: safeSpotIcon(sp.category),
        color: Colors.safe,
      }));
    return [...places, ...spots];
  }, [query, data.safeSpots]);

  const markers = useMemo<MapMarker[]>(() => {
    const out: MapMarker[] = [];

    if (settings.layers.includes('safe_spots')) {
      for (const spot of data.safeSpots) {
        out.push({
          id: `spot-${spot.id}`,
          point: spot.location,
          width: 38,
          height: 38,
          anchor: 'centre',
          onPress: () => {
            setSelectedSpotId(spot.id);
            setSelectedReportId(null);
          },
          render: () => (
            <SafeSpotPin category={spot.category} selected={selectedSpotId === spot.id} />
          ),
        });
      }
    }

    const pushHazard = (id: string): void => {
      const report = data.reports.find((r) => r.id === id);
      if (!report) return;
      out.push({
        id: `hazard-${report.id}`,
        point: report.location,
        width: 44,
        height: 53,
        onPress: () => {
          setSelectedReportId(report.id);
          setSelectedSpotId(null);
        },
        render: () => (
          <HazardPin
            type={report.type}
            status={report.status}
            selected={selectedReportId === report.id}
          />
        ),
      });
    };

    if (settings.layers.includes('pending_reports')) {
      data.reports.filter((r) => isAwaitingReview(r.status)).forEach((r) => pushHazard(r.id));
    }
    // Verified hazards last so they paint above pending ones: a confirmed
    // danger must never be hidden behind an unconfirmed report.
    if (settings.layers.includes('verified_hazards')) {
      data.reports.filter((r) => r.status === 'verified').forEach((r) => pushHazard(r.id));
    }

    out.push({
      id: 'user',
      point: userPoint,
      width: 22,
      height: 22,
      anchor: 'centre',
      render: () => <UserLocationDot stale={!hasRealFix} />,
    });

    return out;
  }, [
    data.reports,
    data.safeSpots,
    settings.layers,
    selectedReportId,
    selectedSpotId,
    userPoint,
    hasRealFix,
  ]);

  const circles = useMemo<MapCircle[]>(() => {
    if (!safety) return [];
    const tint = safety.isSafe ? Colors.safe : Colors.warning;
    return [
      {
        center: userPoint,
        radiusMeters: settings.alertRadiusKm * 1000,
        color: `${tint}1A`,
        borderColor: `${tint}80`,
      },
    ];
  }, [safety, userPoint, settings.alertRadiusKm]);

  const selectedReport = data.reports.find((r) => r.id === selectedReportId) ?? null;
  const selectedSpot = data.safeSpots.find((sp) => sp.id === selectedSpotId) ?? null;
  const activeFilters =
    (!settings.layers.includes('pending_reports') ? 1 : 0) +
    (!settings.layers.includes('safe_spots') ? 1 : 0);

  return (
    <View style={styles.container}>
      <BantayMap
        controller={controller}
        markers={markers}
        circles={circles}
        onPress={() => {
          setSelectedReportId(null);
          setSelectedSpotId(null);
        }}
        testID="bantay-map"
      />

      <SafeAreaView style={styles.topOverlay} edges={['top']} pointerEvents="box-none">
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={22} color={Colors.inkMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={s('searchHint')}
            placeholderTextColor={Colors.inkFaint}
            accessibilityLabel={s('searchHint')}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={10}>
              <MaterialIcons name="close" size={19} color={Colors.inkMuted} />
            </Pressable>
          )}
          <Pressable onPress={() => setFiltersOpen(true)} hitSlop={10} style={styles.filterBtn}>
            <MaterialIcons name="tune" size={22} color={Colors.brandBlue} />
            {activeFilters > 0 && (
              <View style={styles.filterDot}>
                <Text style={styles.filterDotText}>{activeFilters}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((item) => (
              <Pressable
                key={item.key}
                style={styles.suggestion}
                onPress={() => {
                  controller.moveTo(item.location, 16.5);
                  setQuery('');
                }}
              >
                <MaterialIcons name={item.icon} size={18} color={item.color} />
                <View style={styles.suggestionBody}>
                  <Text style={styles.suggestionLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={styles.suggestionSub} numberOfLines={1}>
                    {item.sub}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {user?.status === 'suspended' ? (
          <View style={styles.bannerWrap}>
            <StatusBanner
              icon="block"
              title={s('accountSuspendedTitle')}
              message={s('accountSuspendedBody')}
              color={Colors.brandRed}
            />
          </View>
        ) : (
          !hasRealFix && (
            <View style={styles.bannerWrap}>
              <StatusBanner
                icon="location-off"
                title={s('locationDeniedNotice')}
                color={Colors.brandBlue}
              />
            </View>
          )
        )}
      </SafeAreaView>

      {(safety || checking) && (
        <View style={styles.safetyBanner} pointerEvents="box-none">
          <StatusBanner
            icon={checking ? 'radar' : safety?.isSafe ? 'verified-user' : 'warning'}
            title={
              checking
                ? s('checkingSurroundings')
                : safety?.isSafe
                  ? s('safeZoneTitle')
                  : s('hazardNearbyTitle')
            }
            message={
              checking
                ? undefined
                : safety?.isSafe
                  ? s('safeZoneBody')
                  : `${safety?.hazards.length} - ${Geo.formatDistance(safety?.nearestDistanceMeters ?? 0)}`
            }
            color={
              checking
                ? Colors.brandBlue
                : safety?.isSafe
                  ? Colors.safe
                  : severityColor(safety?.worstSeverity ?? 'not_passable')
            }
            onDismiss={checking ? undefined : () => setSafety(null)}
            action={
              !checking && safety && !safety.isSafe && safety.nearest ? (
                <Pressable
                  onPress={() => {
                    controller.moveTo(safety.nearest!.location, 17);
                    setSelectedReportId(safety.nearest!.id);
                  }}
                  style={styles.bannerAction}
                >
                  <Text style={styles.bannerActionText}>{s('jumpToHazard')}</Text>
                </Pressable>
              ) : undefined
            }
          />
        </View>
      )}

      <View style={styles.mapControls} pointerEvents="box-none">
        <MapButton
          icon="my-location"
          onPress={() => {
            void location.refresh();
            controller.moveTo(userPoint, 16);
          }}
        />
        <MapButton icon="add" small onPress={() => controller.zoomBy(1)} />
        <MapButton icon="remove" small onPress={() => controller.zoomBy(-1)} />
      </View>

      <View style={styles.bottomBar} pointerEvents="box-none">
        <Pressable
          onPress={checking ? undefined : runSafetyCheck}
          style={styles.safetyButton}
          accessibilityRole="button"
        >
          <MaterialIcons name="shield" size={21} color={Colors.brandBlue} />
          <Text style={styles.safetyLabel} numberOfLines={1}>
            {checking ? s('checkingSurroundings') : s('amISafeHere')}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/report')}
          style={styles.fab}
          accessibilityRole="button"
          accessibilityLabel={s('reportHazard')}
        >
          <MaterialIcons name="add" size={30} color={Colors.white} />
        </Pressable>
      </View>

      {/* Hazard detail sheet: the community verification loop lives here. */}
      <Sheet visible={!!selectedReport} onClose={() => setSelectedReportId(null)}>
        {selectedReport && (
          <View>
            <View style={styles.sheetHeader}>
              <View
                style={[
                  styles.sheetIcon,
                  { backgroundColor: `${statusColor(selectedReport.status)}1F` },
                ]}
              >
                <MaterialIcons
                  name={severityIcon(selectedReport.severity)}
                  size={24}
                  color={statusColor(selectedReport.status)}
                />
              </View>
              <View style={styles.sheetTitleBox}>
                <Text style={styles.sheetTitle}>{s(hazardLabelKey(selectedReport.type))}</Text>
                <Text style={styles.sheetSub}>{selectedReport.addressLabel}</Text>
              </View>
            </View>

            <View style={styles.badgeRow}>
              <Badge
                label={
                  selectedReport.status === 'verified' ? s('verifiedBadge') : s('pendingBadge')
                }
                color={statusColor(selectedReport.status)}
                icon={selectedReport.status === 'verified' ? 'verified' : 'schedule'}
                filled={selectedReport.status === 'verified'}
              />
              <Badge
                label={s(severityLabelKey(selectedReport.severity))}
                color={severityColor(selectedReport.severity)}
                icon={severityIcon(selectedReport.severity)}
              />
              <Badge
                label={Geo.formatDistance(
                  Geo.distanceMeters(userPoint, selectedReport.location),
                )}
                color={Colors.brandBlue}
                icon="near-me"
              />
            </View>

            <View style={styles.photoBox}>
              <HazardPhoto uri={selectedReport.photoUri} type={selectedReport.type} height={170} />
            </View>

            {selectedReport.description.length > 0 && (
              <Text style={styles.description}>{selectedReport.description}</Text>
            )}
            <Text style={styles.meta}>
              {timeAgo(selectedReport.reportedAt, settings.language)} ·{' '}
              {s('reportedBy')} {selectedReport.reporterName}
            </Text>
            {selectedReport.verifiedBy && (
              <Text style={[styles.meta, { color: Colors.safeDark }]}>
                {s('verifiedByLabel')} {selectedReport.verifiedBy}
              </Text>
            )}

            <View style={styles.votePanel}>
              <View style={styles.voteHeader}>
                <Text style={styles.voteTitle}>{s('stillThereQuestion')}</Text>
                <Text style={styles.voteCount}>
                  {selectedReport.confirmCount} {s('confirmations')}
                </Text>
              </View>
              {user && selectedReport.votedUserIds.includes(user.id) ? (
                <Text style={styles.voted}>{s('thanksForConfirming')}</Text>
              ) : (
                <View style={styles.voteButtons}>
                  <Button
                    label={s('yes')}
                    variant="outline"
                    icon="thumb-up-off-alt"
                    color={Colors.safe}
                    style={styles.voteButton}
                    onPress={() => void app.voteOnReport(selectedReport.id, true)}
                  />
                  <Button
                    label={s('no')}
                    variant="outline"
                    icon="thumb-down-off-alt"
                    color={Colors.inkMuted}
                    style={styles.voteButton}
                    onPress={() => void app.voteOnReport(selectedReport.id, false)}
                  />
                </View>
              )}
            </View>

            <Button
              label={s('getDirections')}
              icon="directions"
              style={styles.sheetAction}
              onPress={() => {
                const target = selectedReport;
                setSelectedReportId(null);
                router.push({
                  pathname: '/directions',
                  params: {
                    lat: String(target.location.lat),
                    lng: String(target.location.lng),
                    label: target.addressLabel,
                  },
                });
              }}
            />
            <Button
              label={s('reportInaccurate')}
              variant="text"
              icon="flag"
              color={Colors.inkMuted}
              onPress={() => {
                void app.flagReport(selectedReport.id);
                Alert.alert(s('flaggedForReview'));
              }}
            />
          </View>
        )}
      </Sheet>

      {/* Safe spot sheet. */}
      <Sheet visible={!!selectedSpot} onClose={() => setSelectedSpotId(null)}>
        {selectedSpot && (
          <View>
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetIcon, { backgroundColor: Colors.safeLight }]}>
                <MaterialIcons
                  name={safeSpotIcon(selectedSpot.category)}
                  size={24}
                  color={Colors.safeDark}
                />
              </View>
              <View style={styles.sheetTitleBox}>
                <Text style={styles.sheetTitle}>{selectedSpot.name}</Text>
                <Text style={styles.sheetSub}>{selectedSpot.addressLabel}</Text>
              </View>
            </View>
            <View style={styles.badgeRow}>
              <Badge
                label={selectedSpot.isOpenNow ? s('openNow') : s('closedNow')}
                color={selectedSpot.isOpenNow ? Colors.safe : Colors.inkMuted}
                icon={selectedSpot.isOpenNow ? 'check-circle' : 'schedule'}
                filled={selectedSpot.isOpenNow}
              />
              <Badge
                label={Geo.formatDistance(
                  Geo.distanceMeters(userPoint, selectedSpot.location),
                )}
                color={Colors.brandBlue}
                icon="near-me"
              />
            </View>
            <Text style={styles.description}>{selectedSpot.description}</Text>
            <Button
              label={s('getDirections')}
              icon="directions"
              style={styles.sheetAction}
              onPress={() => {
                const target = selectedSpot;
                setSelectedSpotId(null);
                router.push({
                  pathname: '/directions',
                  params: {
                    lat: String(target.location.lat),
                    lng: String(target.location.lng),
                    label: target.name,
                  },
                });
              }}
            />
          </View>
        )}
      </Sheet>

      {/* Map layer filters. */}
      <Sheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} scrollable={false}>
        <Text style={styles.sheetTitle}>{s('filters')}</Text>
        <FilterRow
          label={s('showVerifiedOnly')}
          value={!settings.layers.includes('pending_reports')}
          onToggle={(v) => void app.setVerifiedOnly(v)}
        />
        <FilterRow
          label={s('showSafeSpots')}
          value={settings.layers.includes('safe_spots')}
          onToggle={() => void app.toggleLayer('safe_spots')}
        />
        <Button label={s('done')} onPress={() => setFiltersOpen(false)} style={styles.sheetAction} />
      </Sheet>
    </View>
  );
}

function MapButton({
  icon,
  onPress,
  small = false,
}: {
  icon: 'my-location' | 'add' | 'remove';
  onPress: () => void;
  small?: boolean;
}): React.ReactElement {
  const size = small ? 38 : 46;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.mapButton, { width: size, height: size, borderRadius: size / 2 }]}
      accessibilityRole="button"
    >
      <MaterialIcons name={icon} size={small ? 20 : 23} color={Colors.brandBlue} />
    </Pressable>
  );
}

function FilterRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: (next: boolean) => void;
}): React.ReactElement {
  return (
    <Pressable
      style={styles.filterRow}
      onPress={() => onToggle(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <Text style={styles.filterLabel}>{label}</Text>
      <MaterialIcons
        name={value ? 'toggle-on' : 'toggle-off'}
        size={34}
        color={value ? Colors.safe : Colors.inkFaint}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surfaceAlt },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, padding: Spacing.lg },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm + 4,
    paddingHorizontal: Spacing.md,
    height: 50,
    ...Shadow.floating,
  },
  searchInput: { flex: 1, fontSize: 15.5, color: Colors.ink, marginHorizontal: Spacing.sm },
  filterBtn: { paddingLeft: Spacing.md, borderLeftWidth: 1, borderLeftColor: Colors.line },
  filterDot: {
    position: 'absolute',
    right: -4,
    top: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.brandRed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterDotText: { color: Colors.white, fontSize: 9.5, fontWeight: '800' },
  suggestions: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm + 4,
    marginTop: Spacing.sm,
    ...Shadow.floating,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line,
  },
  suggestionBody: { flex: 1, marginLeft: Spacing.md },
  suggestionLabel: { fontSize: 15, fontWeight: '700', color: Colors.ink },
  suggestionSub: { fontSize: 12.5, color: Colors.inkMuted },
  bannerWrap: { marginTop: Spacing.md },
  safetyBanner: { position: 'absolute', left: Spacing.lg, right: 76, bottom: 172 },
  bannerAction: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  bannerActionText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  mapControls: { position: 'absolute', right: Spacing.lg, bottom: 104, alignItems: 'center' },
  mapButton: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    ...Shadow.floating,
  },
  bottomBar: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.xxl,
    flexDirection: 'row',
    alignItems: 'center',
  },
  safetyButton: {
    flex: 1,
    height: 54,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1.6,
    borderColor: Colors.brandBlue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.floating,
  },
  safetyLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.brandBlue,
    marginLeft: Spacing.sm,
  },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.brandRed,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
    ...Shadow.floating,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  sheetIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetTitleBox: { flex: 1, marginLeft: Spacing.md },
  sheetTitle: { fontSize: 19, fontWeight: '700', color: Colors.ink },
  sheetSub: { fontSize: 14, color: Colors.inkMuted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.lg },
  photoBox: { marginTop: Spacing.lg, borderRadius: Radius.md, overflow: 'hidden' },
  description: { fontSize: 15, lineHeight: 22, color: Colors.ink, marginTop: Spacing.md },
  meta: { fontSize: 12.5, color: Colors.inkMuted, marginTop: 6 },
  votePanel: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  voteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  voteTitle: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  voteCount: { fontSize: 13, fontWeight: '700', color: Colors.safe },
  voted: { color: Colors.safeDark, fontWeight: '600', marginTop: Spacing.md },
  voteButtons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  voteButton: { flex: 1 },
  sheetAction: { marginTop: Spacing.lg },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  filterLabel: { fontSize: 16, fontWeight: '600', color: Colors.ink, flex: 1 },
});
