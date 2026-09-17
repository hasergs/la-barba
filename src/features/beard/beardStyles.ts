import type {
  BeardStyle,
  BeardStyleId,
  GuideLine,
  NormPolygon,
} from '../../contracts/types';

/**
 * Definición de los 5 estilos de barba de La Barba.
 *
 * Toda la geometría (`beardZones`, `shaveZones`, `guideLines.points`) está
 * expresada en ESPACIO CANÓNICO FACIAL [0..1]² (ver `CANONICAL_ANCHORS`):
 *   - cx = 0 → lado `x0` (tragion derecho), cx = 1 → lado `x1` (tragion izquierdo)
 *   - cy = 0 → línea de frente (`y0`), cy = 1 → mentón (`y1`)
 *   - cy > 1 → por debajo del mentón (cuello / zona a afeitar)
 *
 * `maskBuilder` se encarga de proyectar estas geometrías al frame de vídeo.
 */

/** Barba completa: cubre la mitad inferior del óvalo y baja algo al cuello. */
const FULL_BEARD: BeardStyle = {
  id: 'full-beard',
  name: 'Barba completa',
  tagline: 'Cobertura total, del hueso de la mejilla al cuello',
  description:
    'Barba que cubre mejillas bajas, mandíbula y mentón, con una extensión suave hacia el cuello. El clásico para quienes buscan cobertura y presencia.',
  beardZones: [
    [
      { x: 0.08, y: 0.55 },
      { x: 0.02, y: 0.72 },
      { x: 0.08, y: 0.92 },
      { x: 0.24, y: 1.1 },
      { x: 0.4, y: 1.22 },
      { x: 0.5, y: 1.25 },
      { x: 0.6, y: 1.22 },
      { x: 0.76, y: 1.1 },
      { x: 0.92, y: 0.92 },
      { x: 0.98, y: 0.72 },
      { x: 0.92, y: 0.55 },
      { x: 0.5, y: 0.6 },
    ],
  ],
  shaveZones: [
    [
      { x: 0.2, y: 1.3 },
      { x: 0.8, y: 1.3 },
      { x: 0.8, y: 1.45 },
      { x: 0.2, y: 1.45 },
    ],
  ],
  guideLines: [
    {
      kind: 'neck',
      label: 'Línea de cuello',
      points: [
        { x: 0.1, y: 1.06 },
        { x: 0.3, y: 1.16 },
        { x: 0.5, y: 1.2 },
        { x: 0.7, y: 1.16 },
        { x: 0.9, y: 1.06 },
      ],
    },
    {
      kind: 'cheek',
      label: 'Línea de mejilla izquierda',
      points: [
        { x: 0.08, y: 0.62 },
        { x: 0.3, y: 0.64 },
        { x: 0.5, y: 0.62 },
      ],
    },
    {
      kind: 'cheek',
      label: 'Línea de mejilla derecha',
      points: [
        { x: 0.92, y: 0.62 },
        { x: 0.7, y: 0.64 },
        { x: 0.5, y: 0.62 },
      ],
    },
  ],
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
  beardZones: [
    [
      { x: 0.34, y: 0.88 },
      { x: 0.4, y: 0.84 },
      { x: 0.6, y: 0.84 },
      { x: 0.66, y: 0.88 },
      { x: 0.66, y: 1.04 },
      { x: 0.58, y: 1.1 },
      { x: 0.42, y: 1.1 },
      { x: 0.34, y: 1.04 },
    ],
    [
      { x: 0.26, y: 0.6 },
      { x: 0.74, y: 0.6 },
      { x: 0.74, y: 0.72 },
      { x: 0.26, y: 0.72 },
    ],
  ],
  shaveZones: [
    [
      { x: 0.1, y: 0.45 },
      { x: 0.34, y: 0.5 },
      { x: 0.34, y: 0.72 },
      { x: 0.06, y: 0.7 },
    ],
    [
      { x: 0.66, y: 0.5 },
      { x: 0.9, y: 0.45 },
      { x: 0.94, y: 0.7 },
      { x: 0.66, y: 0.72 },
    ],
    [
      { x: 0.06, y: 0.72 },
      { x: 0.34, y: 0.72 },
      { x: 0.34, y: 0.9 },
      { x: 0.1, y: 0.88 },
    ],
    [
      { x: 0.66, y: 0.72 },
      { x: 0.94, y: 0.72 },
      { x: 0.9, y: 0.88 },
      { x: 0.66, y: 0.9 },
    ],
    [
      { x: 0.15, y: 1.12 },
      { x: 0.85, y: 1.12 },
      { x: 0.85, y: 1.45 },
      { x: 0.15, y: 1.45 },
    ],
  ],
  guideLines: [
    {
      kind: 'mustache',
      label: 'Línea superior del bigote',
      points: [
        { x: 0.26, y: 0.6 },
        { x: 0.4, y: 0.575 },
        { x: 0.5, y: 0.57 },
        { x: 0.6, y: 0.575 },
        { x: 0.74, y: 0.6 },
      ],
    },
    {
      kind: 'outline',
      label: 'Contorno de la perilla',
      points: [
        { x: 0.34, y: 0.86 },
        { x: 0.34, y: 1.02 },
        { x: 0.42, y: 1.1 },
        { x: 0.58, y: 1.1 },
        { x: 0.66, y: 1.02 },
        { x: 0.66, y: 0.86 },
      ],
    },
    {
      kind: 'neck',
      label: 'Línea de cuello',
      points: [
        { x: 0.16, y: 1.06 },
        { x: 0.5, y: 1.14 },
        { x: 0.84, y: 1.06 },
      ],
    },
  ],
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
  beardZones: [
    [
      { x: 0.36, y: 0.88 },
      { x: 0.42, y: 0.86 },
      { x: 0.58, y: 0.86 },
      { x: 0.64, y: 0.88 },
      { x: 0.64, y: 1.02 },
      { x: 0.56, y: 1.08 },
      { x: 0.44, y: 1.08 },
      { x: 0.36, y: 1.02 },
    ],
  ],
  shaveZones: [
    [
      { x: 0.26, y: 0.58 },
      { x: 0.74, y: 0.58 },
      { x: 0.74, y: 0.72 },
      { x: 0.26, y: 0.72 },
    ],
    [
      { x: 0.1, y: 0.45 },
      { x: 0.36, y: 0.5 },
      { x: 0.36, y: 0.74 },
      { x: 0.06, y: 0.7 },
    ],
    [
      { x: 0.64, y: 0.5 },
      { x: 0.9, y: 0.45 },
      { x: 0.94, y: 0.7 },
      { x: 0.64, y: 0.74 },
    ],
    [
      { x: 0.15, y: 1.1 },
      { x: 0.85, y: 1.1 },
      { x: 0.85, y: 1.45 },
      { x: 0.15, y: 1.45 },
    ],
  ],
  guideLines: [
    {
      kind: 'outline',
      label: 'Contorno de la perilla',
      points: [
        { x: 0.36, y: 0.88 },
        { x: 0.36, y: 1.0 },
        { x: 0.44, y: 1.08 },
        { x: 0.56, y: 1.08 },
        { x: 0.64, y: 1.0 },
        { x: 0.64, y: 0.88 },
      ],
    },
    {
      kind: 'neck',
      label: 'Línea de cuello',
      points: [
        { x: 0.16, y: 1.06 },
        { x: 0.5, y: 1.14 },
        { x: 0.84, y: 1.06 },
      ],
    },
  ],
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
  beardZones: [
    [
      { x: 0.14, y: 0.55 },
      { x: 0.06, y: 0.7 },
      { x: 0.12, y: 0.9 },
      { x: 0.28, y: 1.04 },
      { x: 0.44, y: 1.11 },
      { x: 0.56, y: 1.11 },
      { x: 0.72, y: 1.04 },
      { x: 0.88, y: 0.9 },
      { x: 0.94, y: 0.7 },
      { x: 0.86, y: 0.55 },
      { x: 0.5, y: 0.6 },
    ],
  ],
  shaveZones: [
    [
      { x: 0.06, y: 0.3 },
      { x: 0.3, y: 0.4 },
      { x: 0.28, y: 0.53 },
      { x: 0.05, y: 0.5 },
    ],
    [
      { x: 0.94, y: 0.3 },
      { x: 0.7, y: 0.4 },
      { x: 0.72, y: 0.53 },
      { x: 0.95, y: 0.5 },
    ],
    [
      { x: 0.16, y: 1.14 },
      { x: 0.84, y: 1.14 },
      { x: 0.84, y: 1.45 },
      { x: 0.16, y: 1.45 },
    ],
  ],
  guideLines: [
    {
      kind: 'cheek',
      label: 'Línea de mejilla izquierda (alta)',
      points: [
        { x: 0.06, y: 0.55 },
        { x: 0.28, y: 0.57 },
        { x: 0.5, y: 0.55 },
      ],
    },
    {
      kind: 'cheek',
      label: 'Línea de mejilla derecha (alta)',
      points: [
        { x: 0.94, y: 0.55 },
        { x: 0.72, y: 0.57 },
        { x: 0.5, y: 0.55 },
      ],
    },
    {
      kind: 'jaw',
      label: 'Línea de mandíbula',
      points: [
        { x: 0.1, y: 0.7 },
        { x: 0.28, y: 0.88 },
        { x: 0.5, y: 0.98 },
        { x: 0.72, y: 0.88 },
        { x: 0.9, y: 0.7 },
      ],
    },
    {
      kind: 'neck',
      label: 'Línea de cuello',
      points: [
        { x: 0.16, y: 1.02 },
        { x: 0.5, y: 1.1 },
        { x: 0.84, y: 1.02 },
      ],
    },
  ],
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
  beardZones: [
    [
      { x: 0.24, y: 0.58 },
      { x: 0.76, y: 0.58 },
      { x: 0.76, y: 0.73 },
      { x: 0.24, y: 0.73 },
    ],
  ],
  shaveZones: [
    [
      { x: 0.3, y: 0.82 },
      { x: 0.7, y: 0.82 },
      { x: 0.7, y: 1.1 },
      { x: 0.3, y: 1.1 },
    ],
    [
      { x: 0.08, y: 0.4 },
      { x: 0.36, y: 0.48 },
      { x: 0.36, y: 0.78 },
      { x: 0.05, y: 0.72 },
    ],
    [
      { x: 0.64, y: 0.48 },
      { x: 0.92, y: 0.4 },
      { x: 0.95, y: 0.72 },
      { x: 0.64, y: 0.78 },
    ],
    [
      { x: 0.15, y: 1.1 },
      { x: 0.85, y: 1.1 },
      { x: 0.85, y: 1.45 },
      { x: 0.15, y: 1.45 },
    ],
  ],
  guideLines: [
    {
      kind: 'mustache',
      label: 'Línea de bigote',
      points: [
        { x: 0.24, y: 0.585 },
        { x: 0.4, y: 0.565 },
        { x: 0.5, y: 0.56 },
        { x: 0.6, y: 0.565 },
        { x: 0.76, y: 0.585 },
      ],
    },
  ],
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

/** Utilidad interna de testeo: comprueba que un polígono es cerrado y no vacío. */
export function isClosedPolygon(polygon: NormPolygon): boolean {
  return polygon.length >= 3;
}

/** Utilidad interna: true si una línea guía es una polilínea abierta válida. */
export function isOpenGuideLine(line: GuideLine): boolean {
  return line.points.length >= 2;
}
