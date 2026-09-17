import { describe, expect, it } from 'vitest';
import type { BeardStyleId, GuideKind, NormPolygon } from '../../contracts/types';
import { JAW_CHAIN, L } from '../../contracts/landmarks';
import { pointInPolygon } from '../../lib/geometry';
import { dist } from '../../lib/math';
import { BEARD_STYLES, BEARD_STYLE_LIST, getStyleById } from './beardStyles';
import { buildOverlayModel, createFaceFrame } from './maskBuilder';
import { makeFaceLandmarks } from './landmarkFixture';

/** Mapa exacto de líneas guía esperadas por estilo. */
const EXPECTED_LINES: Record<
  BeardStyleId,
  readonly { kind: GuideKind; label: string }[]
> = {
  'full-beard': [
    { kind: 'cheek', label: 'Línea de mejilla derecha' },
    { kind: 'cheek', label: 'Línea de mejilla izquierda' },
    { kind: 'neck', label: 'Línea de cuello' },
  ],
  'italian-beard': [
    { kind: 'cheek', label: 'Línea de mejilla derecha' },
    { kind: 'cheek', label: 'Línea de mejilla izquierda' },
    { kind: 'jaw', label: 'Línea de mandíbula' },
    { kind: 'neck', label: 'Línea de cuello' },
  ],
  'goatee-mustache': [
    { kind: 'mustache', label: 'Línea de bigote' },
    { kind: 'outline', label: 'Contorno de la perilla' },
    { kind: 'neck', label: 'Línea de cuello' },
  ],
  'chin-only': [
    { kind: 'outline', label: 'Contorno de la perilla' },
    { kind: 'mustache', label: 'Línea de bigote' },
    { kind: 'neck', label: 'Línea de cuello' },
  ],
  'mustache-only': [{ kind: 'mustache', label: 'Línea de bigote' }],
};

/** Comisura derecha = la de menor x (la derecha del sujeto en la imagen). */
function rightCornerPoint(): { x: number; y: number } {
  const frame = createFaceFrame(makeFaceLandmarks());
  const a = frame.point(L.mouthRight);
  const b = frame.point(L.mouthLeft);
  return a.x <= b.x ? a : b;
}

describe('createFaceFrame', () => {
  it('lanza si no hay landmarks suficientes', () => {
    expect(() => createFaceFrame([])).toThrow();
    expect(() => createFaceFrame(makeFaceLandmarks().slice(0, 299))).toThrow();
  });

  it('mide el rostro del fixture de forma coherente', () => {
    const frame = createFaceFrame(makeFaceLandmarks());
    expect(frame.midlineX).toBeGreaterThanOrEqual(0.48);
    expect(frame.midlineX).toBeLessThanOrEqual(0.52);
    expect(frame.faceHeight).toBeGreaterThan(0.4);
    expect(frame.cheekWidth).toBeGreaterThan(0);
    expect(frame.jawWidth).toBeGreaterThan(0);
    expect(frame.mouthWidth).toBeGreaterThan(0);
    expect(frame.roll).toBeCloseTo(0, 6);
  });

  it('point/distance/shift/towardCenter son coherentes', () => {
    const frame = createFaceFrame(makeFaceLandmarks());
    expect(frame.point(L.chinMid)).toEqual({ x: 0.5, y: 0.74 });
    expect(frame.distance(L.foreheadTop, L.chinMid)).toBeCloseTo(0.46, 6);

    const shifted = frame.shift({ x: 0.4, y: 0.4 }, 0.1, -0.05);
    expect(shifted.x).toBeCloseTo(0.5, 6);
    expect(shifted.y).toBeCloseTo(0.35, 6);

    const toward = frame.towardCenter({ x: 0.3, y: 0.6 }, 0.05);
    expect(toward.x).toBeCloseTo(0.35, 6);
    expect(toward.y).toBe(0.6);

    // no cruza la línea media aunque el paso sea mayor que la distancia
    const clamped = frame.towardCenter({ x: 0.48, y: 0.6 }, 0.5);
    expect(clamped.x).toBeCloseTo(frame.midlineX, 6);
  });
});

