import { describe, expect, it } from 'vitest';
import type { BeardStyleId } from '../../contracts/types';
import {
  BEARD_STYLES,
  BEARD_STYLE_LIST,
  getStyleById,
} from './beardStyles';

const EXPECTED_IDS: readonly BeardStyleId[] = [
  'full-beard',
  'goatee-mustache',
  'chin-only',
  'italian-beard',
  'mustache-only',
];

describe('beardStyles (metadatos)', () => {
  it('define exactamente los 5 ids de estilo', () => {
    expect(Object.keys(BEARD_STYLES).sort()).toEqual([...EXPECTED_IDS].sort());
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

  it('ya NO contiene geometría (se deriva de los landmarks)', () => {
    for (const style of BEARD_STYLE_LIST) {
      const raw = style as unknown as Record<string, unknown>;
      expect(raw.beardZones).toBeUndefined();
      expect(raw.shaveZones).toBeUndefined();
      expect(raw.guideLines).toBeUndefined();
    }
  });
});
