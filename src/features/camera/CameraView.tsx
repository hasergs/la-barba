import type { RefObject } from 'react';
import type { CameraState, CameraStatus } from '../../contracts/types';

export interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  /** Si true, el vídeo se muestra espejado (selfie). */
  mirrored?: boolean;
}

const OVERLAY_BY_STATE: Record<CameraState, string | null> = {
  idle: 'Pulsa para activar la cámara',
  requesting: 'Solicitando permiso de cámara…',
  streaming: null,
  denied: 'Permiso de cámara denegado. Actívalo en los ajustes del navegador.',
  error: 'No se pudo acceder a la cámara.',
  unsupported: 'Tu navegador no soporta el acceso a la cámara.',
};

/**
 * Vista presentacional de la cámara.
 *
 * El `<video>` llena el contenedor con `object-cover`. Cuando `mirrored` está
 * activo se aplica `-scale-x-100` SOLO al vídeo; el overlay NO se espeja por
 * CSS (las coordenadas del renderer se espejan en su espacio, no en pantalla).
 */
export function CameraView({
  videoRef,
  status,
  mirrored = true,
}: CameraViewProps) {
  const message =
    status.state === 'error' && status.error
      ? status.error
      : OVERLAY_BY_STATE[status.state];

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <video
        ref={videoRef}
        className={`h-full w-full object-cover ${mirrored ? '-scale-x-100' : ''}`}
        playsInline
        muted
        autoPlay
      />
      {message ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/70 p-6">
          <p className="max-w-xs text-center text-sm text-white/80">{message}</p>
        </div>
      ) : null}
    </div>
  );
}
