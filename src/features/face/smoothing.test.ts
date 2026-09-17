import { describe, expect, it } from 'vitest';
import type { Landmark } from '../../contracts/types';
import { createLandmarkSmoother } from './smoothing';

function points(count: number, x: number, y: number): Landmark[] {
  const out: Landmark[] = [];
  for (let i = 0; i < count; i += 1) out.push({ x, y, z: 0 });
  return out;
}

describe('createLandmarkSmoother', () => {
  it('deja pasar el primer frame tal cual', () => {
    const smoother = createLandmarkSmoother();
    const input = points(3, 0.25, 0.75);

    const output = smoother.smooth(input);

    expect(output).not.toBe(input);
    expect(output).toHaveLength(3);
    expect(output).toEqual(input);
  });

  it('converge hacia una señal constante', () => {
    const smoother = createLandmarkSmoother();
    smoother.smooth(points(1, 0, 0));

    let last = smoother.smooth(points(1, 0, 0));
    for (let i = 0; i < 60; i += 1) {
      last = smoother.smooth(points(1, 1, 1));
    }

    expect(last[0]?.x).toBeGreaterThan(0.999);
    expect(last[0]?.y).toBeGreaterThan(0.999);
  });

  it('reduce el ruido de alta frecuencia', () => {
    const smoother = createLandmarkSmoother();
    smoother.smooth(points(1, 0.5, 0.5));

    const noise = 0.004;
    let maxSmoothedDeviation = 0;
    for (let i = 0; i < 40; i += 1) {
      const value = 0.5 + (i % 2 === 0 ? noise : -noise);
      const output = smoother.smooth(points(1, value, 0.5));
      const deviation = Math.abs((output[0]?.x ?? 0.5) - 0.5);
      if (deviation > maxSmoothedDeviation) maxSmoothedDeviation = deviation;
    }

    expect(maxSmoothedDeviation).toBeLessThan(noise);
    expect(maxSmoothedDeviation).toBeLessThan(0.002);
  });

  it('no se rompe si cambia la longitud del array', () => {
    const smoother = createLandmarkSmoother();
    smoother.smooth(points(5, 0.5, 0.5));

    const shorter = points(3, 0.2, 0.8);
    const output = smoother.smooth(shorter);

    expect(output).toHaveLength(3);
    expect(output).toEqual(shorter);

    const longer = points(7, 0.4, 0.6);
    const output2 = smoother.smooth(longer);
    expect(output2).toHaveLength(7);
    expect(output2).toEqual(longer);
  });

  it('reset() vuelve a sembrar en el siguiente frame', () => {
    const smoother = createLandmarkSmoother();
    smoother.smooth(points(1, 0, 0));
    smoother.smooth(points(1, 1, 1));

    smoother.reset();
    const output = smoother.smooth(points(1, 0.3, 0.3));

    expect(output[0]?.x).toBeCloseTo(0.3, 12);
  });
});
