/**
 * CONTRATOS CONGELADOS — La Barba
 *
 * ⚠️  Este archivo es el contrato compartido entre todos los agentes.
 *     Solo el PM (orquestador) modifica este archivo.
 *     Los agentes consumen estos tipos y NO los cambian.
 *
 * Convenciones:
 *  - "NormPoint" = coordenada normalizada [0..1] relativa al frame de vídeo.
 *  - "Point"     = coordenada en píxeles del canvas (ya resuelta por el renderer).
 *  - Los índices de landmark viven en `landmarks.ts` (también congelado).
 */

/** Punto 2D normalizado [0..1] respecto al frame original de vídeo (sin recorte). */
export interface NormPoint {
  x: number;
  y: number;
}

/** Punto en píxeles del canvas de salida. */
export interface Point {
  x: number;
  y: number;
}

/** Landmark crudo entregado por MediaPipe FaceLandmarker. */
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

/** Las 7 formas de rostro soportadas. */
export type FaceShape =
  | 'oval'
  | 'round'
  | 'square'
  | 'oblong'
  | 'heart'
  | 'diamond'
  | 'triangle';

export const FACE_SHAPES: readonly FaceShape[] = [
  'oval',
  'round',
  'square',
  'oblong',
  'heart',
  'diamond',
  'triangle',
] as const;

/**
 * Métricas faciales invariantes a escala (normalizadas por distancia interpupilar).
 * Todas las razones son adimensionales.
 */
export interface FaceMetrics {
  /** longitud del rostro / ancho de pómulos */
  lengthToWidth: number;
  /** ancho de mandíbula / ancho de pómulos */
  jawToCheek: number;
  /** ancho de frente / ancho de pómulos */
  foreheadToCheek: number;
  /** ángulo gonial en grados (ángulo en el gonion, ~90-150) */
  gonialAngle: number;
  /** pómulos / máx(mandíbula, frente) — >1 indica pómulos dominantes */
  cheekboneDominance: number;
  /** desviación vertical frente/mentón respecto al eje medio, 0..1 */
  verticalBalance: number;
}

/** Resultado de clasificación de la forma del rostro. */
export interface FaceShapeResult {
  shape: FaceShape;
  /** confianza 0..1 de la forma ganadora */
  confidence: number;
  /** puntuación 0..1 por cada forma */
  scores: Record<FaceShape, number>;
  metrics: FaceMetrics;
}

/** Identificadores de los 5 estilos de barba. */
export type BeardStyleId =
  | 'full-beard'
  | 'goatee-mustache'
  | 'chin-only'
  | 'italian-beard'
  | 'mustache-only';

/** Polígono cerrado en espacio normalizado. */
export type NormPolygon = NormPoint[];

export type GuideKind = 'cheek' | 'neck' | 'mustache' | 'jaw' | 'outline';

/** Línea guía (polilínea abierta) en espacio normalizado. */
export interface GuideLine {
  kind: GuideKind;
  points: NormPoint[];
  /** etiqueta corta mostrada junto a la línea, p.ej. "Línea de cuello" */
  label?: string;
}

/**
 * Definición completa de un estilo de barba.
 *
 * ⚠️ Las geometrías (`beardZones`, `shaveZones`, `guideLines`) están en
 * ESPACIO CANÓNICO FACIAL [0..1]² (ver `CANONICAL_ANCHORS` en `landmarks.ts`),
 * NO en coordenadas del frame. `maskBuilder` las proyecta a frame normalizado
 * y produce un `OverlayModel`.
 */
export interface BeardStyle {
  id: BeardStyleId;
  name: string;
  tagline: string;
  description: string;
  /** Zonas rellenas donde debe haber barba (espacio canónico). */
  beardZones: NormPolygon[];
  /** Zonas que deben afeitarse por completo (espacio canónico). */
  shaveZones: NormPolygon[];
  /** Contornos a los que perfilar (espacio canónico). */
  guideLines: GuideLine[];
  /** Indicación de longitud/altura recomendada del pelo. */
  lengthHint: string;
  /** Compromiso/mantenimiento 1..5 (1 = fácil, 5 = exigente). */
  commitment: number;
}

/** Recomendación de estilo para una forma de rostro. */
export interface StyleRecommendation {
  styleId: BeardStyleId;
  /** 0..100 encaje para la forma detectada. */
  fitScore: number;
  advice: string;
}

/** Paso de la guía de afeitado. */
export interface GuidanceStep {
  order: number;
  title: string;
  instruction: string;
  zone?: GuideKind;
  tip?: string;
}

export interface GuidancePlan {
  styleId: BeardStyleId;
  shape: FaceShape;
  summary: string;
  steps: GuidanceStep[];
}

/**
 * Modelo de render resuelto para el overlay.
 *
 * ⚠️ Estas geometrías están en FRAME NORMALIZADO [0..1] (espacio del vídeo),
 * ya proyectadas desde el espacio canónico por `maskBuilder`. El renderer
 * (`overlay/coords.ts`) las traduce a píxeles de canvas.
 */
export interface OverlayModel {
  styleId: BeardStyleId;
  beardZones: NormPolygon[];
  shaveZones: NormPolygon[];
  guideLines: GuideLine[];
  /** x normalizada (frame) del eje de simetría facial. */
  midlineX: number;
}

export type CameraState =
  | 'idle'
  | 'requesting'
  | 'streaming'
  | 'error'
  | 'denied'
  | 'unsupported';

export interface CameraStatus {
  state: CameraState;
  error?: string;
  width: number;
  height: number;
}

/** Estado de seguimiento facial por frame. */
export interface TrackedFace {
  /** landmarks crudos */
  raw: Landmark[];
  /** landmarks suavizados (usar para render) */
  smoothed: Landmark[];
  /** score de detección 0..1 */
  confidence: number;
  /** calidad para guiar: frontalidad + tamaño en pantalla + luz, 0..1 */
  quality: number;
  /** true cuando la calidad cae por debajo del umbral y debe avisarse */
  unstable: boolean;
}

/**
 * Delegado de ejecución del modelo.
 *
 * ⚠️ `CPU` es el valor por defecto: medido en producción, `GPU` tardaba
 * ~14,9 s (y podía colgar el proceso gráfico) frente a ~68 ms de `CPU`.
 */
export type VisionDelegate = 'CPU' | 'GPU';

/** Diagnóstico en vivo para verificar el funcionamiento en un dispositivo. */
export interface Diagnostics {
  /** delegado realmente en uso (`null` si aún no cargó) */
  delegate: VisionDelegate | null;
  modelReady: boolean;
  /** frames de vídeo procesados desde el inicio */
  frames: number;
  /** frames por segundo (ventana de 1 s) */
  fps: number;
  /** landmarks recibidos en el último frame */
  landmarks: number;
  /** calidad actual 0..1 */
  quality: number;
  lastError: string | null;
}
