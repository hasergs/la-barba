import type {
  BeardStyle,
  Landmark,
  NormPoint,
  NormPolygon,
  OverlayModel,
} from '../../contracts/types';
import { hasEnoughLandmarks, lm } from '../../contracts/access';
import { FACE_OVAL, JAW_CHAIN, L } from '../../contracts/landmarks';
import { angleOf, dist, mean } from '../../lib/math';

/**
 * Construcción DIRECTA de la geometría de cada estilo desde los landmarks.
 *
 * A diferencia del antiguo `createFaceProjector` (que proyectaba plantillas
 * canónicas inventadas con una transformación afín global), aquí cada zona y
 * cada línea se DERIVA de los índices reales del rostro, de modo que encaja
 * con la cara concreta del usuario.
 *
 * Convención de lados: en la imagen de cámara (no espejada) la derecha del
 * sujeto aparece a la izquierda. Decidimos el lado comparando x con
 * `midlineX` (x menor ⇒ derecha), NUNCA fiándonos del nombre del landmark.
 */

/** Lado del rostro del usuario. */
type Side = 'right' | 'left';

/** Tamaño del parche de perilla. */
type ChinSize = 'small' | 'normal';

/** Altura de la línea de mejilla: `high` (pómulo) o `low` (mandíbula). */
type CheekHeight = 'low' | 'high';

/** Medidas y utilidades del rostro, todo en coords normalizadas [0..1]. */
export interface FaceFrame {
  readonly landmarks: readonly Landmark[];
  /** Landmark como punto normalizado. */
  point(index: number): NormPoint;
  /** Distancia euclídea entre dos landmarks. */
  distance(a: number, b: number): number;
  /** Copia desplazada por (dx, dy). */
  shift(point: NormPoint, dx: number, dy: number): NormPoint;
  /** Mueve el punto hacia (midlineX, y) como máximo `amount` unidades. */
  towardCenter(point: NormPoint, amount: number): NormPoint;
  /** dist(10, 152): alto frente → mentón. */
  faceHeight: number;
  /** dist(234, 454): ancho de pómulos. */
  cheekWidth: number;
  /** dist(172, 397): ancho de mandíbula. */
  jawWidth: number;
  /** dist(61, 291): ancho de boca. */
  mouthWidth: number;
  /** x del eje de simetría (media de los lagrimales internos 133/362). */
  midlineX: number;
  /** Inclinación de la cabeza: angleOf(33 → 263). */
  roll: number;
}

/**
 * Crea el marco facial (medidas + utilidades puras) a partir de los landmarks.
 *
 * @throws si no hay al menos 300 landmarks.
 */
export function createFaceFrame(landmarks: readonly Landmark[]): FaceFrame {
  if (!hasEnoughLandmarks(landmarks)) {
    throw new Error(
      'Se requieren al menos 300 landmarks para construir la geometría de la barba.',
    );
  }

  const point = (index: number): NormPoint => {
    const landmark = lm(landmarks, index);
    return { x: landmark.x, y: landmark.y };
  };

  const distance = (a: number, b: number): number => {
    const pa = point(a);
    const pb = point(b);
    return dist(pa.x, pa.y, pb.x, pb.y);
  };

  const shift = (p: NormPoint, dx: number, dy: number): NormPoint => ({
    x: p.x + dx,
    y: p.y + dy,
  });

  const innerRight = lm(landmarks, L.eyeRightInner);
  const innerLeft = lm(landmarks, L.eyeLeftInner);
  const midlineX = mean([innerRight.x, innerLeft.x]);

  const towardCenter = (p: NormPoint, amount: number): NormPoint => {
    const delta = midlineX - p.x;
    const step = Math.abs(delta) <= amount ? delta : Math.sign(delta) * amount;
    return { x: p.x + step, y: p.y };
  };

  const eyeA = lm(landmarks, L.eyeRightOuter);
  const eyeB = lm(landmarks, L.eyeLeftOuter);

  return {
    landmarks,
    point,
    distance,
    shift,
    towardCenter,
    faceHeight: distance(L.foreheadTop, L.chinMid),
    cheekWidth: distance(L.tragionRight, L.tragionLeft),
    jawWidth: distance(L.gonionRight, L.gonionLeft),
    mouthWidth: distance(L.mouthLeft, L.mouthRight),
    midlineX,
    roll: angleOf(eyeA.x, eyeA.y, eyeB.x, eyeB.y),
  };
}

