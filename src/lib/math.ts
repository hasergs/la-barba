/**
 * Primitivas matemáticas compartidas (CONGELADO, PM).
 *
 * Solo funciones puras y triviales que varios agentes necesitan.
 * La geometría de alto nivel (polígonos, áreas, centroides) vive en
 * `src/features/geometry/` (Agente B).
 */

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function dist(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  return Math.hypot(bx - ax, by - ay);
}

export function degrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** Ángulo (radianes) de la dirección a→b respecto al eje +X. */
export function angleOf(ax: number, ay: number, bx: number, by: number): number {
  return Math.atan2(by - ay, bx - ax);
}

/** Rota un punto alrededor de un centro. */
export function rotate(
  x: number,
  y: number,
  cx: number,
  cy: number,
  radians: number,
): { x: number; y: number } {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = x - cx;
  const dy = y - cy;
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
}

/** Media de un array no vacío. */
export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let total = 0;
  for (const value of values) total += value;
  return total / values.length;
}
