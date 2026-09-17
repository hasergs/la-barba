import { describe, expect, it } from 'vitest';
import type { NormPoint } from '../contracts/types';
import {
  boundingBox,
  chaikinSmooth,
  pointInPolygon,
  polygonArea,
  polygonCentroid,
  polylineLength,
  resamplePolyline,
  rotatePolygon,
  scalePolygon,
  translatePolygon,
} from './geometry';

/** Cuadrado unitario en sentido antihorario. */
const UNIT_SQUARE: NormPoint[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

describe('boundingBox', () => {
  it('encaja el cuadrado unitario', () => {
    expect(boundingBox(UNIT_SQUARE)).toEqual({
      minX: 0,
      minY: 0,
      maxX: 1,
      maxY: 1,
      width: 1,
      height: 1,
    });
  });

  it('devuelve ceros con un array vacío', () => {
    expect(boundingBox([])).toEqual({
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
    });
  });
});

describe('polygonArea', () => {
  it('calcula el área del cuadrado unitario', () => {
    expect(polygonArea(UNIT_SQUARE)).toBeCloseTo(1, 9);
  });

  it('es independiente de la orientación (usa valor absoluto)', () => {
    const clockwise = [...UNIT_SQUARE].reverse();
    expect(polygonArea(clockwise)).toBeCloseTo(1, 9);
  });

  it('devuelve 0 para menos de 3 puntos', () => {
    expect(polygonArea([])).toBe(0);
    expect(polygonArea([{ x: 0, y: 0 }, { x: 1, y: 1 }])).toBe(0);
  });
});

describe('polygonCentroid', () => {
  it('centra el cuadrado unitario en (0.5, 0.5)', () => {
    const centroid = polygonCentroid(UNIT_SQUARE);
    expect(centroid.x).toBeCloseTo(0.5, 9);
    expect(centroid.y).toBeCloseTo(0.5, 9);
  });

  it('cae a la media con polígono degenerado', () => {
    const line = [
      { x: 0, y: 0 },
      { x: 2, y: 2 },
      { x: 4, y: 4 },
    ];
    const centroid = polygonCentroid(line);
    expect(centroid.x).toBeCloseTo(2, 9);
    expect(centroid.y).toBeCloseTo(2, 9);
  });
});

describe('pointInPolygon', () => {
  it('detecta un punto interior', () => {
    expect(pointInPolygon({ x: 0.5, y: 0.5 }, UNIT_SQUARE)).toBe(true);
  });

  it('detecta un punto exterior', () => {
    expect(pointInPolygon({ x: 1.5, y: 0.5 }, UNIT_SQUARE)).toBe(false);
    expect(pointInPolygon({ x: -0.1, y: 0.5 }, UNIT_SQUARE)).toBe(false);
  });
});

describe('translatePolygon', () => {
  it('desplaza todos los vértices sin mutar la entrada', () => {
    const moved = translatePolygon(UNIT_SQUARE, 2, -1);
    expect(moved[0]).toEqual({ x: 2, y: -1 });
    expect(moved[2]).toEqual({ x: 3, y: 0 });
    expect(UNIT_SQUARE[0]).toEqual({ x: 0, y: 0 });
  });
});

describe('scalePolygon', () => {
  it('escala respecto a un centro', () => {
    const scaled = scalePolygon(UNIT_SQUARE, 0.5, 0.5, 2, 2);
    expect(scaled[0]).toEqual({ x: -0.5, y: -0.5 });
    expect(scaled[2]).toEqual({ x: 1.5, y: 1.5 });
  });
});

describe('rotatePolygon', () => {
  it('rota 90° alrededor del origen', () => {
    const rotated = rotatePolygon([{ x: 1, y: 0 }], 0, 0, Math.PI / 2);
    expect(rotated[0]!.x).toBeCloseTo(0, 9);
    expect(rotated[0]!.y).toBeCloseTo(1, 9);
  });
});

describe('polylineLength', () => {
  it('suma los segmentos del contorno abierto', () => {
    expect(polylineLength(UNIT_SQUARE)).toBeCloseTo(3, 9);
  });

  it('devuelve 0 con menos de 2 puntos', () => {
    expect(polylineLength([])).toBe(0);
    expect(polylineLength([{ x: 1, y: 1 }])).toBe(0);
  });
});

describe('resamplePolyline', () => {
  it('produce exactamente `count` puntos', () => {
    const sampled = resamplePolyline(UNIT_SQUARE, 8);
    expect(sampled).toHaveLength(8);
  });

  it('interpola equiespaciado sobre una recta', () => {
    const sampled = resamplePolyline(
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      3,
    );
    expect(sampled).toHaveLength(3);
    expect(sampled[0]!.x).toBeCloseTo(0, 9);
    expect(sampled[1]!.x).toBeCloseTo(0.5, 9);
    expect(sampled[2]!.x).toBeCloseTo(1, 9);
  });

  it('devuelve [] si count <= 0', () => {
    expect(resamplePolyline(UNIT_SQUARE, 0)).toEqual([]);
  });
});

describe('chaikinSmooth', () => {
  it('duplica puntos por segmento en polilínea abierta y conserva extremos', () => {
    const smoothed = chaikinSmooth(UNIT_SQUARE, 1, false);
    expect(smoothed).toHaveLength(8);
    expect(smoothed[0]).toEqual({ x: 0, y: 0 });
    expect(smoothed[smoothed.length - 1]).toEqual({ x: 0, y: 1 });
  });

  it('no conserva extremos en polilínea cerrada', () => {
    const smoothed = chaikinSmooth(UNIT_SQUARE, 1, true);
    expect(smoothed).toHaveLength(8);
    expect(smoothed[0]).not.toEqual({ x: 0, y: 0 });
  });
});
