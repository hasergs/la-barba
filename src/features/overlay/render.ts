/**
 * Agente D · Overlay — dibujo imperativo (sin React).
 *
 * Todas las coordenadas del `mapper` están en píxeles del canvas (device
 * pixels). `dpr` solo escala grosores/tamaños de trazo y texto.
 *
 * Orden de dibujo:
 *   1. limpiar
 *   2. zonas a afeitar (relleno claro + borde discontinuo)
 *   3. zonas de barba (relleno + borde sólido)
 *   4. líneas guía (color por `kind`)
 *   5. landmarks debug (si `showLandmarks`)
 *   6. etiquetas de líneas guía (sin espejo, texto legible)
 */

import type {
  GuideKind,
  Landmark,
  OverlayModel,
  Point,
} from '../../contracts/types';
import type { ViewMapper } from './coords';
import { mapPolygon, mapPolyline, polygonPath } from './coords';

const SHADE_FILL = 'rgba(255, 93, 108, 0.10)';
const SHADE_STROKE = '#ff5d6c';
const BEARD_FILL = 'rgba(242, 181, 68, 0.16)';
const BEARD_STROKE = '#f2b544';
const LANDMARK_COLOR = '#38e0b0';
const LABEL_BG = 'rgba(11, 11, 15, 0.78)';
const LABEL_FG = '#ffffff';
const DEFAULT_LABEL_FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

const GUIDE_COLORS: Record<GuideKind, string> = {
  cheek: '#f2b544',
  neck: '#38e0b0',
  mustache: '#ffffff',
  jaw: '#f2b544',
  outline: '#38e0b0',
};

export interface DrawOverlayOptions {
  model: OverlayModel;
  mapper: ViewMapper;
  showLandmarks?: boolean;
  landmarks?: Landmark[];
  dpr?: number;
  labelFont?: string;
}

/** Rellena y perfila un polígono con los estilos ya activos en `ctx`. */
function paintZone(ctx: CanvasRenderingContext2D, points: readonly Point[]): void {
  if (points.length < 3) return;
  polygonPath(ctx, points);
  ctx.fill();
  ctx.stroke();
}

/** Traza una polilínea abierta con los estilos ya activos en `ctx`. */
function strokePolyline(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
): void {
  if (points.length < 2) return;
  const first = points[0];
  if (!first) return;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    if (point) ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
}

/**
 * Punto medio de la polilínea medido por longitud de arco, para anclar la
 * etiqueta. Devuelve `{x:0,y:0}` si no hay puntos.
 */
export function computeLabelAnchor(points: readonly Point[]): Point {
  const first = points[0];
  if (!first) return { x: 0, y: 0 };
  if (points.length === 1) return { x: first.x, y: first.y };

  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  if (total === 0) return { x: first.x, y: first.y };

  const half = total / 2;
  let travelled = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    const segment = Math.hypot(b.x - a.x, b.y - a.y);
    if (travelled + segment >= half) {
      const t = segment === 0 ? 0 : (half - travelled) / segment;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    travelled += segment;
  }

  const last = points[points.length - 1];
  return last ? { x: last.x, y: last.y } : { x: first.x, y: first.y };
}

