import type {
  BeardStyle,
  GuideLine,
  Landmark,
  NormPoint,
  NormPolygon,
  OverlayModel,
} from '../../contracts/types';
import { hasEnoughLandmarks, lm } from '../../contracts/access';
import { CANONICAL_ANCHORS } from '../../contracts/landmarks';
import { angleOf, dist, rotate } from '../../lib/math';

/**
 * Proyector del ESPACIO CANÓNICO FACIAL al FRAME normalizado de vídeo.
 *
 * El espacio canónico es un cuadrado [0..1]² donde:
 *   - cx 0/1 corresponden a las anclas laterales (`x0`/`x1`)
 *   - cy 0/1 corresponden a frente (`y0`) y mentón (`y1`)
 *
 * La proyección compensa el roll (inclinación) de la cabeza y escala por las
 * dimensiones reales de la cara, de modo que las geometrías de `BeardStyle`
 * se adaptan a cualquier rostro y orientación.
 */
export interface FaceProjector {
  /** Proyecta un punto canónico a coordenadas de frame normalizado. */
  toFrame(point: NormPoint): NormPoint;
  /** x normalizada (frame) del eje de simetría facial. */
  midlineX: number;
  /** Inclinación de la cabeza en radianes (ángulo de la línea interocular). */
  roll: number;
}

/**
 * Construye un proyector a partir de los landmarks crudos o suavizados.
 *
 * @param landmarks landmarks de MediaPipe (≥ 300)
 * @param expand factor de expansión opcional (1 = sin expansión) aplicado a
 *   ambas mitades de ancho y alto.
 * @throws si no hay landmarks suficientes.
 */
export function createFaceProjector(
  landmarks: Landmark[],
  expand = 1,
): FaceProjector {
  if (!hasEnoughLandmarks(landmarks)) {
    throw new Error(
      'Se requieren al menos 300 landmarks para proyectar la malla facial.',
    );
  }

  const { x0, x1, y0, y1, rollA, rollB } = CANONICAL_ANCHORS;

  const eyeA = lm(landmarks, rollA);
  const eyeB = lm(landmarks, rollB);
  const roll = angleOf(eyeA.x, eyeA.y, eyeB.x, eyeB.y);

  const left = lm(landmarks, x0);
  const right = lm(landmarks, x1);
  const top = lm(landmarks, y0);
  const bottom = lm(landmarks, y1);

  const centerX = (left.x + right.x) / 2;
  const centerY = (left.y + right.y) / 2;
  const halfW = (dist(left.x, left.y, right.x, right.y) / 2) * expand;
  const halfH = (dist(top.x, top.y, bottom.x, bottom.y) / 2) * expand;

  return {
    roll,
    midlineX: centerX,
    toFrame(point: NormPoint): NormPoint {
      const offsetX = (point.x - 0.5) * 2 * halfW;
      const offsetY = (point.y - 0.5) * 2 * halfH;
      const rotated = rotate(offsetX, offsetY, 0, 0, roll);
      return { x: centerX + rotated.x, y: centerY + rotated.y };
    },
  };
}

function projectPolygon(
  zone: NormPolygon,
  projector: FaceProjector,
): NormPolygon {
  return zone.map((point) => projector.toFrame(point));
}

function projectGuideLine(
  line: GuideLine,
  projector: FaceProjector,
): GuideLine {
  const points = line.points.map((point) => projector.toFrame(point));
  return line.label === undefined
    ? { kind: line.kind, points }
    : { kind: line.kind, points, label: line.label };
}

/**
 * Proyecta un estilo al frame de vídeo, produciendo el `OverlayModel` que
 * consume el renderer. No muta el `BeardStyle` original: crea arrays y puntos
 * nuevos.
 */
export function buildOverlayModel(
  style: BeardStyle,
  landmarks: Landmark[],
): OverlayModel {
  const projector = createFaceProjector(landmarks);
  return {
    styleId: style.id,
    beardZones: style.beardZones.map((zone) =>
      projectPolygon(zone, projector),
    ),
    shaveZones: style.shaveZones.map((zone) =>
      projectPolygon(zone, projector),
    ),
    guideLines: style.guideLines.map((line) =>
      projectGuideLine(line, projector),
    ),
    midlineX: projector.midlineX,
  };
}
