import { useState } from 'react';
import {
  buildGuidance,
  getStyleById,
  recommendStyles,
} from '../../features/beard';
import { FACE_SHAPE_LABEL_ES } from '../../features/geometry';
import { useAppStore } from '../../store/appStore';

const ZONE_DOT: Record<string, string> = {
  cheek: 'bg-brand-400',
  neck: 'bg-accent-400',
  mustache: 'bg-white',
  jaw: 'bg-brand-400',
  outline: 'bg-accent-400',
};

/**
 * Panel inferior con la ficha del estilo elegido y la guía de afeitado.
 * Se despliega/colapsa y respeta los safe-area insets.
 */
export function GuidancePanel() {
  const selectedStyleId = useAppStore((s) => s.selectedStyleId);
  const faceShape = useAppStore((s) => s.faceShape);
  const [expanded, setExpanded] = useState(false);

  if (!selectedStyleId) {
    return (
      <div className="rounded-2xl bg-ink-800/80 px-4 py-3 text-center">
        <p className="text-xs text-white/50">
          Elige un estilo para ver las líneas de perfilado y la guía.
        </p>
      </div>
    );
  }

  const style = getStyleById(selectedStyleId);
  const shape = faceShape?.shape ?? null;
  const advice =
    shape !== null
      ? recommendStyles(shape).find((item) => item.styleId === selectedStyleId)
          ?.advice
      : null;
  const plan = shape !== null ? buildGuidance(selectedStyleId, shape) : null;

  return (
    <div className="overflow-hidden rounded-2xl bg-ink-800/85 backdrop-blur">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-label={`Guía: ${style.name}`}
        className="flex w-full items-start gap-3 px-4 py-3 text-left"
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-brand-400">{style.name}</h2>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
              {style.lengthHint}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-white/55">
            {style.description}
          </p>
        </div>
        <span
          className={`mt-1 text-white/50 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          aria-hidden
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {expanded ? (
        <div className="max-h-[46vh] overflow-y-auto border-t border-white/10 px-4 py-3">
          {advice ? (
            <p className="mb-3 rounded-xl bg-accent-400/10 px-3 py-2 text-[11px] leading-snug text-accent-400">
              {shape ? `${FACE_SHAPE_LABEL_ES[shape]}: ` : ''}
              {advice}
            </p>
          ) : null}

          {plan ? (
            <>
              <p className="mb-2 text-[11px] leading-snug text-white/50">
                {plan.summary}
              </p>
              <ol className="flex flex-col gap-2.5">
                {plan.steps.map((step) => (
                  <li key={step.order} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-[10px] font-semibold text-brand-400">
                      {step.order}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-semibold text-white/90">
                          {step.title}
                        </h3>
                        {step.zone ? (
                          <span
                            className={`h-2 w-2 rounded-full ${ZONE_DOT[step.zone] ?? 'bg-white/40'}`}
                            aria-hidden
                          />
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-snug text-white/55">
                        {step.instruction}
                      </p>
                      {step.tip ? (
                        <p className="mt-1 text-[10px] leading-snug text-brand-400/80">
                          Tip: {step.tip}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="rounded-xl bg-white/5 px-3 py-2 text-[11px] text-white/50">
              Coloca tu rostro frente a la cámara para generar la guía
              personalizada según tu forma facial.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3 border-t border-white/10 pt-3 text-[10px] text-white/45">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-brand-400/70" /> Barba
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-danger-400/60" /> Afeitar
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-accent-400/70" /> Cuello /
              contorno
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
