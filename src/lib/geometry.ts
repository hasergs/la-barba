/**
 * Utilidades puras de geometría 2D sobre polígonos y polilíneas (Agente B).
 *
 * Trabajan con `NormPoint` (espacio normalizado [0..1]) pero son agnósticas a
 * la escala: cualquier coordenada numérica sirve. Todas las funciones son puras
 * y NO mutan las entradas; devuelven puntos nuevos.
 */

import type { NormPoint } from '../contracts/types';
import { clamp, dist, lerp, rotate } from './math';

/** Caja envolvente alineada a los ejes. */
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/** Tolerancia para tratar áreas/cuadrados degenerados como cero. */
const EPSILON = 1e-9;

/** Caja envolvente mínima que contiene todos los puntos. Array vacío → ceros. */
export function boundingBox(points: readonly NormPoint[]): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Área del polígono (fórmula del zapatero / shoelace), valor absoluto. */
export function polygonArea(points: readonly NormPoint[]): number {
  const count = points.length;
  if (count < 3) return 0;

  let sum = 0;
  for (let i = 0; i < count; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % count]!;
    sum += a.x * b.y - b.x * a.y;
  }

  return Math.abs(sum) / 2;
}

/**
 * Centroide del polígono. Si el área es degenerada (~0) cae a la media
 * aritmética de los vértices, que siempre está bien definida.
 */
export function polygonCentroid(points: readonly NormPoint[]): NormPoint {
  const count = points.length;
  if (count === 0) return { x: 0, y: 0 };
  if (count < 3) return meanPoint(points);

  let area2 = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < count; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % count]!;
    const cross = a.x * b.y - b.x * a.y;
    area2 += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }

  if (Math.abs(area2) < EPSILON) return meanPoint(points);

  const factor = 1 / (3 * area2);
  return { x: cx * factor, y: cy * factor };
}

/** Test punto-en-polígono por lanzamiento de rayo (ray casting). */
export function pointInPolygon(
  point: NormPoint,
  polygon: readonly NormPoint[],
): boolean {
  const count = polygon.length;
  if (count < 3) return false;

  let inside = false;
  for (let i = 0, j = count - 1; i < count; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    const crossesRay =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crossesRay) inside = !inside;
  }

  return inside;
}

/** Traslada todos los vértices por (dx, dy). */
export function translatePolygon(
  points: readonly NormPoint[],
  dx: number,
  dy: number,
): NormPoint[] {
  return points.map((point) => ({ x: point.x + dx, y: point.y + dy }));
}

/** Escala los vértices respecto al centro (cx, cy) con factores (sx, sy). */
export function scalePolygon(
  points: readonly NormPoint[],
  cx: number,
  cy: number,
  sx: number,
  sy: number,
): NormPoint[] {
  return points.map((point) => ({
    x: cx + (point.x - cx) * sx,
    y: cy + (point.y - cy) * sy,
  }));
}

/** Rota los vértices `radians` alrededor del centro (cx, cy). */
export function rotatePolygon(
  points: readonly NormPoint[],
  cx: number,
  cy: number,
  radians: number,
): NormPoint[] {
  return points.map((point) => rotate(point.x, point.y, cx, cy, radians));
}

/** Longitud total de una polilínea abierta (suma de segmentos). */
export function polylineLength(points: readonly NormPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    total += dist(a.x, a.y, b.x, b.y);
  }
  return total;
}

/**
 * Remuestrea una polilínea a exactamente `count` puntos equiespaciados por
 * longitud de arco. Devuelve `[]` si `count <= 0` o no hay puntos. Con un solo
 * punto de entrada devuelve `count` copias.
 */
export function resamplePolyline(
  points: readonly NormPoint[],
  count: number,
): NormPoint[] {
  if (count <= 0 || points.length === 0) return [];

  const first = points[0]!;
  if (points.length === 1) {
    return Array.from({ length: count }, () => ({ x: first.x, y: first.y }));
  }
  if (count === 1) return [{ x: first.x, y: first.y }];

  // Longitudes acumuladas hasta cada vértice.
  const cumulative: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    cumulative.push((cumulative[i - 1] ?? 0) + dist(a.x, a.y, b.x, b.y));
  }

  const total = cumulative[cumulative.length - 1] ?? 0;
  if (total <= EPSILON) {
    return Array.from({ length: count }, () => ({ x: first.x, y: first.y }));
  }

  const result: NormPoint[] = [];
  let segment = 0;

  for (let i = 0; i < count; i++) {
    const target = (total * i) / (count - 1);
    while (
      segment < points.length - 2 &&
      (cumulative[segment + 1] ?? 0) < target
    ) {
      segment++;
    }

    const a = points[segment]!;
    const b = points[segment + 1] ?? a;
    const start = cumulative[segment] ?? 0;
    const end = cumulative[segment + 1] ?? start;
    const span = end - start;
    const t = span > EPSILON ? clamp((target - start) / span, 0, 1) : 0;

    result.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
  }

  return result;
}

/**
 * Suavizado de Chaikin (corte de esquinas). Cada iteración sustituye cada
 * segmento por dos puntos a 1/4 y 3/4. En polilíneas abiertas conserva los
 * extremos; en cerradas une el último vértice con el primero.
 */
export function chaikinSmooth(
  points: readonly NormPoint[],
  iterations = 1,
  closed = false,
): NormPoint[] {
  let current = points.map((point) => ({ x: point.x, y: point.y }));

  for (let i = 0; i < iterations; i++) {
    current = chaikinOnce(current, closed);
  }

  return current;
}

/** Media aritmética de una lista de puntos. */
function meanPoint(points: readonly NormPoint[]): NormPoint {
  let x = 0;
  let y = 0;
  for (const point of points) {
    x += point.x;
    y += point.y;
  }
  const count = points.length;
  return { x: x / count, y: y / count };
}

/** Una pasada de Chaikin. */
function chaikinOnce(
  points: readonly NormPoint[],
  closed: boolean,
): NormPoint[] {
  const count = points.length;
  if (count < 3) return points.map((point) => ({ x: point.x, y: point.y }));

  const result: NormPoint[] = [];
  if (!closed) result.push({ x: points[0]!.x, y: points[0]!.y });

  const lastSegment = closed ? count : count - 1;
  for (let i = 0; i < lastSegment; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % count]!;
    result.push({
      x: 0.75 * a.x + 0.25 * b.x,
      y: 0.75 * a.y + 0.25 * b.y,
    });
    result.push({
      x: 0.25 * a.x + 0.75 * b.x,
      y: 0.25 * a.y + 0.75 * b.y,
    });
  }

  if (!closed) {
    const last = points[count - 1]!;
    result.push({ x: last.x, y: last.y });
  }

  return result;
}
