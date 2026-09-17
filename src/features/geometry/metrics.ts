/**
 * Métricas faciales (Agente B).
 *
 * Extrae razones adimensionales e invariantes a escala a partir de los
 * landmarks de MediaPipe. Todas las medidas son ratios, por lo que no dependen
 * del tamaño del rostro ni de la resolución del vídeo.
 */

import type { FaceMetrics, Landmark } from '../../contracts/types';
import { L } from '../../contracts/landmarks';
import { hasEnoughLandmarks, lm, lmOr } from '../../contracts/access';
import { angleOf, clamp, degrees, dist, mean } from '../../lib/math';

/** Tolerancia para detectar denominadores degenerados. */
const EPSILON = 1e-9;

/**
 * Distancia interpupilar en espacio normalizado.
 *
 * Preferencia: centro de iris (468↔473) si hay refinado de iris; si no, la
 * esquina externa del ojo (33↔263); fallback final: esquina interna (133↔362).
 */
export function interPupillaryDistance(landmarks: readonly Landmark[]): number {
  if (landmarks.length > L.irisLeft) {
    const rightIris = lm(landmarks, L.irisRight);
    const leftIris = lm(landmarks, L.irisLeft);
    return dist(rightIris.x, rightIris.y, leftIris.x, leftIris.y);
  }

  const rightOuter = lmOr(landmarks, L.eyeRightOuter);
  const leftOuter = lmOr(landmarks, L.eyeLeftOuter);
  if (rightOuter && leftOuter) {
    return dist(rightOuter.x, rightOuter.y, leftOuter.x, leftOuter.y);
  }

  const rightInner = lm(landmarks, L.eyeRightInner);
  const leftInner = lm(landmarks, L.eyeLeftInner);
  return dist(rightInner.x, rightInner.y, leftInner.x, leftInner.y);
}

/**
 * Calcula las métricas faciales normalizadas.
 *
 * Lanza si no hay suficientes landmarks (`hasEnoughLandmarks`) o si una
 * magnitud base es degenerada (ancho de pómulos o mandíbula nulos).
 */
export function computeFaceMetrics(
  landmarks: readonly Landmark[],
): FaceMetrics {
  if (!hasEnoughLandmarks(landmarks)) {
    throw new Error(
      `computeFaceMetrics: se necesitan al menos 300 landmarks (recibidos ${landmarks.length})`,
    );
  }

  const foreheadTop = lm(landmarks, L.foreheadTop);
  const chinMid = lm(landmarks, L.chinMid);
  const tragionRight = lm(landmarks, L.tragionRight);
  const tragionLeft = lm(landmarks, L.tragionLeft);
  const gonionRight = lm(landmarks, L.gonionRight);
  const gonionLeft = lm(landmarks, L.gonionLeft);
  const foreheadRight = lm(landmarks, L.foreheadRight);
  const foreheadLeft = lm(landmarks, L.foreheadLeft);
  const eyeRightOuter = lm(landmarks, L.eyeRightOuter);
  const eyeLeftOuter = lm(landmarks, L.eyeLeftOuter);

  const faceLength = dist(
    foreheadTop.x,
    foreheadTop.y,
    chinMid.x,
    chinMid.y,
  );
  const cheekWidth = dist(
    tragionRight.x,
    tragionRight.y,
    tragionLeft.x,
    tragionLeft.y,
  );
  const jawWidth = dist(
    gonionRight.x,
    gonionRight.y,
    gonionLeft.x,
    gonionLeft.y,
  );
  const foreheadWidth = dist(
    foreheadRight.x,
    foreheadRight.y,
    foreheadLeft.x,
    foreheadLeft.y,
  );

  if (cheekWidth <= EPSILON) {
    throw new Error(
      'computeFaceMetrics: anchura de pómulos nula (landmarks degenerados)',
    );
  }

  const maxLowerWidth = Math.max(jawWidth, foreheadWidth);
  if (maxLowerWidth <= EPSILON) {
    throw new Error(
      'computeFaceMetrics: anchura de mandíbula y frente nulas (landmarks degenerados)',
    );
  }

  // Ángulo gonial: vértice en el gonion entre la rama (hacia el tragion) y el
  // cuerpo mandibular (hacia el mentón). Se promedian ambos lados.
  const rightGonial = vertexAngle(gonionRight, chinMid, tragionRight);
  const leftGonial = vertexAngle(gonionLeft, chinMid, tragionLeft);
  const gonialAngle = mean([rightGonial, leftGonial]);

  // Equilibrio vertical: cuánto se acerca el eje de los ojos a la mitad del
  // segmento frente→mentón. 1 = perfectamente centrado, 0 = en un extremo.
  const eyeMeanY = mean([eyeRightOuter.y, eyeLeftOuter.y]);
  const verticalSpan = Math.abs(chinMid.y - foreheadTop.y);
  const verticalBalance =
    verticalSpan > EPSILON
      ? clamp(1 - Math.abs(eyeMeanY - foreheadTop.y) / verticalSpan, 0, 1)
      : 0;

  return {
    lengthToWidth: faceLength / cheekWidth,
    jawToCheek: jawWidth / cheekWidth,
    foreheadToCheek: foreheadWidth / cheekWidth,
    gonialAngle,
    cheekboneDominance: cheekWidth / maxLowerWidth,
    verticalBalance,
  };
}

/** Ángulo (grados, 0..180) en `vertex` entre las direcciones a `a` y `b`. */
function vertexAngle(
  vertex: Landmark,
  a: Landmark,
  b: Landmark,
): number {
  const angleA = angleOf(vertex.x, vertex.y, a.x, a.y);
  const angleB = angleOf(vertex.x, vertex.y, b.x, b.y);

  let difference = angleA - angleB;
  while (difference > Math.PI) difference -= 2 * Math.PI;
  while (difference < -Math.PI) difference += 2 * Math.PI;

  return degrees(Math.abs(difference));
}
