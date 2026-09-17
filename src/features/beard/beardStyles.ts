import type { BeardStyle, BeardStyleId } from '../../contracts/types';

/**
 * Catálogo de los 5 estilos de barba de La Barba.
 *
 * ⚠️ `BeardStyle` es SOLO METADATOS (nombre, descripción, mantenimiento). La
 * geometría (zonas y líneas guía) ya NO vive aquí: se DERIVA de los landmarks
 * reales del usuario en `maskBuilder.ts` (`buildOverlayModel`). Así las líneas
 * encajan con cada rostro en lugar de ser plantillas canónicas proyectadas.
 */

/** Barba completa: cubre mejillas bajas, mandíbula y mentón. */
const FULL_BEARD: BeardStyle = {
  id: 'full-beard',
  name: 'Barba completa',
  tagline: 'Cobertura total, del hueso de la mejilla al cuello',
  description:
    'Barba que cubre mejillas bajas, mandíbula y mentón, con una extensión suave hacia el cuello. El clásico para quienes buscan cobertura y presencia.',
  lengthHint: 'Pelo medio, 3-6 cm en el mentón',
  commitment: 4,
};

/** Perilla + bigote con mejillas y mandíbula afeitadas. */
const GOATEE_MUSTACHE: BeardStyle = {
  id: 'goatee-mustache',
  name: 'Perilla y bigote',
  tagline: 'Conjunto clásico: mentón y bigote conectados',
  description:
    'Parche de mentón combinado con una banda de bigote, dejando mejillas, mandíbula y cuello al ras. Aporta carácter sin cobertura total.',
  lengthHint: 'Perilla de 2-4 cm y bigote corto',
  commitment: 3,
};

/** Solo perilla: parche de mentón reducido. */
const CHIN_ONLY: BeardStyle = {
  id: 'chin-only',
  name: 'Perilla sola',
  tagline: 'Minimalismo centrado en el mentón',
  description:
    'Pequeño parche de pelo en el mentón, con bigote, mejillas, mandíbula y cuello completamente afeitados. Discreta y fácil de mantener.',
  lengthHint: 'Perilla de 1-3 cm',
  commitment: 2,
};

/** Barba italiana: corta, con línea de mejilla alta y mandíbula nítida. */
const ITALIAN_BEARD: BeardStyle = {
  id: 'italian-beard',
  name: 'Barba italiana',
  tagline: 'Corta, pulida y con mejilla alta',
  description:
    'Barba corta que sigue el óvalo inferior con una línea de mejilla alta y lateral recortado. Muy perfilada, ideal para rasgos definidos.',
  lengthHint: 'Barba corta, 1-2 cm, muy perfilada',
  commitment: 4,
};

/** Solo bigote: banda sobre el labio con el resto al ras. */
const MUSTACHE_ONLY: BeardStyle = {
  id: 'mustache-only',
  name: 'Bigote solo',
  tagline: 'Protagonismo absoluto sobre el labio',
  description:
    'Bandas de bigote limpias con mentón, mejillas, mandíbula y cuello totalmente afeitados. Un estilo limpio y con personalidad.',
  lengthHint: 'Bigote de 1-2 cm sobre el labio',
  commitment: 2,
};

/** Índice por id de todos los estilos. */
export const BEARD_STYLES: Record<BeardStyleId, BeardStyle> = {
  'full-beard': FULL_BEARD,
  'goatee-mustache': GOATEE_MUSTACHE,
  'chin-only': CHIN_ONLY,
  'italian-beard': ITALIAN_BEARD,
  'mustache-only': MUSTACHE_ONLY,
};

/** Lista ordenada de estilos (orden de presentación en la UI). */
export const BEARD_STYLE_LIST: readonly BeardStyle[] = [
  FULL_BEARD,
  GOATEE_MUSTACHE,
  CHIN_ONLY,
  ITALIAN_BEARD,
  MUSTACHE_ONLY,
];

/**
 * Devuelve el estilo por id. El tipo `Record` garantiza que siempre existe,
 * pero se mantiene la comprobación para consumidores con ids externos.
 */
export function getStyleById(id: BeardStyleId): BeardStyle {
  const style = BEARD_STYLES[id];
  if (!style) {
    throw new Error(`Estilo de barba desconocido: ${String(id)}`);
  }
  return style;
}