/* ------------------------------- utilidades ------------------------------- */

/** Copia invertida de un array (sin mutar el original). */
function reverse<T>(items: readonly T[]): T[] {
  return [...items].reverse();
}

/** Posición del índice dentro de `FACE_OVAL` (lanza si no pertenece). */
function ovalPosition(index: number): number {
  const position = FACE_OVAL.indexOf(index);
  if (position < 0) {
    throw new Error(`El índice ${index} no pertenece a FACE_OVAL`);
  }
  return position;
}

/** Elige entre dos índices el que cae a la derecha/izquierda por su x. */
function pickByX(
  frame: FaceFrame,
  indexA: number,
  indexB: number,
  side: Side,
): NormPoint {
  const a = frame.point(indexA);
  const b = frame.point(indexB);
  const right = a.x <= b.x ? a : b;
  const left = a.x <= b.x ? b : a;
  return side === 'right' ? right : left;
}

/** Comisura de boca del lado pedido (decidida por x, no por nombre). */
function mouthCorner(frame: FaceFrame, side: Side): NormPoint {
  return pickByX(frame, L.mouthRight, L.mouthLeft, side);
}

/** Gonion (ángulo mandibular) del lado pedido. */
function gonion(frame: FaceFrame, side: Side): NormPoint {
  return pickByX(frame, L.gonionRight, L.gonionLeft, side);
}

/** Pómulo del lado pedido. */
function cheekbone(frame: FaceFrame, side: Side): NormPoint {
  return pickByX(frame, L.cheekRight, L.cheekLeft, side);
}

/** Tragion (preauricular) del lado pedido. */
function tragion(frame: FaceFrame, side: Side): NormPoint {
  return pickByX(frame, L.tragionRight, L.tragionLeft, side);
}

/** Punto donde se juntan la línea de mejilla y la de cuello (bajo la oreja). */
function sideAnchor(frame: FaceFrame, side: Side): NormPoint {
  return frame.shift(tragion(frame, side), 0, 0.1 * frame.faceHeight);
}

/**
 * Línea de mejilla. `'high'` pasa por el pómulo (barba italiana) y `'low'`
 * pasa por el gonion, pegada a la mandíbula (barba completa).
 */
function cheekLine(frame: FaceFrame, side: Side, height: CheekHeight): NormPoint[] {
  return [
    mouthCorner(frame, side),
    height === 'high' ? cheekbone(frame, side) : gonion(frame, side),
    sideAnchor(frame, side),
  ];
}

/**
 * Zona de barba tipo "escudo": arriba la línea de mejilla, abajo la línea de
 * cuello y el cierre por encima del labio.
 *
 * ⚠️ NO se usa el contorno del óvalo como borde: eso generaba una franja
 * estrecha fuera de la cara en vez del área real de la barba.
 */
function beardShield(
  frame: FaceFrame,
  height: CheekHeight,
  neck: readonly NormPoint[],
): NormPolygon {
  return [
    ...cheekLine(frame, 'right', height),
    ...neck,
    ...reverse(cheekLine(frame, 'left', height)),
    frame.point(L.subnasale),
  ];
}

/**
 * Contorno real de mejilla + mandíbula + mentón: desde el tragion izquierdo
 * (454) hasta el tragion derecho (234) recorriendo `FACE_OVAL` en orden.
 */
function ovalArc(frame: FaceFrame): NormPoint[] {
  const start = ovalPosition(L.tragionLeft);
  const end = ovalPosition(L.tragionRight);
  return FACE_OVAL.slice(start, end + 1).map((index) => frame.point(index));
}

/** Banda cerrada: la línea + la misma línea bajada `downFactor*H`. */
function bandFromLine(
  line: readonly NormPoint[],
  downFactor: number,
  H: number,
): NormPolygon {
  const lower = line.map((p) => ({ x: p.x, y: p.y + downFactor * H }));
  return [...line.map((p) => ({ x: p.x, y: p.y })), ...reverse(lower)];
}

