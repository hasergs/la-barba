import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { TrackedFace } from '../../contracts/types';
import { classifyFaceShape } from '../../features/geometry';
import { hasEnoughLandmarks } from '../../contracts/access';
import { getActiveDelegate, useFaceTracking } from '../../features/face';
import { useAppStore } from '../../store/appStore';

/** Frecuencia de clasificación (ms). Clasificar es más caro que rastrear. */
const CLASSIFY_INTERVAL_MS = 250;

/** Frecuencia de publicación de diagnóstico (ms). */
const DIAGNOSTICS_INTERVAL_MS = 500;

/**
 * Orquesta el seguimiento facial (Agente A) con la clasificación de la forma
 * del rostro (Agente B), publicando el resultado en el store global.
 *
 * Mantiene los datos de alta frecuencia fuera de React y solo escribe estado
 * de bajo refresco (forma, calidad, inestabilidad, diagnóstico).
 */
export function useFaceAnalysis(opts: {
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled: boolean;
}): { ready: boolean; error: string | null } {
  const lastClassifyRef = useRef(0);
  const lastDiagnosticsRef = useRef(0);
  const framesRef = useRef(0);
  const fpsWindowRef = useRef({ startedAt: 0, count: 0 });

  const onFrame = useCallback((face: TrackedFace) => {
    const store = useAppStore.getState();

    if (!store.hasFace) store.setHasFace(true);
    store.setQuality(face.quality, face.unstable);

    const now = performance.now();

    // --- Diagnóstico (barato, a baja frecuencia) ---
    framesRef.current += 1;
    const window = fpsWindowRef.current;
    if (window.startedAt === 0) window.startedAt = now;
    window.count += 1;

    if (now - lastDiagnosticsRef.current >= DIAGNOSTICS_INTERVAL_MS) {
      lastDiagnosticsRef.current = now;
      const elapsed = now - window.startedAt;
      const fps = elapsed > 0 ? Math.round((window.count * 1000) / elapsed) : 0;
      window.startedAt = now;
      window.count = 0;

      useAppStore.getState().setDiagnostics({
        delegate: getActiveDelegate(),
        frames: framesRef.current,
        fps,
        landmarks: face.smoothed.length,
        quality: face.quality,
      });
    }

    // --- Clasificación de la forma del rostro (más cara) ---
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

  const visionDelegate = useAppStore((s) => s.visionDelegate);

  const tracking = useFaceTracking({
    videoRef: opts.videoRef,
    enabled: opts.enabled,
    onFrame,
    delegate: visionDelegate,
  });

  // Publica el estado del modelo para el panel de diagnóstico.
  useEffect(() => {
    useAppStore.getState().setDiagnostics({
      modelReady: tracking.ready,
      lastError: tracking.error,
      delegate: getActiveDelegate(),
    });
  }, [tracking.ready, tracking.error]);

  return tracking;
}
