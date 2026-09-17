import type {
  BeardStyleId,
  FaceShape,
  StyleRecommendation,
} from '../../contracts/types';

/** Encaje de un estilo para una forma de rostro. */
export interface StyleFit {
  /** 0..100, mayor = mejor encaje. */
  fitScore: number;
  /** Consejo breve y específico en español. */
  advice: string;
}

/**
 * Matriz de encaje forma de rostro × estilo de barba.
 *
 * Los `fitScore` son heurísticos de asesoría (no métricas clínicas) y siguen
 * criterios de equilibrio visual: añadir volumen donde el rostro carece de él
 * y recortar donde ya domina.
 */
export const STYLE_FIT_MATRIX: Record<
  FaceShape,
  Record<BeardStyleId, StyleFit>
> = {
  oval: {
    'full-beard': {
      fitScore: 95,
      advice:
        'Tu rostro ovalado admite casi todo: la barba completa mantiene tus proporciones.',
    },
    'goatee-mustache': {
      fitScore: 84,
      advice: 'La perilla con bigote aporta carácter sin alterar tu equilibrio natural.',
    },
    'chin-only': {
      fitScore: 76,
      advice: 'Una perilla discreta realza el mentón en un rostro ya equilibrado.',
    },
    'italian-beard': {
      fitScore: 90,
      advice: 'La barba italiana define la mandíbula sin recargar tus facciones.',
    },
    'mustache-only': {
      fitScore: 78,
      advice: 'El bigote solo es una apuesta limpia que respeta tus proporciones.',
    },
  },
  round: {
    'full-beard': {
      fitScore: 88,
      advice:
        'Alarga el rostro: deja más longitud en el mentón y recorta las mejillas.',
    },
    'goatee-mustache': {
      fitScore: 80,
      advice: 'La perilla con bigote alarga visualmente un rostro redondo.',
    },
    'chin-only': {
      fitScore: 64,
      advice: 'Perilla corta para dar verticalidad sin ensanchar aún más el rostro.',
    },
    'italian-beard': {
      fitScore: 84,
      advice: 'La barba italiana estiliza el rostro redondo con líneas altas.',
    },
    'mustache-only': {
      fitScore: 66,
      advice: 'El bigote solo apenas compensa la redondez; mejor acompáñalo de perilla.',
    },
  },
  square: {
    'full-beard': {
      fitScore: 90,
      advice:
        'Suaviza los ángulos marcados de la mandíbula con una barba completa de curvas redondeadas.',
    },
    'goatee-mustache': {
      fitScore: 76,
      advice: 'La perilla mantiene la fuerza de tu mandíbula cuadrada.',
    },
    'chin-only': {
      fitScore: 70,
      advice: 'Perilla para centrar la atención sin perder definición.',
    },
    'italian-beard': {
      fitScore: 82,
      advice: 'La barba italiana afila aún más tus rasgos angulosos.',
    },
    'mustache-only': {
      fitScore: 68,
      advice: 'El bigote solo deja la mandíbula muy expuesta; añade perilla si puedes.',
    },
  },
  oblong: {
    'full-beard': {
      fitScore: 62,
      advice:
        'Evita alargar más un rostro alargado; si la llevas, mantenla corta y ancha.',
    },
    'goatee-mustache': {
      fitScore: 84,
      advice: 'La perilla con bigote acorta visualmente un rostro alargado.',
    },
    'chin-only': {
      fitScore: 80,
      advice: 'Una perilla corta equilibra un rostro alargado sin estirarlo.',
    },
    'italian-beard': {
      fitScore: 70,
      advice: 'Barba italiana baja para no incrementar la longitud del rostro.',
    },
    'mustache-only': {
      fitScore: 86,
      advice: 'El bigote solo es ideal: llena la zona media sin alargar el rostro.',
    },
  },
  heart: {
    'full-beard': {
      fitScore: 82,
      advice: 'La barba completa equilibra una frente ancha y un mentón estrecho.',
    },
    'goatee-mustache': {
      fitScore: 90,
      advice: 'La perilla aporta peso a la parte inferior del rostro en forma de corazón.',
    },
    'chin-only': {
      fitScore: 84,
      advice: 'La perilla ensancha visualmente el mentón estrecho.',
    },
    'italian-beard': {
      fitScore: 80,
      advice: 'La barba italiana da base al rostro sin recargar los pómulos.',
    },
    'mustache-only': {
      fitScore: 70,
      advice: 'El bigote solo acentúa la frente ancha; combínalo con perilla.',
    },
  },
  diamond: {
    'full-beard': {
      fitScore: 86,
      advice:
        'La barba completa rellena la mandíbula y equilibra unos pómulos prominentes.',
    },
    'goatee-mustache': {
      fitScore: 80,
      advice: 'La perilla añade volumen al mentón frente a los pómulos marcados.',
    },
    'chin-only': {
      fitScore: 74,
      advice: 'Perilla para reforzar el mentón estrecho del rostro diamante.',
    },
    'italian-beard': {
      fitScore: 82,
      advice: 'La barba italiana suaviza la anchura de los pómulos.',
    },
    'mustache-only': {
      fitScore: 68,
      advice: 'El bigote solo no compensa los pómulos dominantes; añade barba.',
    },
  },
  triangle: {
    'full-beard': {
      fitScore: 84,
      advice:
        'Añade volumen en mejillas y mentón para equilibrar una mandíbula ancha.',
    },
    'goatee-mustache': {
      fitScore: 72,
      advice: 'La perilla centra el rostro; mantén las mejillas bien recortadas.',
    },
    'chin-only': {
      fitScore: 66,
      advice: 'Perilla corta para no ensanchar más la base triangular.',
    },
    'italian-beard': {
      fitScore: 78,
      advice: 'La barba italiana afina la base ancha del rostro triangular.',
    },
    'mustache-only': {
      fitScore: 82,
      advice: 'El bigote solo aporta peso visual arriba, útil en rostros triangulares.',
    },
  },
};

/**
 * Devuelve las recomendaciones para una forma de rostro, ordenadas de mayor a
 * menor `fitScore`.
 */
export function recommendStyles(shape: FaceShape): StyleRecommendation[] {
  const row = STYLE_FIT_MATRIX[shape];
  return (Object.keys(row) as BeardStyleId[])
    .map((styleId) => ({
      styleId,
      fitScore: row[styleId].fitScore,
      advice: row[styleId].advice,
    }))
    .sort((a, b) => b.fitScore - a.fitScore);
}

/** Encaje numérico (0..100) de un estilo concreto para una forma de rostro. */
export function styleFit(styleId: BeardStyleId, shape: FaceShape): number {
  return STYLE_FIT_MATRIX[shape][styleId].fitScore;
}
