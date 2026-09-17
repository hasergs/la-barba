import { describe, expect, it } from 'vitest';
import type { BeardStyleId } from '../../contracts/types';
import { FACE_SHAPES } from '../../contracts/types';
import {
  STYLE_FIT_MATRIX,
  recommendStyles,
  styleFit,
} from './recommendationMatrix';

const STYLE_IDS: readonly BeardStyleId[] = [
  'full-beard',
  'goatee-mustache',
  'chin-only',
  'italian-beard',
  'mustache-only',
];

describe('recommendationMatrix', () => {
  it('cubre las 7 formas × 5 estilos', () => {
    expect(FACE_SHAPES).toHaveLength(7);
    for (const shape of FACE_SHAPES) {
      const row = STYLE_FIT_MATRIX[shape];
      expect(Object.keys(row).sort()).toEqual([...STYLE_IDS].sort());
    }
  });

  it('todos los fitScore están en 0..100 con consejo no vacío', () => {
    for (const shape of FACE_SHAPES) {
      for (const id of STYLE_IDS) {
        const fit = STYLE_FIT_MATRIX[shape][id];
        expect(fit.fitScore).toBeGreaterThanOrEqual(0);
        expect(fit.fitScore).toBeLessThanOrEqual(100);
        expect(fit.advice.length).toBeGreaterThan(0);
      }
    }
  });

  it('recommendStyles devuelve 5 recomendaciones ordenadas desc', () => {
    for (const shape of FACE_SHAPES) {
      const recommendations = recommendStyles(shape);
      expect(recommendations).toHaveLength(5);
      for (let i = 1; i < recommendations.length; i += 1) {
        const previous = recommendations[i - 1]!;
        const current = recommendations[i]!;
        expect(previous.fitScore).toBeGreaterThanOrEqual(current.fitScore);
      }
      const ids = recommendations.map((item) => item.styleId).sort();
      expect(ids).toEqual([...STYLE_IDS].sort());
    }
  });

  it('styleFit coincide con la matriz', () => {
    for (const shape of FACE_SHAPES) {
      for (const id of STYLE_IDS) {
        expect(styleFit(id, shape)).toBe(STYLE_FIT_MATRIX[shape][id].fitScore);
      }
    }
  });

  it('la mejor recomendación coincide con el máximo fitScore', () => {
    for (const shape of FACE_SHAPES) {
      const recommendations = recommendStyles(shape);
      const best = recommendations[0]!;
      for (const id of STYLE_IDS) {
        expect(best.fitScore).toBeGreaterThanOrEqual(styleFit(id, shape));
      }
    }
  });
});
