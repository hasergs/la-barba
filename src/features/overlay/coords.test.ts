import { describe, expect, it } from 'vitest';
import type { NormPoint, Point } from '../../contracts/types';
import {
  createViewMapper,
  mapPolygon,
  mapPolyline,
  polygonPath,
} from './coords';

const VIDEO_W = 1280;
const VIDEO_H = 720;
const CANVAS_W = 400;
const CANVAS_H = 800;

/** vw=1280/vh=720 en canvas 400x800 → cover recorta a lo ancho. */
function landscapeMapper(mirrored: boolean) {
  return createViewMapper({
    videoWidth: VIDEO_W,
    videoHeight: VIDEO_H,
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    mirrored,
  });
}

describe('createViewMapper (cover)', () => {
  it('calcula scale y offsets para vídeo 1280x720 en canvas 400x800', () => {
    const mapper = landscapeMapper(false);
    const expectedScale = CANVAS_H / VIDEO_H; // 800/720 gana sobre 400/1280

    expect(mapper.scale).toBeCloseTo(expectedScale, 10);
    expect(mapper.offsetY).toBeCloseTo(0, 10);
    expect(mapper.offsetX).toBeCloseTo(
      (CANVAS_W - VIDEO_W * expectedScale) / 2,
      10,
    );
  });

  it('posiciona las esquinas del vídeo según el recorte cover', () => {
    const mapper = landscapeMapper(false);

    expect(mapper.toCanvasX(0)).toBeCloseTo(mapper.offsetX, 10);
    expect(mapper.toCanvasX(1)).toBeCloseTo(
      VIDEO_W * mapper.scale + mapper.offsetX,
      10,
    );
    expect(mapper.toCanvasY(0)).toBeCloseTo(mapper.offsetY, 10);
    expect(mapper.toCanvasY(1)).toBeCloseTo(
      VIDEO_H * mapper.scale + mapper.offsetY,
      10,
    );
  });

  it('devuelve offsets 0 cuando vídeo y canvas comparten relación de aspecto', () => {
    const mapper = createViewMapper({
      videoWidth: 1280,
      videoHeight: 720,
      canvasWidth: 640,
      canvasHeight: 360,
      mirrored: false,
    });

    expect(mapper.scale).toBeCloseTo(0.5, 10);
    expect(mapper.offsetX).toBeCloseTo(0, 10);
    expect(mapper.offsetY).toBeCloseTo(0, 10);
    expect(mapper.toCanvasX(1)).toBeCloseTo(640, 10);
    expect(mapper.toCanvasY(1)).toBeCloseTo(360, 10);
  });
});

describe('mirrored', () => {
  it('invierte X respecto a false', () => {
    const plain = landscapeMapper(false);
    const mirror = landscapeMapper(true);

    for (const x of [0, 0.25, 0.5, 0.75, 1]) {
      expect(mirror.toCanvasX(x)).toBeCloseTo(
        CANVAS_W - plain.toCanvasX(x),
        0,
      );
    }
  });

  it('mantiene la Y igual que sin espejo', () => {
    const plain = landscapeMapper(false);
    const mirror = landscapeMapper(true);

    for (const y of [0, 0.3, 0.9, 1]) {
      expect(mirror.toCanvasY(y)).toBeCloseTo(plain.toCanvasY(y), 1);
    }
  });

  it('labelX coincide con toCanvasX', () => {
    const mapper = landscapeMapper(true);
    expect(mapper.labelX(0.4)).toBeCloseTo(mapper.toCanvasX(0.4), 10);
  });
});

describe('mapPolygon / mapPolyline', () => {
  const polygon: NormPoint[] = [
    { x: 0.1, y: 0.2 },
    { x: 0.8, y: 0.25 },
    { x: 0.75, y: 0.9 },
    { x: 0.2, y: 0.85 },
    { x: 0.15, y: 0.5 },
  ];

  it('conserva el número de puntos', () => {
    const mapper = landscapeMapper(true);
    expect(mapPolygon(polygon, mapper)).toHaveLength(polygon.length);
    expect(mapPolyline(polygon, mapper)).toHaveLength(polygon.length);
  });

  it('mapea cada punto como lo hace toCanvas', () => {
    const mapper = landscapeMapper(false);
    const mapped = mapPolygon(polygon, mapper);
    polygon.forEach((point, index) => {
      const expected = mapper.toCanvas(point);
      expect(mapped[index]?.x).toBeCloseTo(expected.x, 10);
      expect(mapped[index]?.y).toBeCloseTo(expected.y, 10);
    });
  });
});

describe('polygonPath', () => {
  it('construye el path cerrado con moveTo + lineTo + closePath', () => {
    const calls = { beginPath: 0, moveTo: 0, lineTo: 0, closePath: 0 };
    const ctx = {
      beginPath: () => {
        calls.beginPath += 1;
      },
      moveTo: () => {
        calls.moveTo += 1;
      },
      lineTo: () => {
        calls.lineTo += 1;
      },
      closePath: () => {
        calls.closePath += 1;
      },
    } as unknown as CanvasRenderingContext2D;

    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    polygonPath(ctx, points);

    expect(calls.beginPath).toBe(1);
    expect(calls.moveTo).toBe(1);
    expect(calls.lineTo).toBe(points.length - 1);
    expect(calls.closePath).toBe(1);
  });

  it('no lanza con ctx nulo ni listas vacías', () => {
    expect(() =>
      polygonPath(null as unknown as CanvasRenderingContext2D, []),
    ).not.toThrow();
  });
});
