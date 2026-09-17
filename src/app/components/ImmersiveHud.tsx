import { useEffect, useState } from 'react';
import { buildGuidance, getStyleById } from '../../features/beard';
import { useAppStore } from '../../store/appStore';

/**
 * HUD mínimo del modo afeitado.
 *
 * Deja la cara despejada (sin selector de estilos ni fichas) pero mantiene:
 *  - un botón discreto para salir del modo,
 *  - el paso actual de la guía, que avanza al tocarlo, para poder seguirlo
 *    mientras te afeitas mirándote en el espejo.
 */
export function ImmersiveHud({ onExit }: { onExit: () => void }) {
  const selectedStyleId = useAppStore((s) => s.selectedStyleId);
  const faceShape = useAppStore((s) => s.faceShape);
  const unstable = useAppStore((s) => s.unstable);
  const [stepIndex, setStepIndex] = useState(0);
  const [showHint, setShowHint] = useState(true);

  const styleName = selectedStyleId
    ? getStyleById(selectedStyleId).name
    : null;

  const plan =
    selectedStyleId && faceShape
      ? buildGuidance(selectedStyleId, faceShape.shape)
      : null;
  const steps = plan?.steps ?? [];

  // Al cambiar de estilo volvemos al primer paso.
  useEffect(() => {
    setStepIndex(0);
  }, [selectedStyleId, faceShape?.shape]);

  // La pista desaparece sola para no ensuciar la vista.
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  const current = steps[stepIndex];

  return (
    <>
      {/* Salir del modo afeitado */}
      <button
        type="button"
        onClick={onExit}
        aria-label="Mostrar los paneles"
        className="absolute right-3 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-30 flex h-9 w-9 items-center justify-center rounded-full bg-ink-950/60 text-white/70 backdrop-blur transition active:scale-95"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4.5 w-4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h10" />
        </svg>
      </button>

      {/* Paso actual de la guía (tocar para avanzar) */}
      {steps.length > 0 && current ? (
        <button
          type="button"
          onClick={() => setStepIndex((index) => (index + 1) % steps.length)}
          aria-label={`Paso ${stepIndex + 1} de ${steps.length}: ${current.title}`}
          className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] z-30 mx-auto flex w-fit max-w-[90%] items-center gap-2 rounded-full bg-ink-950/70 px-4 py-2 backdrop-blur"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-ink-950">
            {stepIndex + 1}
          </span>
          <span className="truncate text-xs font-medium text-white/90">
            {current.title}
          </span>
          <span className="shrink-0 text-[10px] text-white/40">
            {stepIndex + 1}/{steps.length}
          </span>
        </button>
      ) : (
        <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] z-30 mx-auto w-fit max-w-[90%] rounded-full bg-ink-950/70 px-4 py-2 text-center text-xs text-white/70 backdrop-blur">
          {styleName
            ? 'Coloca el rostro frente a la cámara para ver los pasos'
            : 'Elige un estilo de barba para empezar'}
        </div>
      )}

      {/* Pista inicial + aviso de calidad */}
      <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top,0px)+3.25rem)] z-20 flex flex-col items-center gap-2 px-4">
        {showHint ? (
          <span className="rounded-full bg-brand-500/20 px-3 py-1 text-[11px] text-brand-400 backdrop-blur">
            Toca el paso de abajo para avanzar
          </span>
        ) : null}
        {unstable ? (
          <span className="rounded-full bg-ink-950/75 px-3 py-1 text-[11px] text-white/70 backdrop-blur">
            Poca luz o rostro descentrado
          </span>
        ) : null}
      </div>
    </>
  );
}
