import { hasEnoughLandmarks, lmOr } from '../../contracts/access';
import { L } from '../../contracts/landmarks';
import type { Landmark } from '../../contracts/types';
import { clamp, dist } from '../../lib/math';

/** Umbral por debajo del cual el seguimiento se considera inestable. */
const UNSTABLE_THRESHOLD = 0.45;
/** Altura ideal del rostro respecto al alto del frame. */
const IDEAL_MIN_HEIGHT = 0.45;
const IDEAL_MAX_HEIGHT = 0.85;
/** Desviación máxima (normalizada) de la nariz respecto al eje de simetría. */
const MAX_NOSE_OFFSET = 0.15;
/** Desplazamiento máximo (en medias dimensiones) tolerado para el centrado. */
const MAX_CENTER_OFFSET = 0.6;

/**
 * Calcula una calidad de seguimiento 0..1 a partir de heurísticas puras.
 *
 * Componentes (todas 0..1, se combinan de forma multiplicativa para que un
 * defecto grave hunda la puntuación):
 *  1. Tamaño: altura del bbox facial / alto de frame, ideal 0.45–0.85.
 *  2. Frontalidad: simetría de las distancias nariz↔ojos + desviación de la
 *     nariz respecto al punto medio entre ambos ojos.
 *  3. Centrado: distancia del centro del bbox al centro del frame.
 *
 * `unstable = quality < 0.45`.
 */
export function computeTrackingQuality(
  landmarks: Landmark[],
  frameWidth: number,
  frameHeight: number,
): { quality: number; unstable: boolean } {
  if (!hasEnoughLandmarks(landmarks)) {
    return { quality: 0, unstable: true };
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const point of landmarks) {
    if (point.x < minX) minX = point.x;
    if (point.x > maxX) maxX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.y > maxY) maxY = point.y;
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return { quality: 0, unstable: true };
  }

  const faceWidth = maxX - minX;
  const faceHeight = maxY - minY;
  if (faceWidth <= 0 || faceHeight <= 0) {
    return { quality: 0, unstable: true };
  }

  const nose = lmOr(landmarks, L.noseTip);
  const eyeRight = lmOr(landmarks, L.eyeRightOuter);
  const eyeLeft = lmOr(landmarks, L.eyeLeftOuter);
  const cheekRight = lmOr(landmarks, L.cheekRight);
  const cheekLeft = lmOr(landmarks, L.cheekLeft);
  const foreheadTop = lmOr(landmarks, L.foreheadTop);
  const chinMid = lmOr(landmarks, L.chinMid);
  if (
    !nose ||
    !eyeRight ||
    !eyeLeft ||
    !cheekRight ||
    !cheekLeft ||
    !foreheadTop ||
    !chinMid
  ) {
    return { quality: 0, unstable: true };
  }

  // 1. Tamaño: se usa la altura del bbox (y ya está normalizada al alto).
  const heightRatio = clamp(faceHeight, 0, 1);
  let sizeScore: number;
  if (heightRatio < IDEAL_MIN_HEIGHT) {
    sizeScore = clamp(heightRatio / IDEAL_MIN_HEIGHT, 0, 1);
  } else if (heightRatio > IDEAL_MAX_HEIGHT) {
    sizeScore = clamp((1 - heightRatio) / (1 - IDEAL_MAX_HEIGHT), 0, 1);
  } else {
    sizeScore = 1;
  }

  // 2. Frontalidad: simetría nariz↔ojos + nariz sobre el eje de simetría.
  const dRight = dist(nose.x, nose.y, eyeRight.x, eyeRight.y);
  const dLeft = dist(nose.x, nose.y, eyeLeft.x, eyeLeft.y);
  let symmetry = 1 - Math.abs(dRight - dLeft) / (dRight + dLeft + 1e-6);

  const innerRight = lmOr(landmarks, L.eyeRightInner);
  const innerLeft = lmOr(landmarks, L.eyeLeftInner);
  if (innerRight && innerLeft) {
    const innerRightDist = dist(nose.x, nose.y, innerRight.x, innerRight.y);
    const innerLeftDist = dist(nose.x, nose.y, innerLeft.x, innerLeft.y);
    const innerSymmetry =
      1 -
      Math.abs(innerRightDist - innerLeftDist) /
        (innerRightDist + innerLeftDist + 1e-6);
    symmetry = (symmetry + innerSymmetry) / 2;
  }
  symmetry = clamp(symmetry, 0, 1);

  const eyeMidX = (eyeRight.x + eyeLeft.x) / 2;
  const noseOffset = Math.abs(nose.x - eyeMidX);
  const offsetScore = 1 - clamp(noseOffset / MAX_NOSE_OFFSET, 0, 1);
  const frontalScore = clamp(symmetry * 0.6 + offsetScore * 0.4, 0, 1);

  // 3. Centrado del bbox respecto al centro del frame.
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const dx = (centerX - 0.5) * frameWidth;
  const dy = (centerY - 0.5) * frameHeight;
  const halfMin = Math.min(frameWidth, frameHeight) / 2;
  const centerOffset = halfMin > 0 ? Math.hypot(dx, dy) / halfMin : 0;
  const centerScore = 1 - clamp(centerOffset / MAX_CENTER_OFFSET, 0, 1);

  const quality = clamp(sizeScore * frontalScore * centerScore, 0, 1);
  return { quality, unstable: quality < UNSTABLE_THRESHOLD };
}
