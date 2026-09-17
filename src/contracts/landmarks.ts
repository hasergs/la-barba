/**
 * CONTRATO CONGELADO — Índices de landmarks (MediaPipe FaceLandmarker, 478 pts).
 *
 * ⚠️  Solo el PM modifica este archivo. Los agentes lo consumen tal cual.
 *     Fuente: canonical_face_model / face_mesh connections de MediaPipe.
 *
 * Eje X: aumentando hacia la DERECHA DE LA IMAGEN (no del sujeto).
 * Como la cámara frontal entrega imagen espejo, el renderer debe invertir X
 * una única vez (ver `overlay/coords.ts`).
 */

export const L = {
  // Eje medio vertical
  foreheadTop: 10,
  glabella: 9,
  nasion: 168,
  noseTip: 1,
  subnasale: 2,
  upperLipTop: 0,
  lowerLipBottom: 17,
  chinMid: 152,

  // Laterales de frente
  foreheadRight: 70,
  foreheadLeft: 300,

  // Sienes / preauriculares (ancho máx. pómulos ≈ 234↔454)
  tragionRight: 234,
  tragionLeft: 454,
  templeRight: 127,
  templeLeft: 356,

  // Pómulos
  cheekRight: 116,
  cheekLeft: 345,
  cheekboneRight: 123,
  cheekboneLeft: 352,

  // Goniones (ángulo mandibular)
  gonionRight: 172,
  gonionLeft: 397,

  // Mandíbula (puntos medios para contorno)
  jawRight: 136,
  jawRightMid: 150,
  jawRightLow: 149,
  jawLeft: 365,
  jawLeftMid: 379,
  jawLeftLow: 378,
  chinRight: 400,
  chinLeft: 176,

  // Ojos
  eyeRightOuter: 33,
  eyeRightInner: 133,
  eyeLeftInner: 362,
  eyeLeftOuter: 263,
  irisRight: 468, // requiere outputFaceBlendshapes=false y refineIris=true
  irisLeft: 473,
  eyebrowRight: 105,
  eyebrowLeft: 334,

  // Boca
  mouthRight: 291,
  mouthLeft: 61,
  upperLipRight: 185,
  upperLipLeft: 409,
  lowerLipRight: 405,
  lowerLipLeft: 181,
} as const;

/**
 * Contorno exterior del rostro (FACEMESH_FACE_OVAL) en orden.
 * Se usa para construir las zonas de barba y el óvalo facial.
 */
export const FACE_OVAL: readonly number[] = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54,
  103, 67, 109,
] as const;

/** Contorno exterior de los labios (FACEMESH_LIPS) en orden. */
export const LIPS_OUTER: readonly number[] = [
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84,
  181, 91, 146,
] as const;

/**
 * Cadena de la mandíbula (de gonion derecho a gonion izquierdo pasando por mentón).
 * Útil para líneas de contorno inferior.
 */
export const JAW_CHAIN: readonly number[] = [
  172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397,
] as const;

/** Cadena del borde superior del bigote (bajo la nariz, sobre el labio superior). */
export const MUSTACHE_TOP_CHAIN: readonly number[] = [
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291,
] as const;

/** Número total de landmarks del modelo con refinado de iris. */
export const LANDMARK_COUNT = 478;

/**
 * ESPACIO CANÓNICO FACIAL (CONGELADO)
 * -----------------------------------
 * Las plantillas de los estilos (`BeardStyle.beardZones`, `.shaveZones`,
 * `.guideLines`) se autoran en un cuadrado canónico `[0..1] x [0..1]` definido
 * por estas 4 anclas sobre la cara detectada:
 *
 *   cx = 0 → lado de `x0`     cx = 1 → lado de `x1`
 *   cy = 0 → línea de `y0`    cy = 1 → línea de `y1`
 *
 * `maskBuilder` (Agente C) proyecta canónico → frame normalizado:
 *   1. Compensa el roll usando `rollA`/`rollB`.
 *   2. Mapea cx y cy de forma separable con las anclas x/y.
 *
 * En espacio canónico, `midlineX` = 0.5 SIEMPRE (eje de simetría facial).
 */
export const CANONICAL_ANCHORS = {
  /** cx = 0 */
  x0: L.tragionRight,
  /** cx = 1 */
  x1: L.tragionLeft,
  /** cy = 0 */
  y0: L.foreheadTop,
  /** cy = 1 */
  y1: L.chinMid,
  /** punto A para el cálculo de roll (ojo derecho exterior) */
  rollA: L.eyeRightOuter,
  /** punto B para el cálculo de roll (ojo izquierdo exterior) */
  rollB: L.eyeLeftOuter,
} as const;
