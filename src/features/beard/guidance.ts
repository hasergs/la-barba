import type {
  BeardStyleId,
  FaceShape,
  GuidancePlan,
  GuidanceStep,
} from '../../contracts/types';

/** Paso sin orden: el orden se asigna al construir el plan. */
type StepDraft = Omit<GuidanceStep, 'order'>;

/** Resumen base por estilo (sin la nota de forma del rostro). */
const STYLE_SUMMARIES: Record<BeardStyleId, string> = {
  'full-beard':
    'Guía para perfilar una barba completa que cubra mandíbula, mentón y una extensión controlada hacia el cuello.',
  'goatee-mustache':
    'Guía para definir la perilla y el bigote mientras afeitas mejillas, mandíbula y cuello.',
  'chin-only':
    'Guía para recortar una perilla limpia y dejar el resto del rostro al ras.',
  'italian-beard':
    'Guía para una barba italiana corta, con línea de mejilla alta y mandíbula nítida.',
  'mustache-only':
    'Guía para lucir solo el bigote, con el resto del rostro afeitado al detalle.',
};

/** Nota específica según la forma del rostro, añadida al resumen. */
const SHAPE_NOTES: Record<FaceShape, string> = {
  oval: 'Tu forma ovalada es la más versátil: mantén el contorno limpio y no exageres los laterales.',
  round:
    'En un rostro redondo, alargar el mentón y recortar las mejillas crea verticalidad.',
  square:
    'En un rostro cuadrado, redondea los ángulos de la mandíbula y evita líneas demasiado rectas.',
  oblong:
    'En un rostro alargado, gana anchura y evita sumar longitud extra en el mentón.',
  heart:
    'En un rostro en forma de corazón, aporta peso abajo para equilibrar una frente más ancha.',
  diamond:
    'En un rostro diamante, rellena mandíbula y mentón para compensar unos pómulos prominentes.',
  triangle:
    'En un rostro triangular, suaviza la base ancha y da protagonismo a la zona media.',
};

/** Pasos de guía por estilo, coherentes con sus zonas a afeitar y perfilar. */
const STYLE_STEPS: Record<BeardStyleId, readonly StepDraft[]> = {
  'full-beard': [
    {
      title: 'Prepara piel y barba',
      instruction:
        'Lava el rostro y seca la barba; peina el pelo hacia abajo para ver la longitud real.',
      tip: 'Trabaja siempre con la barba seca y bien peinada.',
    },
    {
      title: 'Marca la línea de mejilla',
      instruction:
        'Desde la comisura del bigote, sube hacia la patilla trazando una curva baja que baje hacia las mejillas.',
      zone: 'cheek',
    },
    {
      title: 'Perfila la línea de cuello',
      instruction:
        'Dibuja una curva unos dedos por encima de la nuez y afeita todo lo que caiga por debajo.',
      zone: 'neck',
      tip: 'No subas demasiado: una línea alta estiliza el conjunto.',
    },
    {
      title: 'Iguala la longitud',
      instruction:
        'Con la guía ya marcada, recorta a favor del crecimiento con la máquina para uniformar el volumen.',
    },
    {
      title: 'Repasa el contorno',
      instruction:
        'Retira los pelos sueltos del contorno y comprueba la simetría en el espejo.',
    },
  ],
  'goatee-mustache': [
    {
      title: 'Delimita el bigote',
      instruction:
        'Dibuja la línea superior del bigote bajo la nariz y perfílala hasta las comisuras.',
      zone: 'mustache',
    },
    {
      title: 'Afeita mejillas y mandíbula',
      instruction:
        'Retira todo el pelo de mejillas y mandíbula siguiendo el borde del hueso.',
      zone: 'cheek',
    },
    {
      title: 'Define la perilla',
      instruction:
        'Recorta el contorno de la perilla para que baje desde la comisura hasta el mentón con curvas limpias.',
      zone: 'outline',
    },
    {
      title: 'Marca la línea de cuello',
      instruction:
        'Afeita el cuello por debajo de la mandíbula para aislar la perilla.',
      zone: 'neck',
    },
    {
      title: 'Simetriza y repasa',
      instruction:
        'Compara ambos lados y ajusta longitudes para que la perilla quede centrada.',
    },
  ],
  'chin-only': [
    {
      title: 'Prepara la zona',
      instruction:
        'Lava y peina el rostro; decide la anchura de la perilla según el ancho del mentón.',
    },
    {
      title: 'Define el contorno',
      instruction:
        'Dibuja el óvalo de la perilla desde las comisuras hacia el mentón.',
      zone: 'outline',
    },
    {
      title: 'Afeita bigote y mejillas',
      instruction: 'Retira por completo el bigote y todo el pelo de las mejillas.',
      zone: 'mustache',
    },
    {
      title: 'Afeita cuello y mandíbula',
      instruction:
        'Deja la mandíbula y el cuello al ras para que la perilla resalte.',
      zone: 'neck',
    },
    {
      title: 'Repasa la perilla',
      instruction:
        'Comprueba que ambos lados de la perilla tengan la misma altura y densidad.',
    },
  ],
  'italian-beard': [
    {
      title: 'Prepara y peina',
      instruction:
        'Peina la barba hacia abajo y localiza el hueso de la mejilla para marcar la altura.',
    },
    {
      title: 'Marca la mejilla alta',
      instruction:
        'Sube la línea de la mejilla por encima del hueso para lograr una barba corta y nítida.',
      zone: 'cheek',
      tip: 'Una línea alta y firme es la seña de identidad de la barba italiana.',
    },
    {
      title: 'Define la mandíbula',
      instruction:
        'Perfila el contorno mandibular siguiendo la cadena de la mandíbula sin redondearlo.',
      zone: 'jaw',
    },
    {
      title: 'Perfila el cuello',
      instruction:
        'Afeita por debajo de la línea de cuello manteniéndola alta y limpia.',
      zone: 'neck',
    },
    {
      title: 'Afina los laterales',
      instruction:
        'Recorta los laterales con la máquina para reducir volumen y dejar la barba pegada.',
    },
  ],
  'mustache-only': [
    {
      title: 'Prepara y peina',
      instruction:
        'Peina el bigote hacia abajo y localiza el borde del labio superior.',
    },
    {
      title: 'Marca la línea del bigote',
      instruction:
        'Define la línea superior bajo la nariz y el borde inferior sobre el labio.',
      zone: 'mustache',
    },
    {
      title: 'Recorta a longitud',
      instruction:
        'Recorta el bigote por encima del labio dejando que cubra ligeramente el borde.',
    },
    {
      title: 'Afeita mentón y mejillas',
      instruction: 'Retira todo el pelo del mentón, mejillas y mandíbula.',
      zone: 'cheek',
    },
    {
      title: 'Afeita el cuello',
      instruction: 'Deja el cuello al ras para un acabado limpio.',
      zone: 'neck',
    },
  ],
};

/**
 * Construye el plan de guiado para un estilo y una forma de rostro.
 *
 * Los pasos se numeran de forma incremental desde 1 y el resumen incluye una
 * nota específica de la forma detectada.
 */
export function buildGuidance(
  styleId: BeardStyleId,
  shape: FaceShape,
): GuidancePlan {
  const drafts = STYLE_STEPS[styleId];
  const steps: GuidanceStep[] = drafts.map((draft, index) => ({
    ...draft,
    order: index + 1,
  }));

  return {
    styleId,
    shape,
    summary: `${STYLE_SUMMARIES[styleId]} ${SHAPE_NOTES[shape]}`,
    steps,
  };
}
