/**
 * Clasificación de la forma del rostro (Agente B).
 *
 * Cada forma puntúa 0..1 combinando funciones suaves (bandas y sigmoides)
 * sobre las métricas; se normaliza el vector de puntuaciones y gana el argmax.
 * El uso de funciones suaves evita fronteras duras entre formas parecidas.
 */

import type {
  FaceMetrics,
  FaceShape,
  FaceShapeResult,
  Landmark,
} from '../../contracts/types';
import { FACE_SHAPES } from '../../contracts/types';
import { clamp } from '../../lib/math';
import { computeFaceMetrics } from './metrics';

/**
 * Clasifica la forma del rostro a partir de los landmarks.
 * Devuelve puntuaciones normalizadas (suman 1) para las 7 formas.
 */
export function classifyFaceShape(
  landmarks: readonly Landmark[],
): FaceShapeResult {
  const metrics = computeFaceMetrics(landmarks);
  const raw = rawScores(metrics);

  let total = 0;
  for (const shape of FACE_SHAPES) total += raw[shape];

  const uniform = 1 / FACE_SHAPES.length;
  const scores = {} as Record<FaceShape, number>;
  for (const shape of FACE_SHAPES) {
    scores[shape] = total > 0 ? raw[shape] / total : uniform;
  }

  let shape: FaceShape = FACE_SHAPES[0]!;
  let top = -Infinity;
  for (const candidate of FACE_SHAPES) {
    if (scores[candidate] > top) {
      top = scores[candidate];
      shape = candidate;
    }
  }

  return {
    shape,
    confidence: clamp(top, 0, 1),
    scores,
    metrics,
  };
}

/** Puntuaciones crudas (sin normalizar) por forma. */
function rawScores(m: FaceMetrics): Record<FaceShape, number> {
  return {
    oval:
      band(m.lengthToWidth, 1.35, 1.55) *
      band(m.jawToCheek, 0.78, 0.92) *
      band(m.foreheadToCheek, 0.92, 1.02),

    round:
      below(m.lengthToWidth, 1.28, 0.07) *
      above(m.gonialAngle, 130, 7) *
      above(m.jawToCheek, 0.85, 0.05),

    square:
      band(m.lengthToWidth, 1.1, 1.38) *
      above(m.jawToCheek, 0.92, 0.04) *
      band(m.gonialAngle, 108, 132, 10),

    oblong: above(m.lengthToWidth, 1.6, 0.06),

    heart:
      above(m.foreheadToCheek, 1.03, 0.03) *
      below(m.jawToCheek, 0.84, 0.05),

    diamond:
      above(m.cheekboneDominance, 1.12, 0.03) *
      below(m.foreheadToCheek, 0.99, 0.03) *
      below(m.jawToCheek, 0.93, 0.04),

    triangle: Math.max(
      above(m.jawToCheek, 1, 0.04),
      below(m.foreheadToCheek, 0.92, 0.04) *
        above(m.jawToCheek, 0.9, 0.05),
    ),
  };
}

/** 1 dentro de [low, high]; decae gaussianamente fuera (soft = desviación). */
function band(
  value: number,
  low: number,
  high: number,
  soft = 0.08,
): number {
  if (value >= low && value <= high) return 1;
  const edge = value < low ? low - value : value - high;
  return gaussian(edge, 0, soft);
}

/** Crece suavemente al superar `threshold` (sigmoide), 0.5 justo en él. */
function above(value: number, threshold: number, soft = 0.05): number {
  return logistic((value - threshold) / soft);
}

/** Decrece suavemente al bajar de `threshold` (sigmoide), 0.5 justo en él. */
function below(value: number, threshold: number, soft = 0.05): number {
  return logistic((threshold - value) / soft);
}

function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function gaussian(x: number, center: number, sigma: number): number {
  const z = (x - center) / sigma;
  return Math.exp(-0.5 * z * z);
}
