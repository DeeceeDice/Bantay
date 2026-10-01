import React, { useEffect, useRef, useState } from 'react';
import {
  GestureResponderEvent,
  Image,
  LayoutChangeEvent,
  PanResponder,
  PanResponderGestureState,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { LatLng } from '../../core/geo/latLng';
import {
  MapCamera,
  TILE_SIZE,
  anchored,
  isVisible,
  metersToPixels,
  toLatLng,
  toScreen,
  topLeftWorld,
} from '../../core/map/mapCamera';
import { isWeb } from '../../core/platform/web';
import { Colors } from '../../core/theme/colors';
import { MapController } from './useMapController';
import { CARTO_VOYAGER, TileSource, tileImageSource } from './tileSource';

export type MarkerAnchor = 'bottom-centre' | 'centre';

export interface MapMarker {
  id: string;
  point: LatLng;
  width: number;
  height: number;
  anchor?: MarkerAnchor;
  onPress?: () => void;
  render: () => React.ReactNode;
}

export interface MapPolyline {
  points: readonly LatLng[];
  color: string;
  width?: number;
  borderColor?: string;
  borderWidth?: number;
  dashed?: boolean;
}

/** A circle whose radius is in real-world meters, e.g. the alert radius. */
export interface MapCircle {
  center: LatLng;
  radiusMeters: number;
  color: string;
  borderColor?: string;
  borderWidth?: number;
}

export interface BantayMapProps {
  controller: MapController;
  markers?: MapMarker[];
  polylines?: MapPolyline[];
  circles?: MapCircle[];
  tileSource?: TileSource;
  interactive?: boolean;
  showAttribution?: boolean;
  dimTiles?: boolean;
  onPress?: (point: LatLng) => void;
  onCameraChange?: (camera: MapCamera) => void;
  testID?: string;
}

const distanceBetweenTouches = (event: GestureResponderEvent): number => {
  const touches = event.nativeEvent.touches;
  if (touches.length < 2) return 0;
  return Math.hypot(
    touches[0].pageX - touches[1].pageX,
    touches[0].pageY - touches[1].pageY,
  );
};

/**
 * An interactive slippy map.
 *
 * Bantay draws its own map rather than embedding a vendor SDK so the app has
 * no API-key requirement, no per-view billing, and identical behaviour on
 * Android, iOS and web. Tiles are rendered from the nearest integer zoom and
 * scaled to the fractional zoom, exactly as every slippy map does.
 *
 * Pan and pinch both route through `anchored`, so a one-finger drag and a
 * two-finger pinch are the same code path and compose correctly.
 */
export function BantayMap({
  controller,
  markers = [],
  polylines = [],
  circles = [],
  tileSource = CARTO_VOYAGER,
  interactive = true,
  showAttribution = true,
  dimTiles = false,
  onPress,
  onCameraChange,
  testID,
}: BantayMapProps): React.ReactElement {
  const camera = controller.camera;
  const gesture = useRef({
    anchor: null as LatLng | null,
    startZoom: 15,
    startDistance: 0,
    moved: false,
  });

  // Gesture handlers are created once but must see the latest camera and
  // callbacks. This ref is written in an effect and read only inside those
  // handlers, so nothing touches it during render.
  const live = useRef({ controller, onPress, onCameraChange, interactive });
  useEffect(() => {
    live.current = { controller, onPress, onCameraChange, interactive };
  }, [controller, onPress, onCameraChange, interactive]);

  // In a browser there is no pinch: the mouse wheel zooms about the cursor,
  // through the same `anchored` maths as a pinch so the spot under the
  // pointer stays put.
  const containerRef = useRef<View>(null);
  useEffect(() => {
    if (!isWeb || !interactive) return;
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') return;
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const focal = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const { controller: map, onCameraChange: changed } = live.current;
      const cam = map.camera;
      const next = anchored(cam, toLatLng(cam, focal), focal, cam.zoom - event.deltaY * 0.0025);
      map.applyCamera(next);
      changed?.(next);
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [interactive]);

  const onLayout = (event: LayoutChangeEvent): void => {
    const { width, height } = event.nativeEvent.layout;
    controller.setSize({ width, height });
  };

  // `PanResponder.create` stores these handlers; it never calls them. Every
  // `live.current` and `gesture.current` read happens inside a touch event,
  // which is exactly where reading a ref is correct. The rule cannot see
  // that and flags any ref captured by a function argument, so it is
  // disabled here specifically rather than worked around in a way that would
  // make the gesture code worse.
  // eslint-disable-next-line react-hooks/refs
  const [panResponder] = useState(() =>
    PanResponder.create({
        onStartShouldSetPanResponder: () => live.current.interactive,
      onMoveShouldSetPanResponder: () => live.current.interactive,

        onPanResponderGrant: (event: GestureResponderEvent) => {
          const { locationX, locationY } = event.nativeEvent;
          const cam = live.current.controller.camera;
          gesture.current = {
            anchor: toLatLng(cam, { x: locationX, y: locationY }),
            startZoom: cam.zoom,
            startDistance: distanceBetweenTouches(event),
            moved: false,
          };
        },

        onPanResponderMove: (
          event: GestureResponderEvent,
          state: PanResponderGestureState,
        ) => {
          const g = gesture.current;
          if (!g.anchor) return;
          if (Math.abs(state.dx) > 4 || Math.abs(state.dy) > 4) g.moved = true;

          const touches = event.nativeEvent.touches;
          let targetZoom = g.startZoom;
          let focal = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };

          if (touches.length >= 2) {
            const current = distanceBetweenTouches(event);
            if (g.startDistance > 0 && current > 0) {
              targetZoom = g.startZoom + Math.log2(current / g.startDistance);
              g.moved = true;
            }
            // Pinch focal point, in the map's own coordinate space.
            focal = {
              x: (touches[0].locationX + touches[1].locationX) / 2,
              y: (touches[0].locationY + touches[1].locationY) / 2,
            };
          }

          const next = anchored(live.current.controller.camera, g.anchor, focal, targetZoom);
          live.current.controller.applyCamera(next);
          live.current.onCameraChange?.(next);
        },

        onPanResponderRelease: (event: GestureResponderEvent) => {
          const g = gesture.current;
          // A press that never moved is a tap, not a drag.
          const handlePress = live.current.onPress;
          if (!g.moved && handlePress) {
            const { locationX, locationY } = event.nativeEvent;
            handlePress(
              toLatLng(live.current.controller.camera, { x: locationX, y: locationY }),
            );
          }
          gesture.current = { anchor: null, startZoom: 15, startDistance: 0, moved: false };
        },

        onPanResponderTerminate: () => {
          gesture.current = { anchor: null, startZoom: 15, startDistance: 0, moved: false };
        },
      }),
  );

  const hasViewport = camera.size.width > 0 && camera.size.height > 0;

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onLayout={onLayout}
      testID={testID}
      {...(interactive ? panResponder.panHandlers : {})}
    >
      <View style={styles.background} />
      {hasViewport && <TileLayer camera={camera} source={tileSource} />}
      {hasViewport && dimTiles && <View style={styles.dim} pointerEvents="none" />}
      {hasViewport && (circles.length > 0 || polylines.length > 0) && (
        <VectorLayer camera={camera} polylines={polylines} circles={circles} />
      )}
      {hasViewport &&
        markers.map((marker) => {
          if (!isVisible(camera, marker.point, Math.max(marker.width, marker.height))) {
            return null;
          }
          const screen = toScreen(camera, marker.point);
          const anchorOffset =
            (marker.anchor ?? 'bottom-centre') === 'centre'
              ? { x: marker.width / 2, y: marker.height / 2 }
              : { x: marker.width / 2, y: marker.height };

          return (
            <View
              key={marker.id}
              pointerEvents={marker.onPress ? 'box-none' : 'none'}
              style={[
                styles.marker,
                {
                  left: screen.x - anchorOffset.x,
                  top: screen.y - anchorOffset.y,
                  width: marker.width,
                  height: marker.height,
                },
              ]}
            >
              {marker.onPress ? (
                <View
                  style={styles.fill}
                  onStartShouldSetResponder={() => true}
                  onResponderRelease={marker.onPress}
                >
                  {marker.render()}
                </View>
              ) : (
                marker.render()
              )}
            </View>
          );
        })}
      {showAttribution && (
        <View style={styles.attribution} pointerEvents="none">
          <Text style={styles.attributionText}>{tileSource.attribution}</Text>
        </View>
      )}
    </View>
  );
}

