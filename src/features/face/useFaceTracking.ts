import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Landmark, TrackedFace } from '../../contracts/types';
import { computeTrackingQuality } from './quality';
import { setCurrentFrame } from './frameStore';
import { createLandmarkSmoother } from './smoothing';
import { loadFaceLandmarker } from './useFaceLandmarker';

/** Intervalo mínimo entre inferencias (≈30fps). */
const MIN_FRAME_INTERVAL_MS = 1000 / 30;

interface UseFaceTrackingOptions {
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  onFrame?: (face: TrackedFace) => void;
}

/**
 * Ejecuta el bucle de detección facial sobre el `<video>` dado.
 *
 * - Throttle por timestamp a ~30fps.
 * - Solo infiere si `video.readyState >= 2` y `currentTime` cambió.
 * - Suaviza los landmarks y calcula la calidad, publicando el resultado en el
 *   `frameStore` imperativo y, opcionalmente, vía `onFrame`.
 * - Se pausa si la pestaña no está visible y limpia el `requestAnimationFrame`
 *   al desmontar o desactivar.
 *
 * Nota: MediaPipe no expone un score numérico de detección sin blendshapes, así
 * que `confidence` se aproxima con la calidad calculada.
 */
export function useFaceTracking({
  videoRef,
  enabled,
  onFrame,
}: UseFaceTrackingOptions): { ready: boolean; error: string | null } {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const smootherRef = useRef(createLandmarkSmoother());
  const onFrameRef = useRef<((face: TrackedFace) => void) | undefined>(onFrame);
  const lastVideoTimeRef = useRef(-1);
  const lastFrameTimestampRef = useRef(0);
  const lastDetectTimestampRef = useRef(0);

  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  useEffect(() => {
    if (!enabled) {
      setCurrentFrame(null);
      return;
    }

    let cancelled = false;
    let rafId = 0;

    setReady(false);
    setError(null);
    smootherRef.current.reset();
    lastVideoTimeRef.current = -1;

    loadFaceLandmarker()
      .then((landmarker) => {
        if (cancelled) return;
        setReady(true);

        const loop = (): void => {
          if (cancelled) return;
          rafId = window.requestAnimationFrame(loop);

          if (document.hidden) return;

          const now = performance.now();
          if (now - lastFrameTimestampRef.current < MIN_FRAME_INTERVAL_MS) return;
          lastFrameTimestampRef.current = now;

          const video = videoRef.current;
          if (!video || video.readyState < 2) return;
          if (video.currentTime === lastVideoTimeRef.current) return;
          lastVideoTimeRef.current = video.currentTime;

          // Los timestamps deben ser estrictamente crecientes para MediaPipe.
          const timestamp =
            now <= lastDetectTimestampRef.current
              ? lastDetectTimestampRef.current + 1
              : now;
          lastDetectTimestampRef.current = timestamp;

          let landmarks: Landmark[] | undefined;
          try {
            const result = landmarker.detectForVideo(video, timestamp);
            const face = result.faceLandmarks[0];
            if (face && face.length > 0) {
              landmarks = face.map((point) => ({
                x: point.x,
                y: point.y,
                z: point.z,
              }));
            }
          } catch {
            return;
          }

          if (!landmarks) {
            setCurrentFrame(null);
            return;
          }

          const raw = landmarks;
          const smoothed = smootherRef.current.smooth(raw);
          const { quality, unstable } = computeTrackingQuality(
            smoothed,
            video.videoWidth,
            video.videoHeight,
          );

          const tracked: TrackedFace = {
            raw,
            smoothed,
            confidence: quality,
            quality,
            unstable,
          };

          setCurrentFrame(tracked);
          onFrameRef.current?.(tracked);
        };

        rafId = window.requestAnimationFrame(loop);
      })
      .catch(() => {
        if (cancelled) return;
        setError('No se pudo iniciar el seguimiento facial.');
      });

    return () => {
      cancelled = true;
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [enabled, videoRef]);

  return { ready, error };
}
