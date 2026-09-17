import { describe, expect, it } from 'vitest';
import { L } from '../../contracts/landmarks';
import type { Landmark } from '../../contracts/types';
import { computeTrackingQuality } from './quality';

const FRAME_WIDTH = 1280;
const FRAME_HEIGHT = 720;
const TOTAL_LANDMARKS = 478;

interface FacePoint {
  index: number;
  x: number;
  y: number;
}

function buildFace(points: FacePoint[]): Landmark[] {
  const landmarks: Landmark[] = [];
  for (let i = 0; i < TOTAL_LANDMARKS; i += 1) {
    landmarks.push({ x: 0.5, y: 0.5, z: 0 });
  }
  for (const point of points) {
    landmarks[point.index] = { x: point.x, y: point.y, z: 0 };
  }
  return landmarks;
}

/** Rostro frontal, centrado y de tamaño ideal (altura ≈ 0.65). */
function idealFace(offsetX = 0, scale = 1): Landmark[] {
  const y = (value: number): number => 0.5 + (value - 0.5) * scale;
  const x = (value: number): number => offsetX + 0.5 + (value - 0.5) * scale;
  return buildFace([
    { index: L.foreheadTop, x: x(0.5), y: y(0.175) },
    { index: L.chinMid, x: x(0.5), y: y(0.825) },
    { index: L.noseTip, x: x(0.5), y: y(0.5) },
    { index: L.eyeRightOuter, x: x(0.36), y: y(0.42) },
    { index: L.eyeRightInner, x: x(0.44), y: y(0.42) },
    { index: L.eyeLeftInner, x: x(0.56), y: y(0.42) },
    { index: L.eyeLeftOuter, x: x(0.64), y: y(0.42) },
    { index: L.cheekRight, x: x(0.3), y: y(0.55) },
    { index: L.cheekLeft, x: x(0.7), y: y(0.55) },
  ]);
}

describe('computeTrackingQuality', () => {
  it('da calidad alta y estable para un rostro ideal', () => {
    const result = computeTrackingQuality(idealFace(), FRAME_WIDTH, FRAME_HEIGHT);

    expect(result.quality).toBeGreaterThan(0.9);
    expect(result.unstable).toBe(false);
  });

  it('marca inestable un rostro diminuto', () => {
    const result = computeTrackingQuality(
      idealFace(0, 0.2),
      FRAME_WIDTH,
      FRAME_HEIGHT,
    );

    expect(result.unstable).toBe(true);
  });

  it('marca inestable un rostro muy descentrado', () => {
    const result = computeTrackingQuality(
      idealFace(0.35),
      FRAME_WIDTH,
      FRAME_HEIGHT,
    );

    expect(result.unstable).toBe(true);
  });

  it('devuelve calidad 0 si faltan landmarks', () => {
    const result = computeTrackingQuality(
      idealFace().slice(0, 10),
      FRAME_WIDTH,
      FRAME_HEIGHT,
    );

    expect(result.quality).toBe(0);
    expect(result.unstable).toBe(true);
  });
});
