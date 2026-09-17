/**
 * Agente D · Overlay — mapeo de coordenadas (lógica PURA, testeable sin canvas).
 *
 * Contexto:
 *  - El `<video>` se muestra con `object-fit: cover` y en espejo selfie (CSS
 *    `-scale-x-100`). El canvas de overlay NO lleva espejo por CSS: invertimos
 *    la X en las COORDENADAS para que los textos de las etiquetas queden
 *    legibles.
 *  - `NormPoint` viene en FRAME NORMALIZADO [0..1] (espacio del vídeo, sin
 *    recorte y sin espejo).
 *
 * Modelo "cover":
 *   scale   = max(canvasW / videoW, canvasH / videoH)
 *   offsetX = (canvasW - videoW * scale) / 2
 *   offsetY = (canvasH - videoH * scale) / 2
 */

import type { NormPoint, Point } from '../../contracts/types';

export interface ViewMapperOptions {
  videoWidth: number;
  videoHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  mirrored: boolean;
}

export interface ViewMapper {
  toCanvas(point: NormPoint): Point;
  toCanvasX(x: number): number;
  toCanvasY(y: number): number;
  labelX(x: number): number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** Ajusta un píxel a la rejilla de 0.5 para trazos nítidos. */
function snapToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export function createViewMapper(opts: ViewMapperOptions): ViewMapper {
  const { videoWidth, videoHeight, canvasWidth, canvasHeight, mirrored } = opts;

  const valid = videoWidth > 0 && videoHeight > 0;
  const scale = valid
    ? Math.max(canvasWidth / videoWidth, canvasHeight / videoHeight)
    : 0;
  const offsetX = (canvasWidth - videoWidth * scale) / 2;
  const offsetY = (canvasHeight - videoHeight * scale) / 2;

  const toCanvasX = (x: number): number => {
    let px = x * videoWidth * scale + offsetX;
    if (mirrored) {
      px = canvasWidth - px;
      // Espejo: ajustamos a rejilla de 0.5 para trazos nítidos.
      return snapToHalf(px);
    }
    return px;
  };

  const toCanvasY = (y: number): number => {
    const py = y * videoHeight * scale + offsetY;
    return mirrored ? snapToHalf(py) : py;
  };

  return {
    toCanvas(point: NormPoint): Point {
      return { x: toCanvasX(point.x), y: toCanvasY(point.y) };
    },
    toCanvasX,
    toCanvasY,
    // El llamador invertirá el texto; exponemos el mismo cálculo por claridad.
    labelX: toCanvasX,
    scale,
    offsetX,
    offsetY,
  };
}

export function mapPolygon(
  polygon: readonly NormPoint[],
  mapper: ViewMapper,
): Point[] {
  return polygon.map((point) => mapper.toCanvas(point));
}

export function mapPolyline(
  points: readonly NormPoint[],
  mapper: ViewMapper,
): Point[] {
  return points.map((point) => mapper.toCanvas(point));
}

/**
 * Construye el path cerrado en `ctx` sin aplicar fill/stroke.
 * Tolerante a `ctx` no disponible y a listas vacías.
 */
export function polygonPath(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
): void {
  if (!ctx || points.length < 2) return;
  const first = points[0];
  if (!first) return;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    if (point) ctx.lineTo(point.x, point.y);
  }
  ctx.closePath();
}
