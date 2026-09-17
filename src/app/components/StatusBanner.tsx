import { useAppStore } from '../../store/appStore';

interface StatusBannerProps {
  modelReady: boolean;
  modelError: string | null;
}

/** Avisos de estado: carga del modelo, calidad de seguimiento y errores. */
export function StatusBanner({ modelReady, modelError }: StatusBannerProps) {
  const hasFace = useAppStore((s) => s.hasFace);
  const unstable = useAppStore((s) => s.unstable);
  const quality = useAppStore((s) => s.quality);

  if (modelError) {
    return (
      <Banner tone="danger">{modelError}</Banner>
    );
  }

  if (!modelReady) {
    return <Banner tone="neutral">Cargando modelo de rostro…</Banner>;
  }

  if (!hasFace) {
    return (
      <Banner tone="neutral">
        Coloca tu rostro en el encuadre y mantén la cámara a un brazo de distancia.
      </Banner>
    );
  }

  if (unstable) {
    return (
      <Banner tone="warn">
        Poca luz o rostro descentrado. Acércate al centro del encuadre.
      </Banner>
    );
  }

  if (quality < 0.65) {
    return (
      <Banner tone="neutral">
        Buena detección. Mantén la cara quieta para afinar las líneas.
      </Banner>
    );
  }

  return null;
}

const TONE_CLASS: Record<string, string> = {
  neutral: 'bg-ink-950/75 text-white/75',
  warn: 'bg-brand-500/20 text-brand-400',
  danger: 'bg-danger-400/20 text-danger-400',
};

function Banner({
  tone,
  children,
}: {
  tone: 'neutral' | 'warn' | 'danger';
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={`pointer-events-none rounded-xl px-3 py-2 text-center text-[11px] backdrop-blur ${TONE_CLASS[tone]}`}
    >
      {children}
    </div>
  );
}
