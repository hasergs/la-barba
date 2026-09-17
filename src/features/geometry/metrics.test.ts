import { describe, expect, it } from 'vitest';
import type { Landmark } from '../../contracts/types';
import { L } from '../../contracts/landmarks';
import { computeFaceMetrics, interPupillaryDistance } from './metrics';

/** Array denso de `count` landmarks en el origen. */
function emptyLandmarks(count: number): Landmark[] {
  return Array.from({ length: count }, () => ({ x: 0, y: 0, z: 0 }));
}

/** Coloca un landmark en una posición conocida. */
function place(
  landmarks: Landmark[],
  index: number,
  x: number,
  y: number,
): void {
  const point = landmarks[index];
  if (!point) {
    throw new Error(`índice ${index} fuera de rango (${landmarks.length})`);
  }
  point.x = x;
  point.y = y;
}

/** Cara sintética con geometría conocida para verificar las razones. */
function buildKnownFace(): Landmark[] {
  const landmarks = emptyLandmarks(478);
  place(landmarks, L.foreheadTop, 0.5, 0);
  place(landmarks, L.chinMid, 0.5, 0.5);
  place(landmarks, L.tragionRight, 0.2, 0.25);
  place(landmarks, L.tragionLeft, 0.8, 0.25);
  place(landmarks, L.gonionRight, 0.35, 0.4);
  place(landmarks, L.gonionLeft, 0.65, 0.4);
  place(landmarks, L.foreheadRight, 0.35, 0.05);
  place(landmarks, L.foreheadLeft, 0.65, 0.05);
  place(landmarks, L.eyeRightOuter, 0.3, 0.15);
  place(landmarks, L.eyeLeftOuter, 0.7, 0.15);
  return landmarks;
}

describe('interPupillaryDistance', () => {
  it('usa los centros de iris cuando hay 478 landmarks', () => {
    const landmarks = emptyLandmarks(478);
    place(landmarks, L.irisRight, 0.4, 0.5);
    place(landmarks, L.irisLeft, 0.6, 0.5);
    expect(interPupillaryDistance(landmarks)).toBeCloseTo(0.2, 9);
  });

  it('usa las esquinas externas del ojo sin refinado de iris', () => {
    const landmarks = emptyLandmarks(300);
    place(landmarks, L.eyeRightOuter, 0.35, 0.5);
    place(landmarks, L.eyeLeftOuter, 0.65, 0.5);
    expect(interPupillaryDistance(landmarks)).toBeCloseTo(0.3, 9);
  });

  it('cae a las esquinas internas si faltan las externas', () => {
    const sparse = [] as Landmark[];
    sparse.length = 300;
    sparse[L.eyeRightInner] = { x: 0.45, y: 0.5, z: 0 };
    sparse[L.eyeLeftInner] = { x: 0.55, y: 0.5, z: 0 };
    expect(interPupillaryDistance(sparse)).toBeCloseTo(0.1, 9);
  });
});

describe('computeFaceMetrics', () => {
  it('calcula las razones esperadas sobre una cara sintética', () => {
    const metrics = computeFaceMetrics(buildKnownFace());

    // faceLength = 0.5, cheekWidth = 0.6, jawWidth = foreheadWidth = 0.3
    expect(metrics.lengthToWidth).toBeCloseTo(0.5 / 0.6, 6);
    expect(metrics.jawToCheek).toBeCloseTo(0.5, 6);
    expect(metrics.foreheadToCheek).toBeCloseTo(0.5, 6);
    expect(metrics.cheekboneDominance).toBeCloseTo(2, 6);
    expect(metrics.verticalBalance).toBeCloseTo(0.7, 6);
    // Ángulo gonial simétrico calculado geométricamente.
    expect(metrics.gonialAngle).toBeCloseTo(168.69, 1);
  });

  it('lanza si no hay suficientes landmarks', () => {
    expect(() => computeFaceMetrics([])).toThrow(/al menos 300/);
    expect(() => computeFaceMetrics(emptyLandmarks(10))).toThrow();
  });

  it('lanza si el ancho de pómulos es degenerado', () => {
    const landmarks = emptyLandmarks(478);
    // tragiones y resto colapsados en el mismo punto salvo frente/mentón
    place(landmarks, L.foreheadTop, 0, 0);
    place(landmarks, L.chinMid, 0, 1);
    expect(() => computeFaceMetrics(landmarks)).toThrow(/degenerados/);
  });
});
