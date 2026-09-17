import type { Landmark } from '../../contracts/types';
import { FACE_OVAL, LANDMARK_COUNT } from '../../contracts/landmarks';

/**
 * Fixture de landmarks sintéticos con forma de cara humana frontal.
 *
 * Sustituye al antiguo `makeLandmarks()` (que era una cara de juguete: solo 6
 * puntos reales y el resto a 0.5). Ahora los índices que la geometría de la
 * barba usa de verdad (óvalo facial, mandíbula, boca, pómulos, tragiones…)
 * tienen coordenadas realistas y coherentes, de modo que los tests puedan
 * comprobar que las zonas y líneas caen donde deben.
 *
 * Todas las coordenadas están en espacio normalizado [0..1] del frame.
 */

/** Puntos conocidos de la cara de prueba. */
const KNOWN_POINTS: Record<number, { x: number; y: number }> = {
  10: { x: 0.5, y: 0.28 },
  152: { x: 0.5, y: 0.74 },
  234: { x: 0.32, y: 0.49 },
  454: { x: 0.68, y: 0.49 },
  172: { x: 0.36, y: 0.63 },
  397: { x: 0.64, y: 0.63 },
  70: { x: 0.36, y: 0.3 },
  300: { x: 0.64, y: 0.3 },
  116: { x: 0.375, y: 0.5 },
  345: { x: 0.625, y: 0.5 },
  127: { x: 0.335, y: 0.35 },
  356: { x: 0.676, y: 0.487 },
  33: { x: 0.365, y: 0.44 },
  133: { x: 0.44, y: 0.445 },
  362: { x: 0.56, y: 0.445 },
  263: { x: 0.635, y: 0.44 },
  468: { x: 0.4, y: 0.44 },
  473: { x: 0.6, y: 0.44 },
  1: { x: 0.5, y: 0.56 },
  2: { x: 0.5, y: 0.615 },
  168: { x: 0.5, y: 0.42 },
  0: { x: 0.5, y: 0.645 },
  17: { x: 0.5, y: 0.685 },
  61: { x: 0.425, y: 0.665 },
  291: { x: 0.575, y: 0.665 },
  148: { x: 0.47, y: 0.715 },
  176: { x: 0.455, y: 0.7 },
  377: { x: 0.53, y: 0.715 },
  400: { x: 0.545, y: 0.7 },
  136: { x: 0.375, y: 0.665 },
  150: { x: 0.42, y: 0.7 },
  149: { x: 0.45, y: 0.72 },
  365: { x: 0.625, y: 0.665 },
  379: { x: 0.58, y: 0.7 },
  378: { x: 0.55, y: 0.72 },
  132: { x: 0.335, y: 0.545 },
  58: { x: 0.345, y: 0.575 },
  361: { x: 0.662, y: 0.55 },
  323: { x: 0.672, y: 0.52 },
  288: { x: 0.655, y: 0.585 },
  162: { x: 0.36, y: 0.33 },
  21: { x: 0.4, y: 0.3 },
  54: { x: 0.44, y: 0.29 },
  103: { x: 0.47, y: 0.285 },
  67: { x: 0.53, y: 0.285 },
  109: { x: 0.56, y: 0.29 },
  338: { x: 0.56, y: 0.3 },
  297: { x: 0.6, y: 0.32 },
  332: { x: 0.63, y: 0.34 },
  284: { x: 0.668, y: 0.4 },
  251: { x: 0.672, y: 0.45 },
  389: { x: 0.674, y: 0.478 },
  93: { x: 0.325, y: 0.52 },
  185: { x: 0.46, y: 0.64 },
  409: { x: 0.54, y: 0.64 },
};

/**
 * Factor de escala horizontal respecto al eje medio.
 *
 * El ancho del rostro se escala para que tenga proporciones humanas en un
 * frame vertical de móvil: con 1.64, `W/H ≈ 1.28` y el ancho/alto en píxeles de
 * un frame 720x1280 queda ≈ 0.72 (lo realista). Sin esto la cara de prueba era
 * demasiado estrecha y falseaba tanto los tests como la revisión visual.
 */
const X_SCALE = 1.64;

/** Lleva una x a proporción realista, conservando el eje medio en 0.5. */
function scaleX(x: number): number {
  return 0.5 + (x - 0.5) * X_SCALE;
}

/** `KNOWN_POINTS` con el ancho corregido. */
const SCALED_POINTS: Record<number, { x: number; y: number }> = {};
for (const [key, point] of Object.entries(KNOWN_POINTS)) {
  SCALED_POINTS[Number(key)] = { x: scaleX(point.x), y: point.y };
}

/**
 * Crea un conjunto de 478 landmarks de una cara frontal sintética.
 *
 * - El resto de índices queda en el centro `{x:0.5, y:0.5, z:0}`.
 * - Los índices de `FACE_OVAL` que no estuvieran definidos se interpolan
 *   linealmente entre los dos vecinos conocidos consecutivos del array, para
 *   que el contorno quede continuo.
 *
 * @param overrides permite desplazar/ajustar índices concretos en los tests.
 */
export function makeFaceLandmarks(
  overrides: Record<number, { x: number; y: number }> = {},
): Landmark[] {
  const landmarks: Landmark[] = Array.from(
    { length: LANDMARK_COUNT },
    () => ({ x: 0.5, y: 0.5, z: 0 }),
  );

  for (const [key, point] of Object.entries(SCALED_POINTS)) {
    landmarks[Number(key)] = { x: point.x, y: point.y, z: 0 };
  }

  interpolateOval(landmarks);

  for (const [key, point] of Object.entries(overrides)) {
    landmarks[Number(key)] = { x: point.x, y: point.y, z: 0 };
  }

  return landmarks;
}

/** Rellena los índices del óvalo sin valor conocido interpolando vecinos. */
function interpolateOval(landmarks: Landmark[]): void {
  const count = FACE_OVAL.length;

  for (let i = 0; i < count; i++) {
    const index = FACE_OVAL[i];
    if (index === undefined) continue;

    const current = landmarks[index];
    if (!current) continue;
    if (SCALED_POINTS[index] !== undefined) continue;

    const previous = findKnownPosition(i, -1);
    const next = findKnownPosition(i, 1);
    if (previous < 0 || next < 0) continue;

    const previousPoint = SCALED_POINTS[FACE_OVAL[previous] ?? -1];
    const nextPoint = SCALED_POINTS[FACE_OVAL[next] ?? -1];
    if (!previousPoint || !nextPoint) continue;

    const t = (i - previous) / (next - previous);
    current.x = previousPoint.x + (nextPoint.x - previousPoint.x) * t;
    current.y = previousPoint.y + (nextPoint.y - previousPoint.y) * t;
  }
}

/** Busca hacia atrás/adelante la posición de un índice con valor conocido. */
function findKnownPosition(from: number, step: -1 | 1): number {
  for (let i = from + step; i >= 0 && i < FACE_OVAL.length; i += step) {
    const index = FACE_OVAL[i];
    if (index !== undefined && SCALED_POINTS[index] !== undefined) return i;
  }
  return -1;
}
