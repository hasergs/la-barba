/**
 * Agente D · Overlay — componente React que integra el pipeline de render.
 *
 * ⚠️ Este es el ÚNICO archivo que importa los módulos de otros agentes
 *    (`../face/frameStore`, `../beard/maskBuilder`, `../beard/beardStyles`,
 *    `../../store/appStore`). Por eso no hay tests que lo importen.
 *
 * Notas de render:
 *  - El canvas se dimensiona al contenedor en device pixels (`dpr`), por lo que
 *    todas las coordenadas del `ViewMapper` quedan en device pixels.
 *  - El vídeo se muestra en espejo; el `mirrored` se aplica en coordenadas y los
 *    textos de las etiquetas se dibujan sin invertir (legibles).
 */

import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { TrackedFace } from '../../contracts/types';
import { useAppStore } from '../../store/appStore';
import { getStyleById } from '../beard/beardStyles';
import { buildOverlayModel } from '../beard/maskBuilder';
import { getCurrentFrame, subscribeFrame } from '../face/frameStore';
import { createViewMapper } from './coords';
import { drawOverlay } from './render';

export interface OverlayCanvasProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  mirrored?: boolean;
}

/** Mínimo de landmarks suavizados para considerar la malla completa (478 pts). */
const MIN_LANDMARKS = 300;

/** Límite de dpr para no reventar el coste de relleno en pantallas 3x+ */
const MAX_DPR = 2;

export function OverlayCanvas({ videoRef, mirrored = true }: OverlayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const latestFaceRef = useRef<TrackedFace | null>(null);

  const selectedStyleId = useAppStore((state) => state.selectedStyleId);
  const showLandmarks = useAppStore((state) => state.showLandmarks);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cssWidth = container.clientWidth;
    const cssHeight = container.clientHeight;
    if (cssWidth <= 0 || cssHeight <= 0) return;

    const dpr = Math.min(
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      MAX_DPR,
    );
    const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
    const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    // Limpieza base por si no hay nada que dibujar en este frame.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const face = latestFaceRef.current ?? getCurrentFrame();
    const style = selectedStyleId ? getStyleById(selectedStyleId) : null;
    const video = videoRef.current;
    const videoWidth = video ? video.videoWidth : 0;
    const videoHeight = video ? video.videoHeight : 0;

    if (
      !face ||
      !style ||
      face.smoothed.length < MIN_LANDMARKS ||
      videoWidth <= 0 ||
      videoHeight <= 0
    ) {
      return;
    }

    const model = buildOverlayModel(style, face.smoothed);
    const mapper = createViewMapper({
      videoWidth,
      videoHeight,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      mirrored,
    });

    drawOverlay(ctx, {
      model,
      mapper,
      showLandmarks,
      landmarks: face.smoothed,
      dpr,
    });
  }, [mirrored, selectedStyleId, showLandmarks, videoRef]);

  // Suscripción imperativa a frames de alta frecuencia (sin re-render React).
  useEffect(() => {
    const unsubscribe = subscribeFrame((face) => {
      latestFaceRef.current = face;
      draw();
    });
    return unsubscribe;
  }, [draw]);

  // Redibuja al cambiar el tamaño del contenedor.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => draw());
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  // Redibuja al cambiar estilo, depuración o espejo.
  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}

export default OverlayCanvas;
