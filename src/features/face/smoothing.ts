import { lm } from '../../contracts/access';
import type { Landmark } from '../../contracts/types';
import { clamp, dist, lerp } from '../../lib/math';

/**
 * Opciones del suavizado adaptativo (estilo One-Euro simplificado).
 *
 * El filtro aplica un EMA por landmark cuyo factor `alpha` depende de cuánto se
 * ha movido el punto respecto al frame anterior:
 *  - Punto quieto  → `alpha` ≈ `minAlpha` (mucho suavizado, elimina jitter).
 *  - Punto en movimiento → `alpha` ≈ `maxAlpha` (poco suavizado, menos lag).
 */
export interface LandmarkSmootherOptions {
  /** Alpha mínimo cuando el punto está prácticamente quieto (0..1). */
  minAlpha?: number;
  /** Alpha máximo cuando el punto se mueve a toda velocidad (0..1). */
  maxAlpha?: number;
  /** Velocidad (en unidades normalizadas/frame) a la que se alcanza `maxAlpha`. */
  cutoff?: number;
}

const DEFAULT_MIN_ALPHA = 0.08;
const DEFAULT_MAX_ALPHA = 0.9;
const DEFAULT_CUTOFF = 0.03;

/**
 * Crea un suavizador con estado propio. No es un hook: puede instanciarse una
 * vez por track (p. ej. dentro de un `useRef`) y reutilizarse a 30fps.
 *
 * Garantías:
 *  - `smooth()` devuelve SIEMPRE un array nuevo de la misma longitud que la
 *    entrada (nunca reutiliza el buffer de entrada).
 *  - Si cambia la longitud del array de landmarks, se reinicia internamente y
 *    el frame nuevo pasa tal cual.
 */
export function createLandmarkSmoother(
  opts: LandmarkSmootherOptions = {},
): { smooth(landmarks: Landmark[]): Landmark[]; reset(): void } {
  const minAlpha = clamp(opts.minAlpha ?? DEFAULT_MIN_ALPHA, 0, 1);
  const maxAlpha = clamp(Math.max(opts.maxAlpha ?? DEFAULT_MAX_ALPHA, minAlpha), 0, 1);
  const cutoff = opts.cutoff && opts.cutoff > 0 ? opts.cutoff : DEFAULT_CUTOFF;

  let prev: Landmark[] | null = null;

  function reset(): void {
    prev = null;
  }

  function copy(landmarks: readonly Landmark[]): Landmark[] {
    const out: Landmark[] = [];
    for (const point of landmarks) {
      out.push({ x: point.x, y: point.y, z: point.z });
    }
    return out;
  }

  function smooth(landmarks: Landmark[]): Landmark[] {
    // Primer frame o cambio en el número de puntos: se re-siembra el filtro.
    if (prev === null || prev.length !== landmarks.length) {
      prev = copy(landmarks);
      return copy(landmarks);
    }

    const last = prev;
    const out: Landmark[] = new Array<Landmark>(landmarks.length);

    for (let i = 0; i < landmarks.length; i += 1) {
      const next = lm(landmarks, i);
      const before = lm(last, i);

      // Velocidad estimada a partir del residuo respecto al estado suavizado.
      const speed = dist(before.x, before.y, next.x, next.y);
      const alpha = lerp(minAlpha, maxAlpha, clamp(speed / cutoff, 0, 1));

      out[i] = {
        x: lerp(before.x, next.x, alpha),
        y: lerp(before.y, next.y, alpha),
        z: lerp(before.z, next.z, alpha),
      };
    }

    prev = out;
    return out.map((point) => ({ x: point.x, y: point.y, z: point.z }));
  }

  return { smooth, reset };
}