describe('buildOverlayModel · alineación real', () => {
  it('full-beard: la zona cubre la mandíbula y termina en la línea de cuello', () => {
    const frame = createFaceFrame(makeFaceLandmarks());
    const model = buildOverlayModel(getStyleById('full-beard'), makeFaceLandmarks());
    const zone = model.beardZones[0];
    expect(zone).toBeDefined();
    const H = frame.faceHeight;
    const chin = frame.point(L.chinMid);

    // Justo encima del mentón (bajo el labio inferior) hay barba.
    expect(
      pointInPolygon({ x: frame.midlineX, y: chin.y - 0.03 * H }, zone!),
    ).toBe(true);

    // Justo por debajo de la línea de cuello NO hay barba: se afeita.
    const neck = model.guideLines.find((line) => line.kind === 'neck');
    expect(neck).toBeDefined();
    const lowestNeck = neck!.points.reduce((a, b) => (b.y > a.y ? b : a));
    expect(
      pointInPolygon({ x: lowestNeck.x, y: lowestNeck.y + 0.06 * H }, zone!),
    ).toBe(false);

    // El borde inferior de la zona COINCIDE con la línea de cuello (no hay "V").
    const lowestZone = zone!.reduce((a, b) => (b.y > a.y ? b : a));
    expect(lowestZone.y).toBeCloseTo(lowestNeck.y, 6);
    expect(lowestZone.y - chin.y).toBeLessThan(0.1 * H);
  });

  it('la línea de cuello es un arco en U bajo el mentón (no sigue la mandíbula)', () => {
    const frame = createFaceFrame(makeFaceLandmarks());
    const model = buildOverlayModel(getStyleById('full-beard'), makeFaceLandmarks());
    const chin = frame.point(L.chinMid);
    const neck = model.guideLines.find((line) => line.kind === 'neck');
    expect(neck).toBeDefined();
    const points = neck!.points;

    expect(points.length).toBeGreaterThanOrEqual(5);

    // Los extremos están a la altura de los tragiones (toda la anchura).
    expect(points[0]!.x).toBeCloseTo(frame.point(L.tragionRight).x, 2);
    expect(points[points.length - 1]!.x).toBeCloseTo(
      frame.point(L.tragionLeft).x,
      2,
    );
    // Simetría.
    expect(points[0]!.y).toBeCloseTo(points[points.length - 1]!.y, 6);

    // El centro es el punto más bajo y queda justo bajo el mentón.
    const lowest = points.reduce((a, b) => (b.y > a.y ? b : a));
    expect(lowest.x).toBeCloseTo(frame.midlineX, 2);
    expect(lowest.y).toBeGreaterThan(chin.y);
    expect(lowest.y - chin.y).toBeLessThan(0.1 * frame.faceHeight);

    // Forma de U: el centro baja claramente más que los extremos.
    expect(lowest.y - points[0]!.y).toBeGreaterThan(0.1 * frame.faceHeight);
  });

  it('italian-beard: la línea de mandíbula sigue la cadena mandibular real', () => {
    const frame = createFaceFrame(makeFaceLandmarks());
    const model = buildOverlayModel(getStyleById('italian-beard'), makeFaceLandmarks());
    const jaw = model.guideLines.find((line) => line.kind === 'jaw');
    expect(jaw).toBeDefined();
    expect(jaw!.points).toHaveLength(JAW_CHAIN.length);
    JAW_CHAIN.forEach((index, i) => {
      const expected = frame.point(index);
      expect(jaw!.points[i]!.x).toBeCloseTo(expected.x, 6);
      expect(jaw!.points[i]!.y).toBeCloseTo(expected.y, 6);
    });
  });

  it('la línea de mejilla termina junto a la comisura y es de tipo cheek', () => {
    const model = buildOverlayModel(getStyleById('full-beard'), makeFaceLandmarks());
    const cheek = model.guideLines.find(
      (line) => line.kind === 'cheek' && line.label?.includes('derecha'),
    );
    expect(cheek).toBeDefined();
    const start = cheek!.points[0]!;
    const corner = rightCornerPoint();
    expect(dist(start.x, start.y, corner.x, corner.y)).toBeLessThan(0.02);
    expect(cheek!.kind).toBe('cheek');
  });

  it('la banda de bigote contiene el labio superior (0)', () => {
    const frame = createFaceFrame(makeFaceLandmarks());
    const lip = frame.point(L.upperLipTop);
    for (const id of ['mustache-only', 'goatee-mustache'] as const) {
      const model = buildOverlayModel(getStyleById(id), makeFaceLandmarks());
      const contains = model.beardZones.some((zone) =>
        pointInPolygon(lip, zone),
      );
      expect(contains).toBe(true);
    }
  });

  it('italian-beard tiene la línea de mejilla más ALTA que full-beard', () => {
    const italian = buildOverlayModel(getStyleById('italian-beard'), makeFaceLandmarks());
    const full = buildOverlayModel(getStyleById('full-beard'), makeFaceLandmarks());
    const italianCheek = italian.guideLines.find((line) => line.kind === 'cheek');
    const fullCheek = full.guideLines.find((line) => line.kind === 'cheek');
    expect(italianCheek).toBeDefined();
    expect(fullCheek).toBeDefined();
    // Punto medio de la línea: pómulo (italiana) vs gonion (completa).
    expect(italianCheek!.points[1]!.y).toBeLessThan(fullCheek!.points[1]!.y);
  });

  it('full-beard no afeita mejillas: sus shaveZones quedan bajo el pómulo', () => {
    const frame = createFaceFrame(makeFaceLandmarks());
    const model = buildOverlayModel(getStyleById('full-beard'), makeFaceLandmarks());
    expect(model.shaveZones.length).toBeGreaterThanOrEqual(1);
    const cheekTop = Math.min(
      frame.point(L.cheekRight).y,
      frame.point(L.cheekLeft).y,
    );
    for (const zone of model.shaveZones) {
      for (const point of zone) {
        expect(point.y).toBeGreaterThan(cheekTop);
      }
    }
  });

  it('todas las geometrías tienen ≥3 puntos, son finitas y están en rango', () => {
    for (const style of BEARD_STYLE_LIST) {
      const model = buildOverlayModel(style, makeFaceLandmarks());
      const polygons: NormPolygon[] = [
        ...model.beardZones,
        ...model.shaveZones,
        ...model.guideLines.map((line) => line.points),
      ];
      expect(model.beardZones.length).toBeGreaterThanOrEqual(1);
      for (const polygon of polygons) {
        expect(polygon.length).toBeGreaterThanOrEqual(3);
        for (const point of polygon) {
          expect(Number.isFinite(point.x)).toBe(true);
          expect(Number.isFinite(point.y)).toBe(true);
          expect(point.x).toBeGreaterThanOrEqual(-0.3);
          expect(point.x).toBeLessThanOrEqual(1.3);
          expect(point.y).toBeGreaterThanOrEqual(-0.3);
          expect(point.y).toBeLessThanOrEqual(1.3);
        }
      }
    }
  });

  it('produce las guideLines exactas de cada estilo', () => {
    for (const [id, expected] of Object.entries(EXPECTED_LINES)) {
      const model = buildOverlayModel(
        getStyleById(id as BeardStyleId),
        makeFaceLandmarks(),
      );
      expect(
        model.guideLines.map((line) => ({ kind: line.kind, label: line.label })),
      ).toEqual(expected);
    }
  });

  it('NO muta BEARD_STYLES (ni los puntos de otros tests)', () => {
    const before = JSON.stringify(BEARD_STYLES);
    for (const style of BEARD_STYLE_LIST) {
      buildOverlayModel(style, makeFaceLandmarks());
    }
    expect(JSON.stringify(BEARD_STYLES)).toBe(before);
  });

  it('devuelve puntos nuevos, no referencias compartidas', () => {
    const model = buildOverlayModel(getStyleById('goatee-mustache'), makeFaceLandmarks());
    const first = model.beardZones[0]!;
    const second = buildOverlayModel(
      getStyleById('goatee-mustache'),
      makeFaceLandmarks(),
    ).beardZones[0]!;
    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
  });

  it('respeta overrides del fixture (cara desplazada)', () => {
    const shifted = makeFaceLandmarks({
      [L.chinMid]: { x: 0.55, y: 0.78 },
    });
    const frame = createFaceFrame(shifted);
    expect(frame.point(L.chinMid)).toEqual({ x: 0.55, y: 0.78 });
    const model = buildOverlayModel(getStyleById('chin-only'), shifted);
    expect(pointInPolygon(frame.point(L.chinMid), model.beardZones[0]!)).toBe(
      true,
    );
  });
});
