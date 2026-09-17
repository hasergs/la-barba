/**
 * Barrel de `features/overlay` (Agente D).
 *
 * Nota: los tests puros importan `./coords` y `./render` directamente, NUNCA
 * este barrel. Así se evita cargar React y los módulos de otros agentes
 * (`face`, `beard`, `store`) durante los tests sin canvas.
 */

export type { ViewMapper, ViewMapperOptions } from './coords';
export { createViewMapper, mapPolygon, mapPolyline, polygonPath } from './coords';

export type { DrawOverlayOptions } from './render';
export {
  computeLabelAnchor,
  drawOverlay,
  makeHatchPattern,
} from './render';

export type { OverlayCanvasProps } from './OverlayCanvas';
export { OverlayCanvas, default as OverlayCanvasDefault } from './OverlayCanvas';
