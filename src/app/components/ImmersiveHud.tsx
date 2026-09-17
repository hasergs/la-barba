import { useAppStore } from '../../store/appStore';

/**
 * Modo afeitado: deja la vista limpia.
 *
 * Solo se muestra un botón discreto para volver a los paneles; las líneas de
 * perfilado siguen dibujadas por el overlay. No se muestran números, pasos ni
 * avisos para no tapar la cara mientras te afeitas.
 */
export function ImmersiveHud({ onExit }: { onExit: () => void }) {
  const unstable = useAppStore((s) => s.unstable);

  return (
    <>
      <button
        type="button"
        onClick={onExit}
        aria-label="Mostrar los paneles"
        className="absolute right-3 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-30 flex h-9 w-9 items-center justify-center rounded-full bg-ink-950/55 text-white/60 backdrop-blur transition active:scale-95"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
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

      {/* Único aviso permitido: si la detección se degrada, las líneas dejan de
          ser fiables. Es un punto, no texto con instrucciones. */}
      {unstable ? (
        <span
          aria-hidden
          className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-30 h-2 w-2 rounded-full bg-brand-400"
        />
      ) : null}
    </>
  );
}
