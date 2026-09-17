import type { TrackedFace } from '../../contracts/types';

/**
 * Store imperativo de ALTA FRECUENCIA (≈30fps).
 *
 * No es estado de React a propósito: 478 landmarks por frame re-renderizarían
 * el árbol completo. El overlay/renderer se suscribe de forma imperativa con
 * `subscribeFrame` y lee el último frame con `getCurrentFrame`.
 */
let currentFrame: TrackedFace | null = null;
const subscribers = new Set<(face: TrackedFace | null) => void>();

/** Último frame de seguimiento, o `null` si no hay rostro. */
export function getCurrentFrame(): TrackedFace | null {
  return currentFrame;
}

/** Publica un frame nuevo y notifica a todos los suscriptores. */
export function setCurrentFrame(face: TrackedFace | null): void {
  currentFrame = face;
  for (const callback of subscribers) {
    callback(face);
  }
}

/**
 * Suscribe una callback a cada `setCurrentFrame`.
 * Devuelve la función para cancelar la suscripción.
 */
export function subscribeFrame(
  callback: (face: TrackedFace | null) => void,
): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}