/**
 * Bordes del bigote, ambos ordenados de IZQUIERDA a DERECHA del usuario
 * (x decreciente), de modo que `[...bottom, ...reverse(top)]` sea un anillo.
 *
 * El borde inferior sigue el labio superior REAL (comisuras + puntos 185/0/409)
 * y el superior es ese mismo contorno subido una fracción del alto facial: la
 * banda queda con espesor constante y justo bajo la nariz.
 *
 * ⚠️ Antes el borde alto subía hasta el subnasal mientras el bajo se quedaba en
 * las comisuras, así que la banda se quedaba en nada en los extremos y parecía
 * una flecha en vez de un bigote.
 */
function mustacheEdges(frame: FaceFrame): {
  bottom: NormPoint[];
  top: NormPoint[];
} {
  const H = frame.faceHeight;
  const M = frame.mouthWidth;
  const left = mouthCorner(frame, 'left');
  const right = mouthCorner(frame, 'right');
  const lipLeft = frame.point(L.upperLipLeft); // 409
  const lipRight = frame.point(L.upperLipRight); // 185
  const lipCenter = frame.point(L.upperLipTop); // 0

  const extend = 0.06 * M;
  const thickness = 0.05 * H;

  const bottom: NormPoint[] = [
    { x: left.x + extend, y: left.y + 0.01 * H },
    { x: lipLeft.x, y: lipLeft.y + 0.012 * H },
    { x: lipCenter.x, y: lipCenter.y + 0.014 * H },
    { x: lipRight.x, y: lipRight.y + 0.012 * H },
    { x: right.x - extend, y: right.y + 0.01 * H },
  ];

  return { bottom, top: bottom.map((p) => ({ x: p.x, y: p.y - thickness })) };
}

/** Banda de bigote cerrada. */
function mustacheBand(frame: FaceFrame): NormPolygon {
  const { bottom, top } = mustacheEdges(frame);
  return [...bottom, ...reverse(top)];
}

/** Línea guía del bigote: el borde alto (bajo la nariz). */
function mustacheTopLine(frame: FaceFrame): NormPoint[] {
  return mustacheEdges(frame).top;
}

/**
 * Piezas del parche de perilla.
 *
 * El contorno exterior se toma de la CADENA MANDIBULAR real alrededor del
 * mentón, desplazado hacia abajo una fracción del alto facial (con forma de
 * campana: 0 en los extremos, máximo en el centro). Así el parche se adapta a
 * la forma del mentón en lugar de ser una elipse suelta que se salía de la cara.
 */
function chinPatchParts(
  frame: FaceFrame,
  size: ChinSize,
): { outer: NormPoint[]; topLeft: NormPoint; topRight: NormPoint } {
  const H = frame.faceHeight;
  const spread = size === 'small' ? 2 : 3;
  const down = (size === 'small' ? 0.09 : 0.13) * H;
  const chinIndex = JAW_CHAIN.indexOf(L.chinMid);

  const window = JAW_CHAIN.slice(chinIndex - spread, chinIndex + spread + 1)
    .map((index) => frame.point(index))
    .reverse(); // izquierda → derecha del usuario

  const last = window.length - 1;
  const outer = window.map((point, index) => {
    const u = last === 0 ? 0.5 : index / last;
    const bulge = 1 - Math.abs(u * 2 - 1);
    return { x: point.x, y: point.y + down * bulge };
  });

  const first = outer[0];
  const lastPoint = outer[last];
  if (!first || !lastPoint) {
    throw new Error('No hay suficientes puntos de mandíbula para la perilla.');
  }

  const lipY = frame.point(L.lowerLipBottom).y;
  return {
    outer,
    topLeft: { x: first.x, y: lipY },
    topRight: { x: lastPoint.x, y: lipY },
  };
}

/** Parche de perilla cerrado: borde alto recto bajo el labio + contorno del mentón. */
function chinPatch(frame: FaceFrame, size: ChinSize): NormPolygon {
  const { outer, topLeft, topRight } = chinPatchParts(frame, size);
  return [topLeft, ...outer, topRight];
}

