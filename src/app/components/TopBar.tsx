import { FaceShapeBadge } from './FaceShapeBadge';

interface TopBarProps {
  mirrored: boolean;
  onToggleMirror: () => void;
  showLandmarks: boolean;
  onToggleLandmarks: () => void;
  canInstall: boolean;
  onInstall: () => void;
  onOpenHelp: () => void;
}

interface IconButtonProps {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function IconButton({ label, active = false, onClick, children }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`flex h-10 w-10 items-center justify-center rounded-full backdrop-blur transition active:scale-95 ${
        active
          ? 'bg-brand-500 text-ink-950'
          : 'bg-ink-950/70 text-white/80 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

/** Barra superior sobre el vídeo: forma detectada + acciones. */
export function TopBar({
  mirrored,
  onToggleMirror,
  showLandmarks,
  onToggleLandmarks,
  canInstall,
  onInstall,
  onOpenHelp,
}: TopBarProps) {
  return (
    <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
      <FaceShapeBadge />

      <div className="flex items-center gap-2">
        {canInstall ? (
          <IconButton label="Instalar app" onClick={onInstall}>
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
          </IconButton>
        ) : null}

        <IconButton
          label={showLandmarks ? 'Ocultar puntos' : 'Mostrar puntos'}
          active={showLandmarks}
          onClick={onToggleLandmarks}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="2.4" />
            <circle cx="4.5" cy="9" r="1.6" />
            <circle cx="19.5" cy="9" r="1.6" />
            <circle cx="6.5" cy="17" r="1.6" />
            <circle cx="17.5" cy="17" r="1.6" />
          </svg>
        </IconButton>

        <IconButton
          label={mirrored ? 'Desactivar espejo' : 'Activar espejo'}
          active={mirrored}
          onClick={onToggleMirror}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 3v18" />
            <path d="M8 7 4 12l4 5" />
            <path d="m16 7 4 5-4 5" />
          </svg>
        </IconButton>

        <IconButton label="Ayuda" onClick={onOpenHelp}>
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7v.3" />
            <path d="M12 17h.01" />
          </svg>
        </IconButton>
      </div>
    </div>
  );
}
