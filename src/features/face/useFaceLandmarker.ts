import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { FaceLandmarkerOptions } from '@mediapipe/tasks-vision';
import { useEffect, useState } from 'react';

/**
 * URLs CONGELADAS — deben coincidir EXACTAMENTE con `vite.config.ts` para que
 * el Service Worker (Workbox) reutilice su caché `mediapipe-wasm` / `-model`.
 */
export const FACE_LANDMARKER_WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
export const FACE_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

async function createLandmarker(delegate: 'GPU' | 'CPU'): Promise<FaceLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(FACE_LANDMARKER_WASM_CDN);
  const options: FaceLandmarkerOptions = {
    baseOptions: {
      modelAssetPath: FACE_LANDMARKER_MODEL_URL,
      delegate,
    },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  };
  return FaceLandmarker.createFromOptions(vision, options);
}

/**
 * Carga el `FaceLandmarker` una única vez (singleton perezoso).
 * Si la delegación GPU falla (p. ej. WebGL no disponible), reintenta con CPU.
 */
export function loadFaceLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = createLandmarker('GPU').catch(() =>
      createLandmarker('CPU').catch((cpuError: unknown) => {
        // Permite reintentar en un montaje posterior.
        landmarkerPromise = null;
        throw cpuError;
      }),
    );
  }
  return landmarkerPromise;
}

/**
 * Arranca la carga del modelo en el montaje y expone su estado.
 * No descarga nada al desmontar: el singleton se comparte entre componentes.
 */
export function useFaceLandmarker(): {
  ready: boolean;
  loading: boolean;
  error: string | null;
} {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    loadFaceLandmarker()
      .then(() => {
        if (cancelled) return;
        setReady(true);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError('No se pudo cargar el modelo de detección facial.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, loading, error };
}
