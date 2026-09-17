import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import type { TrackedFace } from '../../contracts/types';
import { classifyFaceShape } from '../../features/geometry';
import { hasEnoughLandmarks } from '../../contracts/access';
import { useFaceTracking } from '../../features/face';
import { useAppStore } from '../../store/appStore';

/** Frecuencia de clasificación (ms). Clasificar es más caro que rastrear. */
const CLASSIFY_INTERVAL_MS = 250;

/**
 * Orquesta el seguimiento facial (Agente A) con la clasificación de la forma
 * del rostro (Agente B), publicando el resultado en el store global.
 *
 * Mantiene los datos de alta frecuencia fuera de React y solo escribe estado
 * de bajo refresco (forma, calidad, inestabilidad).
 */
export function useFaceAnalysis(opts: {
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled: boolean;
}): { ready: boolean; error: string | null } {
  const lastClassifyRef = useRef(0);

  const onFrame = useCallback((face: TrackedFace) => {
    const store = useAppStore.getState();

    if (!store.hasFace) store.setHasFace(true);
    store.setQuality(face.quality, face.unstable);

    const now = performance.now();
    if (now - lastClassifyRef.current < CLASSIFY_INTERVAL_MS) return;
    lastClassifyRef.current = now;

    if (face.unstable || !hasEnoughLandmarks(face.smoothed)) return;

    try {
      const result = classifyFaceShape(face.smoothed);
      useAppStore.getState().setFaceShape(result);
    } catch {
      // Landmarks degenerados en este frame: se ignora y se reintenta después.
    }
  }, []);

  return useFaceTracking({
    videoRef: opts.videoRef,
    enabled: opts.enabled,
    onFrame,
  });
}