/**
 * Bigote CONECTADO con la perilla: las puntas del bigote bajan hasta las
 * esquinas superiores del parche, de modo que el conjunto se lee como una
 * barba de círculo (que es lo que promete la ficha del estilo).
 */
function mustacheConnected(frame: FaceFrame, size: ChinSize): NormPolygon {
  const { bottom, top } = mustacheEdges(frame);
  const { topLeft, topRight } = chinPatchParts(frame, size);
  const last = bottom.length - 1;
  if (last < 0) throw new Error('Bigote sin puntos.');

  const connectedBottom = [...bottom];
  connectedBottom[0] = { x: topLeft.x, y: topLeft.y };
  connectedBottom[last] = { x: topRight.x, y: topRight.y };

  return [...connectedBottom, ...reverse(top)];
}

/** Mueve un punto hacia el centro del rostro `amount` unidades (en 2D). */
function shrinkTowardCenter(
  frame: FaceFrame,
  point: NormPoint,
  amount: number,
): NormPoint {
  const centerX = frame.midlineX;
  const centerY =
    (frame.point(L.foreheadTop).y + frame.point(L.chinMid).y) / 2;
  const dx = centerX - point.x;
  const dy = centerY - point.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return { x: point.x, y: point.y };
  const step = Math.min(amount, length);
  return { x: point.x + (dx / length) * step, y: point.y + (dy / length) * step };
}

/**
 * Línea de cuello: arco suave en U que une los tragiones por debajo del mentón.
 *
 * ⚠️ NO sigue la mandíbula (eso producía una "V" profunda): el cuello real es
 * una curva casi horizontal que baja un poco bajo el mentón. Se interpola en x
 * entre los tragiones y en y con una campana (`1 - (2u-1)²`), de modo que los
 * extremos quedan altos (bajo la oreja) y el centro bajo el mentón.
 */
function neckLine(frame: FaceFrame): NormPoint[] {
  const H = frame.faceHeight;
  const right = frame.shift(frame.point(L.tragionRight), 0, 0.1 * H);
  const left = frame.shift(frame.point(L.tragionLeft), 0, 0.1 * H);
  const chinLow = frame.point(L.chinMid).y + 0.085 * H;
  const samples = 9;

  const points: NormPoint[] = [];
  for (let i = 0; i < samples; i++) {
    const u = i / (samples - 1);
    const bulge = 1 - (2 * u - 1) ** 2;
    points.push({
      x: right.x + (left.x - right.x) * u,
      y: right.y + (chinLow - right.y) * bulge,
    });
  }
  return points;
}

/** Óvalo mandibular menos su centro (banda lateral a afeitar). */
function sidesBand(frame: FaceFrame): NormPolygon {
  const W = frame.cheekWidth;
  const arc = ovalArc(frame);
  const inner = arc.map((p) => shrinkTowardCenter(frame, p, 0.11 * W));
  return [...arc, ...reverse(inner)];
}

/**
 * Región por encima de las líneas de mejilla altas (mejillas y sienes a
 * afeitar en la barba italiana).
 *
 * Orden del polígono (imprescindible para que no se cruce): ancla derecha →
 * contorno superior del óvalo (tragion derecho → frente → tragion izquierdo) →
 * ancla izquierda → pómulo izquierdo → comisura izquierda → subnasal →
 * comisura derecha → pómulo derecho → cierra.
 */
function upperFaceBand(frame: FaceFrame): NormPolygon {
  const start = ovalPosition(L.tragionRight);
  const end = ovalPosition(L.tragionLeft);

  const upper: NormPoint[] = [];
  for (let i = start; i < FACE_OVAL.length; i++) {
    const index = FACE_OVAL[i];
    if (index !== undefined) upper.push(frame.point(index));
  }
  for (let i = 0; i <= end; i++) {
    const index = FACE_OVAL[i];
    if (index !== undefined) upper.push(frame.point(index));
  }

  return [
    sideAnchor(frame, 'right'),
    ...upper,
    sideAnchor(frame, 'left'),
    cheekbone(frame, 'left'),
    mouthCorner(frame, 'left'),
    frame.point(L.subnasale),
    mouthCorner(frame, 'right'),
    cheekbone(frame, 'right'),
  ];
}

