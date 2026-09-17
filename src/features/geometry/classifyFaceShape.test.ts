import { describe, expect, it } from 'vitest';
import type { Landmark } from '../../contracts/types';
import { FACE_SHAPES } from '../../contracts/types';
import { L } from '../../contracts/landmarks';
import { classifyFaceShape } from './classifyFaceShape';

/** Parámetros deseados de una cara sintética idealizada. */
interface ShapeSpec {
  lengthToWidth: number;
  jawToCheek: number;
  foreheadToCheek: number;
  gonialAngleDeg: number;
}

function emptyLandmarks(count: number): Landmark[] {
  return Array.from({ length: count }, () => ({ x: 0, y: 0, z: 0 }));
}

function place(
  landmarks: Landmark[],
  index: number,
  x: number,
  y: number,
): void {
  const point = landmarks[index];
  if (!point) throw new Error(`índice ${index} fuera de rango`);
  point.x = x;
  point.y = y;
}

/** Ángulo gonial (grados) en un gonion entre el mentón y el tragion. */
function gonialAngleAt(
  gonionX: number,
  gonionY: number,
  tragionX: number,
  tragionY: number,
  chinX: number,
  chinY: number,
): number {
  const toChin = Math.atan2(chinY - gonionY, chinX - gonionX);
  const toTragion = Math.atan2(tragionY - gonionY, tragionX - gonionX);
  let difference = toChin - toTragion;
  while (difference > Math.PI) difference -= 2 * Math.PI;
  while (difference < -Math.PI) difference += 2 * Math.PI;
  return (Math.abs(difference) * 180) / Math.PI;
}

/**
 * Construye 478 landmarks con las proporciones pedidas.
 *
 * El ancho de pómulos, la mandíbula, la frente y la longitud se fijan
 * directamente; el eje Y de los tragiones se resuelve por búsqueda en rejilla
 * para aproximar el ángulo gonial objetivo (la relación no es monótona en todo
 * el dominio, por eso se escanea en vez de resolver).
 */
function buildSyntheticFace(spec: ShapeSpec): Landmark[] {
  const landmarks = emptyLandmarks(478);
  const centerX = 0.5;
  const cheekWidth = 0.5;
  const faceLength = spec.lengthToWidth * cheekWidth;
  const jawWidth = spec.jawToCheek * cheekWidth;
  const foreheadWidth = spec.foreheadToCheek * cheekWidth;

  const gonionY = 0.3 * faceLength;
  const gonionXRight = centerX - jawWidth / 2;
  const tragionXRight = centerX - cheekWidth / 2;
  const chinY = faceLength;

  let tragionY = gonionY;
  let bestError = Infinity;
  const minY = gonionY - 3 * faceLength;
  const maxY = gonionY + 3 * faceLength;
  const steps = 2000;
  for (let i = 0; i <= steps; i++) {
    const candidateY = minY + ((maxY - minY) * i) / steps;
    const angle = gonialAngleAt(
      gonionXRight,
      gonionY,
      tragionXRight,
      candidateY,
      centerX,
      chinY,
    );
    const error = Math.abs(angle - spec.gonialAngleDeg);
    if (error < bestError) {
      bestError = error;
      tragionY = candidateY;
    }
  }

  place(landmarks, L.foreheadTop, centerX, 0);
  place(landmarks, L.chinMid, centerX, chinY);
  place(landmarks, L.tragionRight, centerX - cheekWidth / 2, tragionY);
  place(landmarks, L.tragionLeft, centerX + cheekWidth / 2, tragionY);
  place(landmarks, L.gonionRight, centerX - jawWidth / 2, gonionY);
  place(landmarks, L.gonionLeft, centerX + jawWidth / 2, gonionY);
  place(landmarks, L.foreheadRight, centerX - foreheadWidth / 2, 0.08 * faceLength);
  place(landmarks, L.foreheadLeft, centerX + foreheadWidth / 2, 0.08 * faceLength);
  place(landmarks, L.eyeRightOuter, centerX - 0.15, 0.5 * faceLength);
  place(landmarks, L.eyeLeftOuter, centerX + 0.15, 0.5 * faceLength);

  return landmarks;
}

function expectShape(spec: ShapeSpec, expected: string): void {
  const result = classifyFaceShape(buildSyntheticFace(spec));
  expect(result.shape).toBe(expected);
  expect(result.confidence).toBeGreaterThan(0);
  expect(result.confidence).toBeLessThanOrEqual(1);
}

describe('classifyFaceShape', () => {
  it('clasifica un rostro ovalado idealizado', () => {
    expectShape(
      { lengthToWidth: 1.45, jawToCheek: 0.85, foreheadToCheek: 0.97, gonialAngleDeg: 128 },
      'oval',
    );
  });

  it('clasifica un rostro redondo idealizado', () => {
    expectShape(
      { lengthToWidth: 1.1, jawToCheek: 0.98, foreheadToCheek: 0.92, gonialAngleDeg: 140 },
      'round',
    );
  });

  it('clasifica un rostro cuadrado idealizado', () => {
    expectShape(
      { lengthToWidth: 1.25, jawToCheek: 0.97, foreheadToCheek: 0.93, gonialAngleDeg: 120 },
      'square',
    );
  });

  it('clasifica un rostro alargado idealizado', () => {
    expectShape(
      { lengthToWidth: 1.75, jawToCheek: 0.85, foreheadToCheek: 0.95, gonialAngleDeg: 125 },
      'oblong',
    );
  });

  it('devuelve puntuaciones para las 7 formas y las métricas', () => {
    const result = classifyFaceShape(
      buildSyntheticFace({
        lengthToWidth: 1.45,
        jawToCheek: 0.85,
        foreheadToCheek: 0.97,
        gonialAngleDeg: 128,
      }),
    );

    expect(Object.keys(result.scores).sort()).toEqual([...FACE_SHAPES].sort());

    let sum = 0;
    for (const shape of FACE_SHAPES) {
      expect(result.scores[shape]).toBeGreaterThanOrEqual(0);
      expect(result.scores[shape]).toBeLessThanOrEqual(1);
      sum += result.scores[shape];
    }
    expect(sum).toBeCloseTo(1, 6);
    expect(result.metrics.lengthToWidth).toBeGreaterThan(0);
  });
});
