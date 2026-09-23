import { useCallback, useMemo, useRef, useState } from 'react';

import { LatLng } from '../../core/geo/latLng';
import { Insets, MAX_ZOOM, MIN_ZOOM, MapCamera, Size, fitting } from '../../core/map/mapCamera';

export interface MapController {
  center: LatLng;
  zoom: number;
  size: Size;
  camera: MapCamera;
  moveTo(center: LatLng, zoom?: number): void;
  zoomBy(delta: number): void;
  fitPoints(points: readonly LatLng[], padding?: Insets): void;
  /** Called by the map component once it has measured itself. */
  setSize(size: Size): void;
  /** Applied by the gesture handler. */
  applyCamera(next: MapCamera): void;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * Drives a `BantayMap` from outside the component.
 *
 * Centre, zoom and size live in one state object so every update can be
 * expressed as a pure transition of the whole camera. The only ref is the
 * deferred fit, which is written from callbacks and never read during render.
 */
export function useMapController(initial: { center: LatLng; zoom?: number }): MapController {
  const [camera, setCamera] = useState<MapCamera>(() => ({
    center: initial.center,
    zoom: initial.zoom ?? 15,
    size: { width: 0, height: 0 },
  }));

  // A fit requested before the map has been laid out, applied on first layout.
  const pendingFit = useRef<{ points: readonly LatLng[]; padding?: Insets } | null>(null);

  const moveTo = useCallback((center: LatLng, zoom?: number) => {
    pendingFit.current = null;
    setCamera((prev) => ({
      ...prev,
      center,
      zoom: zoom === undefined ? prev.zoom : clamp(zoom, MIN_ZOOM, MAX_ZOOM),
    }));
  }, []);

  const zoomBy = useCallback((delta: number) => {
    setCamera((prev) => ({ ...prev, zoom: clamp(prev.zoom + delta, MIN_ZOOM, MAX_ZOOM) }));
  }, []);

  const applyCamera = useCallback((next: MapCamera) => {
    setCamera((prev) => ({ ...prev, center: next.center, zoom: next.zoom }));
  }, []);

  const fitPoints = useCallback((points: readonly LatLng[], padding?: Insets) => {
    if (points.length === 0) return;
    if (camera.size.width === 0 || camera.size.height === 0) {
      pendingFit.current = { points, padding };
      return;
    }
    const fitted = fitting(camera, points, padding);
    setCamera((prev) => ({ ...prev, center: fitted.center, zoom: fitted.zoom }));
  }, [camera]);

  const setSize = useCallback((size: Size) => {
    const pending = pendingFit.current;
    if (pending && size.width > 0 && size.height > 0) {
      pendingFit.current = null;
      setCamera((prev) => {
        const withSize = { ...prev, size };
        const fitted = fitting(withSize, pending.points, pending.padding);
        return { ...withSize, center: fitted.center, zoom: fitted.zoom };
      });
      return;
    }
    setCamera((prev) =>
      prev.size.width === size.width && prev.size.height === size.height
        ? prev
        : { ...prev, size },
    );
  }, []);

  return useMemo(
    () => ({
      center: camera.center,
      zoom: camera.zoom,
      size: camera.size,
      camera,
      moveTo,
      zoomBy,
      fitPoints,
      setSize,
      applyCamera,
    }),
    [camera, moveTo, zoomBy, fitPoints, setSize, applyCamera],
  );
}