/* ------------------------------ construcción ------------------------------ */

/**
 * Deriva el `OverlayModel` de un estilo a partir de los landmarks reales.
 *
 * Función pura: no muta el estilo ni los landmarks y crea puntos nuevos.
 *
 * @throws si no hay landmarks suficientes.
 */
export function buildOverlayModel(
  style: BeardStyle,
  landmarks: Landmark[],
): OverlayModel {
  const frame = createFaceFrame(landmarks);
  const H = frame.faceHeight;

  switch (style.id) {
    case 'full-beard': {
      const neck = neckLine(frame);
      // La barba llega justo hasta la línea de cuello: su borde inferior ES la
      // línea guía, así ambas coinciden y no queda una "V" colgando.
      return {
        styleId: style.id,
        beardZones: [beardShield(frame, 'low', neck)],
        shaveZones: [bandFromLine(neck, 0.16, H)],
        guideLines: [
          {
            kind: 'cheek',
            label: 'Línea de mejilla derecha',
            points: cheekLine(frame, 'right', 'low'),
          },
          {
            kind: 'cheek',
            label: 'Línea de mejilla izquierda',
            points: cheekLine(frame, 'left', 'low'),
          },
          { kind: 'neck', label: 'Línea de cuello', points: neck },
        ],
        midlineX: frame.midlineX,
      };
    }

    case 'italian-beard': {
      const neck = neckLine(frame);
      return {
        styleId: style.id,
        beardZones: [beardShield(frame, 'high', neck)],
        shaveZones: [upperFaceBand(frame), bandFromLine(neck, 0.16, H)],
        guideLines: [
          {
            kind: 'cheek',
            label: 'Línea de mejilla derecha',
            points: cheekLine(frame, 'right', 'high'),
          },
          {
            kind: 'cheek',
            label: 'Línea de mejilla izquierda',
            points: cheekLine(frame, 'left', 'high'),
          },
          {
            kind: 'jaw',
            label: 'Línea de mandíbula',
            points: JAW_CHAIN.map((index) => frame.point(index)),
          },
          { kind: 'neck', label: 'Línea de cuello', points: neck },
        ],
        midlineX: frame.midlineX,
      };
    }

    case 'goatee-mustache': {
      const chin = chinPatch(frame, 'normal');
      const neck = neckLine(frame);
      return {
        styleId: style.id,
        beardZones: [chin, mustacheConnected(frame, 'normal')],
        shaveZones: [sidesBand(frame), bandFromLine(neck, 0.16, H)],
        guideLines: [
          {
            kind: 'mustache',
            label: 'Línea de bigote',
            points: mustacheTopLine(frame),
          },
          { kind: 'outline', label: 'Contorno de la perilla', points: chin },
          { kind: 'neck', label: 'Línea de cuello', points: neck },
        ],
        midlineX: frame.midlineX,
      };
    }

    case 'chin-only': {
      const chin = chinPatch(frame, 'small');
      const neck = neckLine(frame);
      return {
        styleId: style.id,
        beardZones: [chin],
        shaveZones: [
          mustacheBand(frame),
          sidesBand(frame),
          bandFromLine(neck, 0.16, H),
        ],
        guideLines: [
          { kind: 'outline', label: 'Contorno de la perilla', points: chin },
          {
            kind: 'mustache',
            label: 'Línea de bigote',
            points: mustacheTopLine(frame),
          },
          { kind: 'neck', label: 'Línea de cuello', points: neck },
        ],
        midlineX: frame.midlineX,
      };
    }

    case 'mustache-only': {
      const neck = neckLine(frame);
      return {
        styleId: style.id,
        beardZones: [mustacheBand(frame)],
        shaveZones: [sidesBand(frame), bandFromLine(neck, 0.16, H)],
        guideLines: [
          {
            kind: 'mustache',
            label: 'Línea de bigote',
            points: mustacheTopLine(frame),
          },
        ],
        midlineX: frame.midlineX,
      };
    }

    default: {
      const exhaustive: never = style.id;
      throw new Error(`Estilo de barba no soportado: ${String(exhaustive)}`);
    }
  }
}
