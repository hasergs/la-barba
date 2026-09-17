import { describe, expect, it } from 'vitest';
import type { Landmark } from '../../contracts/types';
import { L } from '../../contracts/landmarks';
import { lm } from '../../contracts/access';
import { BEARD_STYLES, getStyleById } from './beardStyles';
import { buildOverlayModel, createFaceProjector } from './maskBuilder';

const EPS = 1e-6;

/**
 * Landmarks sintéticos: cara frontal centrada, sin roll.
 *   frente (10)      = (0.5, 0.2)
 *   mentón (152)     = (0.5, 0.8)
 *   tragion der (234)= (0.2, 0.5)
 *   tragion izq (454)= (0.8, 0.5)
 *   ojos (33/263)    = misma y → roll 0
 */
function makeLandmarks(): Landmark[] {
  const points: Landmark[] = Array.from({ length: 478 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
  }));
  points[L.foreheadTop] = { x: 0.5, y: 0.2, z: 0 };
  points[L.chinMid] = { x: 0.5, y: 0.8, z: 0 };
  points[L.tragionRight] = { x: 0.2, y: 0.5, z: 0 };
  points[L.tragionLeft] = { x: 0.8, y: 0.5, z: 0 };
  points[L.eyeRightOuter] = { x: 0.35, y: 0.4, z: 0 };
  points[L.eyeLeftOuter] = { x: 0.65, y: 0.4, z: 0 };
  return points;
}

describe('createFaceProjector', () => {
  it('lanza si no hay landmarks suficientes', () => {
    expect(() => createFaceProjector([])).toThrow();
  });

  it('calcula roll 0 y midlineX 0.5 con la cara sintética', () => {
    const projector = createFaceProjector(makeLandmarks());
    expect(projector.roll).toBeCloseTo(0, 6);
    expect(projector.midlineX).toBeCloseTo(0.5, 6);
  });

  it('mapea el centro canónico (0.5,0.5) al centro de la cara', () => {
    const projector = createFaceProjector(makeLandmarks());
    const center = projector.toFrame({ x: 0.5, y: 0.5 });
    expect(center.x).toBeCloseTo(0.5, 6);
    expect(center.y).toBeCloseTo(0.5, 6);
  });

  it('mapea cy=1 en el mentón y cy=1.25 por debajo', () => {
    const projector = createFaceProjector(makeLandmarks());
    const chin = projector.toFrame({ x: 0.5, y: 1 });
    expect(chin.y).toBeCloseTo(0.8, 6);

    const belowChin = projector.toFrame({ x: 0.5, y: 1.25 });
    expect(belowChin.y).toBeGreaterThan(0.8);
    expect(belowChin.y).toBeCloseTo(0.95, 6);
  });

  it('respeta el factor expand en la proyección', () => {
    const expanded = createFaceProjector(makeLandmarks(), 2);
    const center = expanded.toFrame({ x: 0.5, y: 0.5 });
    expect(center.x).toBeCloseTo(0.5, 6);
    expect(center.y).toBeCloseTo(0.5, 6);

    const chin = expanded.toFrame({ x: 0.5, y: 1 });
    expect(chin.y).toBeCloseTo(1.1, 6);
  });

  it('los extremos cx 0/1 caen en los tragiones', () => {
    const landmarks = makeLandmarks();
    const projector = createFaceProjector(landmarks);
    const left = projector.toFrame({ x: 0, y: 0.5 });
    const right = projector.toFrame({ x: 1, y: 0.5 });
    expect(left.x).toBeCloseTo(lm(landmarks, L.tragionRight).x, 6);
    expect(right.x).toBeCloseTo(lm(landmarks, L.tragionLeft).x, 6);
  });
});

describe('buildOverlayModel', () => {
  it('proyecta todas las geometrías al frame', () => {
    const style = getStyleById('full-beard');
    const model = buildOverlayModel(style, makeLandmarks());

    expect(model.styleId).toBe('full-beard');
    expect(model.midlineX).toBeCloseTo(0.5, 6);
    expect(model.beardZones.length).toBe(style.beardZones.length);
    expect(model.shaveZones.length).toBe(style.shaveZones.length);
    expect(model.guideLines.length).toBe(style.guideLines.length);

    for (const line of model.guideLines) {
      expect(line.points.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('no muta los estilos originales', () => {
    const before = JSON.stringify(BEARD_STYLES);
    for (const style of Object.values(BEARD_STYLES)) {
      buildOverlayModel(style, makeLandmarks());
    }
    expect(JSON.stringify(BEARD_STYLES)).toBe(before);
  });

  it('devuelve puntos nuevos (no las mismas referencias)', () => {
    const style = getStyleById('goatee-mustache');
    const model = buildOverlayModel(style, makeLandmarks());
    const originalZone = style.beardZones[0]!;
    const projectedZone = model.beardZones[0]!;
    expect(projectedZone).not.toBe(originalZone);
    expect(projectedZone[0]).not.toBe(originalZone[0]);
    expect(projectedZone).toHaveLength(originalZone.length);
  });

  it('cy=1.25 proyectado queda por debajo del mentón en cada estilo', () => {
    const projector = createFaceProjector(makeLandmarks());
    const below = projector.toFrame({ x: 0.5, y: 1.25 });
    const chin = projector.toFrame({ x: 0.5, y: 1 });
    expect(below.y - chin.y).toBeGreaterThan(EPS);
  });
});
