import { describe, expect, it } from 'vitest';
import type { BeardStyleId, GuideKind } from '../../contracts/types';
import {
  BEARD_STYLES,
  BEARD_STYLE_LIST,
  getStyleById,
  isClosedPolygon,
  isOpenGuideLine,
} from './beardStyles';

const EXPECTED_IDS: readonly BeardStyleId[] = [
  'full-beard',
  'goatee-mustache',
  'chin-only',
  'italian-beard',
  'mustache-only',
];

const VALID_KINDS: readonly GuideKind[] = [
  'cheek',
  'neck',
  'mustache',
  'jaw',
  'outline',
];

const MIN_X = -0.3;
const MAX_X = 1.3;
const MIN_Y = -0.1;
const MAX_Y = 1.5;

describe('beardStyles', () => {
  it('define exactamente los 5 ids de estilo', () => {
    expect(Object.keys(BEARD_STYLES).sort()).toEqual(
      [...EXPECTED_IDS].sort(),
    );
  });

  it('respeta el orden de BEARD_STYLE_LIST', () => {
    expect(BEARD_STYLE_LIST.map((style) => style.id)).toEqual(EXPECTED_IDS);
  });

  it('getStyleById devuelve el mismo objeto del índice', () => {
    for (const id of EXPECTED_IDS) {
      expect(getStyleById(id)).toBe(BEARD_STYLES[id]);
      expect(getStyleById(id).id).toBe(id);
    }
  });

  it('cada estilo tiene metadatos completos', () => {
    for (const style of BEARD_STYLE_LIST) {
      expect(style.name.length).toBeGreaterThan(0);
      expect(style.tagline.length).toBeGreaterThan(0);
      expect(style.description.length).toBeGreaterThan(0);
      expect(style.lengthHint.length).toBeGreaterThan(0);
      expect(style.commitment).toBeGreaterThanOrEqual(1);
      expect(style.commitment).toBeLessThanOrEqual(5);
    }
  });

  it('cada estilo tiene al menos una beardZone cerrada y válida', () => {
    for (const style of BEARD_STYLE_LIST) {
      expect(style.beardZones.length).toBeGreaterThanOrEqual(1);
      for (const zone of style.beardZones) {
        expect(isClosedPolygon(zone)).toBe(true);
      }
    }
  });

  it('cada estilo tiene al menos una guideLine con kind válido y abierta', () => {
    for (const style of BEARD_STYLE_LIST) {
      expect(style.guideLines.length).toBeGreaterThanOrEqual(1);
      for (const line of style.guideLines) {
        expect(VALID_KINDS).toContain(line.kind);
        expect(isOpenGuideLine(line)).toBe(true);
        expect(line.label).toBeTruthy();
      }
    }
  });

  it('todos los puntos caen en el rango canónico razonable', () => {
    for (const style of BEARD_STYLE_LIST) {
      const allPoints = [
        ...style.beardZones.flat(),
        ...style.shaveZones.flat(),
        ...style.guideLines.flatMap((line) => line.points),
      ];
      expect(allPoints.length).toBeGreaterThan(0);
      for (const point of allPoints) {
        expect(point.x).toBeGreaterThanOrEqual(MIN_X);
        expect(point.x).toBeLessThanOrEqual(MAX_X);
        expect(point.y).toBeGreaterThanOrEqual(MIN_Y);
        expect(point.y).toBeLessThanOrEqual(MAX_Y);
      }
    }
  });

  it('la extensión de cuello solo aparece en estilos con barba larga', () => {
    const neckLines = BEARD_STYLE_LIST.filter((style) =>
      style.guideLines.some((line) => line.kind === 'neck'),
    ).map((style) => style.id);
    expect(neckLines).toContain('full-beard');
    expect(neckLines).toContain('italian-beard');
    expect(neckLines).not.toContain('mustache-only');
  });
});
