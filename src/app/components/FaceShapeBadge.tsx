import { FACE_SHAPE_LABEL_ES } from '../../features/geometry';
import { useAppStore } from '../../store/appStore';

/**
 * Indicador de la forma del rostro detectada + confianza.
 * Lee directamente del store (estado de bajo refresco).
 */
export function FaceShapeBadge() {
  const faceShape = useAppStore((s) => s.faceShape);
  const hasFace = useAppStore((s) => s.hasFace);

  if (!faceShape) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-ink-950/70 px-3 py-1.5 backdrop-blur">
        <span className="h-2 w-2 animate-pulse rounded-full bg-white/50" />
        <span className="text-xs font-medium text-white/70">
          {hasFace ? 'Analizando rostro…' : 'Buscando rostro…'}
        </span>
      </div>
    );
  }

  const percent = Math.round(faceShape.confidence * 100);

  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-ink-950/70 px-3 py-2 backdrop-blur">
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] uppercase tracking-wider text-white/45">
          Rostro
        </span>
        <span className="text-sm font-semibold text-brand-400">
          {FACE_SHAPE_LABEL_ES[faceShape.shape]}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1 w-16 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-accent-400"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-[10px] text-white/45">{percent}%</span>
      </div>
    </div>
  );
}