/** Renders the visible raster tiles for the current camera. */
function TileLayer({
  camera,
  source,
}: {
  camera: MapCamera;
  source: TileSource;
}): React.ReactElement {
  // Render whole tiles from the nearest integer zoom and scale them to the
  // fractional zoom, which is what every slippy map does during a pinch.
  const z = Math.min(source.maxZoom, Math.max(source.minZoom, Math.floor(camera.zoom)));
  const scale = Math.pow(2, camera.zoom - z);
  const tileScreenSize = TILE_SIZE * scale;
  const tileCount = 1 << z;

  const topLeft = topLeftWorld(camera);
  const topLeftAtZ = { x: topLeft.x / scale, y: topLeft.y / scale };

  const firstX = Math.floor(topLeftAtZ.x / TILE_SIZE);
  const firstY = Math.floor(topLeftAtZ.y / TILE_SIZE);
  const lastX = Math.floor((topLeftAtZ.x + camera.size.width / scale) / TILE_SIZE);
  const lastY = Math.floor((topLeftAtZ.y + camera.size.height / scale) / TILE_SIZE);

  const tiles: React.ReactNode[] = [];
  for (let y = firstY; y <= lastY; y++) {
    // Rows outside the world have no tiles; columns wrap around instead.
    if (y < 0 || y >= tileCount) continue;
    for (let x = firstX; x <= lastX; x++) {
      const wrappedX = ((x % tileCount) + tileCount) % tileCount;
      tiles.push(
        <Image
          key={`${z}/${wrappedX}/${y}`}
          source={tileImageSource(source, wrappedX, y, z)}
          style={{
            position: 'absolute',
            left: (x * TILE_SIZE - topLeftAtZ.x) * scale,
            top: (y * TILE_SIZE - topLeftAtZ.y) * scale,
            // A hairline of overlap hides the seams rounding would otherwise
            // leave between adjacent tiles.
            width: tileScreenSize + 1,
            height: tileScreenSize + 1,
          }}
          fadeDuration={0}
        />,
      );
    }
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {tiles}
    </View>
  );
}

