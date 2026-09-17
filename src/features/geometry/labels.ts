/**
 * Etiquetas y descripciones en español por forma de rostro (Agente B).
 * Se usan en la UI de resultados para explicar la recomendación de barba.
 */

import type { FaceShape } from '../../contracts/types';

/** Nombre corto de cada forma de rostro. */
export const FACE_SHAPE_LABEL_ES: Record<FaceShape, string> = {
  oval: 'Ovalado',
  round: 'Redondo',
  square: 'Cuadrado',
  oblong: 'Alargado',
  heart: 'Corazón',
  diamond: 'Diamante',
  triangle: 'Triangular',
};

/** Explicación breve (una frase) de por qué encaja cierto tipo de barba. */
export const FACE_SHAPE_DESCRIPTION_ES: Record<FaceShape, string> = {
  oval:
    'Rostro equilibrado: casi cualquier barba favorece, y una barba completa y redondeada refuerza su simetría natural.',
  round:
    'Rostro más corto que ancho: interesa alargarlo visualmente con volumen en la barbilla y patillas marcadas.',
  square:
    'Mandíbula fuerte y angulosa: una barba que suavice los ángulos mantiene la masculinidad sin endurecer el gesto.',
  oblong:
    'Rostro alargado: una barba densa en los laterales y más corta en el mentón ayuda a acortarlo visualmente.',
  heart:
    'Frente ancha y mentón estrecho: conviene dar volumen a la mandíbula para equilibrar la mitad inferior.',
  diamond:
    'Pómulos marcados: la barba debe rellenar frente y mentón para atenuar la anchura de la zona media.',
  triangle:
    'Mandíbula más ancha que la frente: conviene dar volumen en las patillas y mantener la barbilla bien definida.',
};
