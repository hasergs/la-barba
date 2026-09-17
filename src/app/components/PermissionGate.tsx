import type { CameraStatus } from '../../contracts/types';

interface PermissionGateProps {
  status: CameraStatus;
  loading: boolean;
  onStart: () => void;
}

const FEATURES = [
  'Detecta la forma de tu rostro en tiempo real',
  '5 estilos de barba con líneas de perfilado',
  'Guía paso a paso para afeitarte con espejo',
];

/**
 * Pantalla de bienvenida y activación de cámara.
 *
 * El acceso a la cámara exige un gesto del usuario (sobre todo en iOS), por eso
 * nunca se solicita automáticamente al cargar.
 */
export function PermissionGate({ status, loading, onStart }: PermissionGateProps) {
  const blocked = status.state === 'unsupported';
  const denied = status.state === 'denied';
  const failed = status.state === 'error';

  return (
    <div className="absolute inset-0 z-50 flex min-h-dvh flex-col items-center justify-center gap-8 overflow-y-auto bg-ink-950 px-6 py-10 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/15 text-3xl">
          <span aria-hidden>🪒</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-400">
          La Barba
        </h1>
        <p className="max-w-sm text-sm text-white/60">
          Analiza tu rostro con la cámara y te muestra dónde recortar y perfilar
          según el estilo de barba que elijas.
        </p>
      </div>

      <ul className="flex w-full max-w-sm flex-col gap-2 text-left text-sm text-white/70">
        {FEATURES.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span className="mt-0.5 text-accent-400" aria-hidden>
              ✓
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {denied ? (
        <p className="max-w-sm rounded-xl bg-danger-400/10 px-4 py-3 text-sm text-danger-400">
          El permiso de cámara está bloqueado. Actívalo en los ajustes del
          navegador y vuelve a intentarlo.
        </p>
      ) : null}

      {failed && status.error ? (
        <p className="max-w-sm rounded-xl bg-danger-400/10 px-4 py-3 text-sm text-danger-400">
          {status.error}
        </p>
      ) : null}

      {blocked ? (
        <p className="max-w-sm rounded-xl bg-danger-400/10 px-4 py-3 text-sm text-danger-400">
          Tu navegador no soporta el acceso a la cámara. Prueba con Chrome o
          Safari actualizados.
        </p>
      ) : (
        <button
          type="button"
          onClick={onStart}
          disabled={loading}
          className="w-full max-w-sm rounded-2xl bg-brand-500 px-6 py-4 text-base font-semibold text-ink-950 transition active:scale-[0.98] disabled:opacity-60"
        >
          {loading || status.state === 'requesting'
            ? 'Solicitando permiso…'
            : denied
              ? 'Reintentar'
              : 'Activar cámara'}
        </button>
      )}

      <p className="max-w-xs text-xs leading-relaxed text-white/35">
        Todo el análisis ocurre en tu dispositivo. Ninguna imagen sale de tu
        teléfono.
      </p>
    </div>
  );
}
