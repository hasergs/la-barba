import type { FaceShape } from '../../contracts/types';
import { BEARD_STYLE_LIST, recommendStyles } from '../../features/beard';
import { useAppStore } from '../../store/appStore';

interface StyleSelectorProps {
  shape: FaceShape | null;
}

/**
 * Selector horizontal de los 5 estilos.
 *
 * Cuando hay forma de rostro detectada, cada estilo muestra su encaje (%)
 * y el mejor valorado se marca como recomendado.
 */
export function StyleSelector({ shape }: StyleSelectorProps) {
  const selectedStyleId = useAppStore((s) => s.selectedStyleId);
  const selectStyle = useAppStore((s) => s.selectStyle);

  const ranked = shape ? recommendStyles(shape) : [];
  const topId = ranked[0]?.styleId ?? null;
  const fitById = new Map(ranked.map((item) => [item.styleId, item.fitScore]));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] uppercase tracking-wider text-white/45">
          Estilo de barba
        </span>
        {shape ? (
          <span className="text-[10px] text-white/40">
            Ordenado por encaje
          </span>
        ) : null}
      </div>

      <div className="no-select -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {BEARD_STYLE_LIST.map((style) => {
          const active = style.id === selectedStyleId;
          const fit = fitById.get(style.id);
          const recommended = style.id === topId;

          return (
            <button
              key={style.id}
              type="button"
              onClick={() => selectStyle(style.id)}
              className={`relative flex min-w-[9.5rem] flex-col gap-1 rounded-2xl px-3 py-2.5 text-left transition active:scale-[0.97] ${
                active
                  ? 'bg-brand-500 text-ink-950'
                  : 'bg-ink-800/90 text-white/80'
              }`}
            >
              {recommended && !active ? (
                <span className="absolute right-2 top-2 rounded-full bg-accent-400/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent-400">
                  Mejor
                </span>
              ) : null}

              <span className="text-sm font-semibold leading-tight">
                {style.name}
              </span>
              <span
                className={`text-[10px] leading-tight ${
                  active ? 'text-ink-950/70' : 'text-white/45'
                }`}
              >
                {style.tagline}
              </span>

              <span className="mt-0.5 flex items-center gap-1">
                <span
                  className={`text-[10px] font-medium ${
                    active ? 'text-ink-950/80' : 'text-white/50'
                  }`}
                >
                  {fit !== undefined ? `Encaje ${fit}%` : 'Encaje —'}
                </span>
                <span className="text-[10px] text-white/30">
                  · {style.commitment}/5
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