/** Paints polylines and metre-radius circles in screen space. */
function VectorLayer({
  camera,
  polylines,
  circles,
}: {
  camera: MapCamera;
  polylines: MapPolyline[];
  circles: MapCircle[];
}): React.ReactElement {
  const toPath = (points: readonly LatLng[]): string =>
    points
      .map((p, i) => {
        const s = toScreen(camera, p);
        return `${i === 0 ? 'M' : 'L'}${s.x.toFixed(1)},${s.y.toFixed(1)}`;
      })
      .join(' ');

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width={camera.size.width}
      height={camera.size.height}
      pointerEvents="none"
    >
      {circles.map((circle, i) => {
        const centre = toScreen(camera, circle.center);
        const radius = metersToPixels(camera, circle.center, circle.radiusMeters);
        if (!Number.isFinite(radius) || radius <= 0) return null;
        return (
          <Circle
            key={`circle-${i}`}
            cx={centre.x}
            cy={centre.y}
            r={radius}
            fill={circle.color}
            stroke={circle.borderColor}
            strokeWidth={circle.borderWidth ?? 2}
          />
        );
      })}
      {polylines.map((line, i) => {
        if (line.points.length < 2) return null;
        const d = toPath(line.points);
        const width = line.width ?? 6;
        return (
          <React.Fragment key={`line-${i}`}>
            {line.borderColor && (
              <Path
                d={d}
                stroke={line.borderColor}
                strokeWidth={width + (line.borderWidth ?? 2) * 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}
            <Path
              d={d}
              stroke={line.color}
              strokeWidth={width}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={line.dashed ? '14,9' : undefined}
              fill="none"
            />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', backgroundColor: '#E8EDF2' },
  background: { position: 'absolute', inset: 0, backgroundColor: '#E8EDF2' },
  dim: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.08)' },
  fill: { width: '100%', height: '100%' },
  marker: { position: 'absolute' },
  attribution: {
    position: 'absolute',
    right: 4,
    bottom: 2,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  attributionText: { fontSize: 9.5, color: Colors.inkMuted },
});
