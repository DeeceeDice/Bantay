import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBar, Badge, Card, EmptyState } from '../../src/components/ui';
import { Geo } from '../../src/core/geo/latLng';
import { Colors, Radius, Spacing } from '../../src/core/theme/colors';
import { safeSpotIcon, safeSpotLabelKey } from '../../src/core/utils/hazardVisuals';
import { formatDuration } from '../../src/core/utils/timeAgo';
import { SAFE_SPOT_CATEGORIES, SafeSpotCategory } from '../../src/data/models/enums';
import { safeSpotsNear } from '../../src/data/repositories/logic';
import { useApp } from '../../src/state/appStore';
import { useUserLocation } from '../../src/state/LocationProvider';

/** Browsable list of verified shelters, nearest first. */
export default function SafeSpotsScreen(): React.ReactElement {
  const { s, data, settings, toggleSubscription } = useApp();
  const location = useUserLocation();
  const [category, setCategory] = useState<SafeSpotCategory | null>(null);

  const spots = safeSpotsNear(data.safeSpots, location.current, category);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppBar title={s('safeSpots')} />
      <View style={styles.body}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipsRow}
        >
          <Chip
            label={s('allCategories')}
            icon="apps"
            selected={category === null}
            onPress={() => setCategory(null)}
          />
          {SAFE_SPOT_CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={s(safeSpotLabelKey(c))}
              icon={safeSpotIcon(c)}
              selected={category === c}
              onPress={() => setCategory(category === c ? null : c)}
            />
          ))}
        </ScrollView>

        {spots.length === 0 ? (
          <EmptyState icon="shield" message={s('noSafeSpots')} />
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {spots.map((spot) => {
              const metres = Geo.distanceMeters(location.current, spot.location);
              const subscribed = data.subscribedSpotIds.includes(spot.id);
              return (
                <Card
                  key={spot.id}
                  style={styles.card}
                  onPress={() =>
                    router.push({ pathname: '/(tabs)', params: { focusSpot: spot.id } })
                  }
                >
                  <View style={styles.cardRow}>
                    <View style={styles.cardIcon}>
                      <MaterialIcons
                        name={safeSpotIcon(spot.category)}
                        size={27}
                        color={Colors.safeDark}
                      />
                    </View>
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{spot.name}</Text>
                      <Text style={styles.cardSub} numberOfLines={1}>
                        {spot.addressLabel}
                      </Text>
                      <View style={styles.badges}>
                        <Badge
                          label={spot.isOpenNow ? s('openNow') : s('closedNow')}
                          color={spot.isOpenNow ? Colors.safe : Colors.inkMuted}
                          icon={spot.isOpenNow ? 'check-circle' : 'schedule'}
                          compact
                        />
                        <Badge
                          label={Geo.formatDistance(metres)}
                          color={Colors.brandBlue}
                          icon="near-me"
                          compact
                        />
                        <Badge
                          label={`${formatDuration(Geo.walkingTimeSeconds(metres), settings.language)} ${s('walk')}`}
                          color={Colors.brandBlue}
                          icon="directions-walk"
                          compact
                        />
                      </View>
                    </View>
                    <Pressable
                      onPress={() => void toggleSubscription(spot.id)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={subscribed ? s('subscribed') : s('subscribe')}
                    >
                      <MaterialIcons
                        name={subscribed ? 'notifications-active' : 'notifications-none'}
                        size={24}
                        color={subscribed ? Colors.safeDark : Colors.inkFaint}
                      />
                    </Pressable>
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

function Chip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  selected: boolean;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? Colors.brandBlue : Colors.surface,
          borderColor: selected ? Colors.brandBlue : Colors.line,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <MaterialIcons
        name={icon}
        size={16}
        color={selected ? Colors.white : Colors.inkMuted}
      />
      <Text style={[styles.chipText, { color: selected ? Colors.white : Colors.ink }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  body: { flex: 1, backgroundColor: Colors.surfaceAlt },
  chipsRow: { maxHeight: 54, flexGrow: 0 },
  chips: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
    height: 38,
    paddingHorizontal: 14,
  },
  chipText: { fontSize: 13, fontWeight: '700', marginLeft: 7 },
  list: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl, gap: 12 },
  card: { padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  cardIcon: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: Colors.safeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, marginHorizontal: 13 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  cardSub: { fontSize: 12.5, color: Colors.inkFaint, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
});
