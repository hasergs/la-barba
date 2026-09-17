import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { FaceLandmarkerOptions } from '@mediapipe/tasks-vision';
import { useEffect, useState } from 'react';
import type { VisionDelegate } from '../../contracts/types';

/**
 * URLs CONGELADAS — deben coincidir EXACTAMENTE con `vite.config.ts` para que
 * el Service Worker (Workbox) reutilice su caché `mediapipe-wasm` / `-model`.
 */
export const FACE_LANDMARKER_WASM_CDN =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
export const FACE_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/** Reexportado desde los contratos para una única fuente de verdad. */
export type { VisionDelegate };

/**
 * ⚠️ CPU por defecto, NO GPU.
 *
 * Medido en producción: `createFromOptions` con `delegate: 'GPU'` tardaba
 * ~14.9 s (y llegaba a colgar/tumbar el proceso gráfico), mientras que con
 * `'CPU'` tardaba ~68 ms. Como el fallback anterior solo se activaba cuando la
 * promesa *rechazaba* —y GPU no rechaza, se cuelga—, el modelo nunca quedaba
 * listo y la app no detectaba nada. GPU sigue disponible de forma explícita y
 * acotada por timeout para quien quiera probarlo.
 */
export const DEFAULT_VISION_DELEGATE: VisionDelegate = 'CPU';

/** Tiempo máximo que esperamos al delegate GPU antes de caer a CPU. */
export const DEFAULT_GPU_TIMEOUT_MS = 6000;

export interface LoadFaceLandmarkerOptions {
  /** Solo aplica al delegate GPU. */
  gpuTimeoutMs?: number;
}

/** Errores en español listos para mostrar en la UI. */
export const FACE_MODEL_ERROR =
  'No se pudo iniciar el modelo de detección facial.';

let activeDelegate: VisionDelegate | null = null;

/** Delegado del modelo realmente en uso (`null` si aún no ha cargado). */
export function getActiveDelegate(): VisionDelegate | null {
  return activeDelegate;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout:${ms}`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function init(delegate: VisionDelegate): Promise<FaceLandmarker> {
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

/** Singleton del camino CPU (el único estable en móvil). */
let cpuPromise: Promise<FaceLandmarker> | null = null;

function loadCpu(): Promise<FaceLandmarker> {
  if (!cpuPromise) {
    cpuPromise = init('CPU')
      .then((landmarker) => {
        activeDelegate = 'CPU';
        return landmarker;
      })
      .catch((error: unknown) => {
        // Permite reintentar en un montaje posterior.
        cpuPromise = null;
        activeDelegate = null;
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`${FACE_MODEL_ERROR} (${detail})`);
      });
  }
  return cpuPromise;
}

/**
 * Carga el `FaceLandmarker`.
 *
 * - `'CPU'` (por defecto): singleton, ~68 ms, sin cuelgues.
 * - `'GPU'`: intento único acotado por `gpuTimeoutMs`; si tarda más o falla,
 *   se descarta la instancia tardía y se continúa con CPU.
 */
export async function loadFaceLandmarker(
  delegate: VisionDelegate = DEFAULT_VISION_DELEGATE,
  options: LoadFaceLandmarkerOptions = {},
): Promise<FaceLandmarker> {
  if (delegate === 'CPU') return loadCpu();

  const timeoutMs = options.gpuTimeoutMs ?? DEFAULT_GPU_TIMEOUT_MS;
  let abandoned = false;

  const gpu = init('GPU');
  // Si el timeout gana la carrera, cerramos la instancia GPU que llegue tarde.
  void gpu
    .then((landmarker) => {
      if (abandoned) landmarker.close();
      else activeDelegate = 'GPU';
    })
    .catch(() => undefined);

  try {
    return await withTimeout(gpu, timeoutMs);
  } catch {
    abandoned = true;
  }

  // GPU lento/no disponible: seguimos con CPU, que sí es fiable.
  return loadCpu();
}

/**
 * Arranca la carga del modelo en el montaje y expone su estado.
 * No descarga nada al desmontar: el singleton se comparte entre componentes.
 */
export function useFaceLandmarker(delegate: VisionDelegate = DEFAULT_VISION_DELEGATE): {
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

    loadFaceLandmarker(delegate)
      .then(() => {
        if (cancelled) return;
        setReady(true);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(FACE_MODEL_ERROR);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [delegate]);

  return { ready, loading, error };
}
