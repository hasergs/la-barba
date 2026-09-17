import { describe, expect, it } from 'vitest';
import type { OverlayModel, Point } from '../../contracts/types';
import { createViewMapper } from './coords';
import { computeLabelAnchor, drawOverlay, makeHatchPattern } from './render';

function makeFakeCtx() {
  const calls: Record<string, number> = {};
  const record =
    (name: string) =>
    (..._args: unknown[]): void => {
      calls[name] = (calls[name] ?? 0) + 1;
    };

  const ctx = {
    canvas: { width: 400, height: 800 },
    save: record('save'),
    restore: record('restore'),
    setTransform: record('setTransform'),
    clearRect: record('clearRect'),
    beginPath: record('beginPath'),
    moveTo: record('moveTo'),
    lineTo: record('lineTo'),
    closePath: record('closePath'),
    fill: record('fill'),
    stroke: record('stroke'),
    arc: record('arc'),
    fillRect: record('fillRect'),
    setLineDash: record('setLineDash'),
    roundRect: record('roundRect'),
    fillText: record('fillText'),
    measureText: () => ({ width: 42 }) as TextMetrics,
    createPattern: () => null,
  };

  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const mapper = createViewMapper({
  videoWidth: 1280,
  videoHeight: 720,
  canvasWidth: 400,
  canvasHeight: 800,
  mirrored: true,
});

const model: OverlayModel = {
  styleId: 'goatee-mustache',
  beardZones: [
    [
      { x: 0.4, y: 0.6 },
      { x: 0.6, y: 0.6 },
      { x: 0.6, y: 0.9 },
      { x: 0.4, y: 0.9 },
    ],
  ],
  shaveZones: [
    [
      { x: 0.1, y: 0.2 },
      { x: 0.3, y: 0.2 },
      { x: 0.3, y: 0.4 },
      { x: 0.1, y: 0.4 },
    ],
  ],
  guideLines: [
    {
      kind: 'neck',
      points: [
        { x: 0.3, y: 0.8 },
        { x: 0.5, y: 0.85 },
        { x: 0.7, y: 0.8 },
      ],
      label: 'Línea de cuello',
    },
    { kind: 'cheek', points: [{ x: 0.2, y: 0.5 }] },
  ],
  midlineX: 0.5,
};

describe('computeLabelAnchor', () => {
  it('devuelve el punto medio de una polilínea de dos puntos', () => {
    const anchor = computeLabelAnchor([
      { x: 0, y: 0 },
      { x: 10, y: 20 },
    ]);
    expect(anchor.x).toBeCloseTo(5, 10);
    expect(anchor.y).toBeCloseTo(10, 10);
  });

  it('devuelve el punto medio medido por longitud de arco', () => {
    const anchor = computeLabelAnchor([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
    expect(anchor.x).toBeCloseTo(10, 10);
    expect(anchor.y).toBeCloseTo(0, 10);
  });

  it('devuelve el único punto cuando la lista tiene un elemento', () => {
    expect(computeLabelAnchor([{ x: 3, y: 7 }])).toEqual({ x: 3, y: 7 });
  });

  it('devuelve {0,0} sin puntos y no lanza', () => {
    expect(computeLabelAnchor([])).toEqual({ x: 0, y: 0 });
  });

  it('devuelve el primer punto si todos coinciden (longitud 0)', () => {
    const anchor = computeLabelAnchor([
      { x: 4, y: 4 },
      { x: 4, y: 4 },
    ]);
    expect(anchor).toEqual({ x: 4, y: 4 });
  });
});

describe('drawOverlay (ctx falso, sin canvas real)', () => {
  it('no lanza con un ctx no-op y pinta todas las etapas', () => {
    const { ctx, calls } = makeFakeCtx();
    expect(() =>
      drawOverlay(ctx, { model, mapper, showLandmarks: true, landmarks: [{ x: 0.5, y: 0.5, z: 0 }], dpr: 2 }),
    ).not.toThrow();

    expect(calls.clearRect).toBe(1);
    expect(calls.save ?? 0).toBeGreaterThan(0);
    expect(calls.restore).toBe(calls.save);
    expect(calls.stroke ?? 0).toBeGreaterThanOrEqual(3);
    expect(calls.fill ?? 0).toBeGreaterThanOrEqual(3);
    expect(calls.fillText).toBe(1);
    expect(calls.arc).toBe(1);
  });

  it('no dibuja etiquetas sin label y omite landmarks si están ocultos', () => {
    const { ctx, calls } = makeFakeCtx();
    const noLabelModel: OverlayModel = {
      ...model,
      guideLines: [{ kind: 'outline', points: model.guideLines[0]!.points }],
    };
    drawOverlay(ctx, { model: noLabelModel, mapper });

    expect(calls.fillText ?? 0).toBe(0);
    expect(calls.arc ?? 0).toBe(0);
  });

  it('tolera ctx no disponible sin lanzar', () => {
    expect(() =>
      drawOverlay(null as unknown as CanvasRenderingContext2D, {
        model,
        mapper,
      }),
    ).not.toThrow();
  });
});

describe('makeHatchPattern', () => {
  it('devuelve null sin ctx válido', () => {
    expect(
      makeHatchPattern(null as unknown as CanvasRenderingContext2D, '#ff5d6c'),
    ).toBeNull();
  });

  it('devuelve null si el ctx no soporta createPattern', () => {
    const ctx = {} as unknown as CanvasRenderingContext2D;
    expect(makeHatchPattern(ctx, '#ff5d6c')).toBeNull();
  });

  it('devuelve null en jsdom (canvas 2d no implementado)', () => {
    const { ctx } = makeFakeCtx();
    expect(makeHatchPattern(ctx, '#ff5d6c')).toBeNull();
  });
});

describe('Tipos de punto', () => {
  it('computeLabelAnchor devuelve un Point', () => {
    const anchor: Point = computeLabelAnchor([
      { x: 0, y: 0 },
      { x: 2, y: 2 },
    ]);
    expect(typeof anchor.x).toBe('number');
    expect(typeof anchor.y).toBe('number');
  });
});
