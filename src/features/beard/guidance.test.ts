import { describe, expect, it } from 'vitest';
import type { FaceShape } from '../../contracts/types';
import { BEARD_STYLE_LIST, getStyleById } from './beardStyles';
import { buildGuidance } from './guidance';
import { makeFaceLandmarks } from './landmarkFixture';
import { buildOverlayModel } from './maskBuilder';

const SHAPES: readonly FaceShape[] = ['oval', 'round'];

describe('buildGuidance', () => {
  it('genera entre 3 y 6 pasos ordenados desde 1 para cada estilo y forma', () => {
    for (const style of BEARD_STYLE_LIST) {
      for (const shape of SHAPES) {
        const plan = buildGuidance(style.id, shape);
        expect(plan.styleId).toBe(style.id);
        expect(plan.shape).toBe(shape);
        expect(plan.steps.length).toBeGreaterThanOrEqual(3);
        expect(plan.steps.length).toBeLessThanOrEqual(6);

        plan.steps.forEach((step, index) => {
          expect(step.order).toBe(index + 1);
          expect(step.title.length).toBeGreaterThan(0);
          expect(step.instruction.length).toBeGreaterThan(0);
        });
      }
    }
  });

  it('incluye una nota específica de la forma en el resumen', () => {
    for (const style of BEARD_STYLE_LIST) {
      const oval = buildGuidance(style.id, 'oval');
      const round = buildGuidance(style.id, 'round');
      expect(oval.summary.length).toBeGreaterThan(0);
      expect(round.summary.length).toBeGreaterThan(0);
      expect(oval.summary).not.toBe(round.summary);
    }
  });

  it('los estilos que afeitan cuello incluyen una zona de cuello', () => {
    for (const style of BEARD_STYLE_LIST) {
      const plan = buildGuidance(style.id, 'diamond');
      const zones = plan.steps
        .map((step) => step.zone)
        .filter((zone) => zone !== undefined);
      expect(zones.length).toBeGreaterThan(0);

      const model = buildOverlayModel(
        getStyleById(style.id),
        makeFaceLandmarks(),
      );
      const styleHasNeck = model.guideLines.some(
        (line) => line.kind === 'neck',
      );
      if (styleHasNeck) {
        expect(zones).toContain('neck');
      }
    }
  });
});
