import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Shadow } from '../../core/theme/colors';
import { GoogleMapType, loadGoogleTiles } from '../../data/google/googleTiles';
import { CARTO_VOYAGER, TileSource } from './tileSource';

/**
 * Tiles for the pin-placement maps: Google's roadmap or satellite imagery
 * when the key may use the Map Tiles API, else the CARTO basemap.
 *
 * `googleAvailable` is only true once Google has actually issued a session,
 * so the Map / Satellite switch never appears unless both work.
 */
export function usePlacementTiles(): {
  source: TileSource;
  mapType: GoogleMapType;
  setMapType: (type: GoogleMapType) => void;
  googleAvailable: boolean;
} {
  const [mapType, setMapType] = useState<GoogleMapType>('roadmap');
  const [loaded, setLoaded] = useState<Partial<Record<GoogleMapType, TileSource | null>>>({});

  useEffect(() => {
    let live = true;
    void loadGoogleTiles(mapType).then((source) => {
      if (live) setLoaded((prev) => ({ ...prev, [mapType]: source }));
    });
    return () => {
      live = false;
    };
  }, [mapType]);

  return {
    source: loaded[mapType] ?? loaded.roadmap ?? CARTO_VOYAGER,
    mapType,
    setMapType,
    googleAvailable: !!loaded.roadmap,
  };
}

/** Map / Satellite switch, shown over a placement map. */
export function MapTypeToggle({
  value,
  onChange,
  labels,
  style,
}: {
  value: GoogleMapType;
  onChange: (type: GoogleMapType) => void;
  labels: Record<GoogleMapType, string>;
  style?: object;
}): React.ReactElement {
  return (
    <View style={[styles.toggle, style]}>
      {(['roadmap', 'satellite'] as const).map((type) => {
        const on = value === type;
        return (
          <Pressable
            key={type}
            onPress={() => onChange(type)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[styles.option, on && styles.optionOn]}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{labels[type]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: 3,
    ...Shadow.card,
  },
  option: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.sm - 2 },
  optionOn: { backgroundColor: Colors.brandBlue },
  label: { fontSize: 13, fontWeight: '700', color: Colors.inkMuted },
  labelOn: { color: Colors.white },
});
