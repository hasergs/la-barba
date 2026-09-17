import type { Landmark, NormPoint } from './types';

/**
 * Acceso seguro a landmarks (CONGELADO, PM).
 *
 * Necesario porque `noUncheckedIndexedAccess` está activo: `landmarks[i]`
 * devuelve `Landmark | undefined`. Usar SIEMPRE estos helpers en lugar de
 * indexar directamente evita repetir aserciones y unifica errores.
 */

/** Devuelve el landmark o lanza si el índice no existe. */
export function lm(landmarks: readonly Landmark[], index: number): Landmark {
  const point = landmarks[index];
  if (!point) {
    throw new Error(
      `Landmark ${index} no disponible (recibidos ${landmarks.length})`,
    );
  }
  return point;
}

/** Devuelve el landmark o `null` (para validaciones sin excepción). */
export function lmOr(
  landmarks: readonly Landmark[],
  index: number,
): Landmark | null {
  return landmarks[index] ?? null;
}

/** Comprueba que hay suficientes landmarks para operar con seguridad. */
export function hasEnoughLandmarks(landmarks: readonly Landmark[]): boolean {
  return landmarks.length >= 300;
}

/** Extrae el punto normalizado (x,y) de un landmark. */
export function normPoint(landmarks: readonly Landmark[], index: number): NormPoint {
  const point = lm(landmarks, index);
  return { x: point.x, y: point.y };
}