/** Dibuja una etiqueta con fondo redondeado, SIN espejo (texto legible). */
function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  anchor: Point,
  dpr: number,
): void {
  const fontSize = 12 * dpr;
  const padX = 6 * dpr;
  let textWidth = text.length * fontSize * 0.6;
  if (typeof ctx.measureText === 'function') {
    const metrics = ctx.measureText(text);
    if (metrics && typeof metrics.width === 'number') textWidth = metrics.width;
  }
  const boxW = textWidth + padX * 2;
  const boxH = fontSize + 8 * dpr;
  const x = anchor.x;
  const y = anchor.y - boxH - 10 * dpr;

  ctx.save();
  ctx.fillStyle = LABEL_BG;
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, 6 * dpr);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, boxW, boxH);
  }
  ctx.fillStyle = LABEL_FG;
  ctx.fillText(text, x + padX, y + boxH / 2);
  ctx.restore();
}

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  opts: DrawOverlayOptions,
): void {
  if (!ctx) return;

  const { model, mapper } = opts;
  const dpr = opts.dpr && opts.dpr > 0 ? opts.dpr : 1;
  const canvasWidth = ctx.canvas ? ctx.canvas.width : 0;
  const canvasHeight = ctx.canvas ? ctx.canvas.height : 0;

  // 1. Limpiar (transform identidad para cubrir todo el canvas).
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.restore();

  // 2. Zonas a afeitar.
  ctx.save();
  ctx.fillStyle = SHADE_FILL;
  ctx.strokeStyle = SHADE_STROKE;
  ctx.lineWidth = Math.max(1, 1.5 * dpr);
  ctx.lineJoin = 'round';
  if (typeof ctx.setLineDash === 'function') {
    ctx.setLineDash([6 * dpr, 4 * dpr]);
  }
  for (const zone of model.shaveZones) {
    paintZone(ctx, mapPolygon(zone, mapper));
  }
  ctx.restore();

  // 3. Zonas de barba.
  ctx.save();
  ctx.fillStyle = BEARD_FILL;
  ctx.strokeStyle = BEARD_STROKE;
  ctx.lineWidth = Math.max(1, 2 * dpr);
  ctx.lineJoin = 'round';
  for (const zone of model.beardZones) {
    paintZone(ctx, mapPolygon(zone, mapper));
  }
  ctx.restore();

  // 4. Líneas guía.
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const line of model.guideLines) {
    ctx.strokeStyle = GUIDE_COLORS[line.kind];
    ctx.lineWidth = Math.max(1, 3 * dpr);
    strokePolyline(ctx, mapPolyline(line.points, mapper));
  }
  ctx.restore();

  // 5. Landmarks de depuración.
  if (opts.showLandmarks && opts.landmarks && opts.landmarks.length > 0) {
    ctx.save();
    ctx.fillStyle = LANDMARK_COLOR;
    const radius = Math.max(1, 2 * dpr);
    for (const landmark of opts.landmarks) {
      const point = mapper.toCanvas({ x: landmark.x, y: landmark.y });
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 6. Etiquetas (el texto NO se invierte: se dibuja en x sin espejo).
  ctx.save();
  ctx.font = `${Math.round(12 * dpr)}px ${opts.labelFont ?? DEFAULT_LABEL_FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const line of model.guideLines) {
    if (!line.label) continue;
    const anchor = computeLabelAnchor(mapPolyline(line.points, mapper));
    drawLabel(ctx, line.label, anchor, dpr);
  }
  ctx.restore();
}

/**
 * Crea un patrón de rayado diagonal para indicar "afeitar".
 * Devuelve `null` si el entorno no soporta canvas (p.ej. jsdom).
 */
export function makeHatchPattern(
  ctx: CanvasRenderingContext2D,
  color: string,
  size = 8,
): CanvasPattern | null {
  if (!ctx || typeof ctx.createPattern !== 'function') return null;
  if (typeof document === 'undefined') return null;

  const tileSize = Math.max(2, Math.round(size));
  const tile = document.createElement('canvas');
  tile.width = tileSize;
  tile.height = tileSize;
  const tileCtx = tile.getContext('2d');
  if (!tileCtx) return null;

  tileCtx.strokeStyle = color;
  tileCtx.lineWidth = 1;
  tileCtx.beginPath();
  tileCtx.moveTo(0, tileSize);
  tileCtx.lineTo(tileSize, 0);
  tileCtx.moveTo(-1, 1);
  tileCtx.lineTo(1, -1);
  tileCtx.moveTo(tileSize - 1, tileSize + 1);
  tileCtx.lineTo(tileSize + 1, tileSize - 1);
  tileCtx.stroke();

  return ctx.createPattern(tile, 'repeat');
}
