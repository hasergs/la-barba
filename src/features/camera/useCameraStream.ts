import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { CameraStatus } from '../../contracts/types';
import { useAppStore } from '../../store/appStore';

const IDLE_STATUS: CameraStatus = { state: 'idle', width: 0, height: 0 };

/**
 * Gestiona el ciclo de vida de la cámara frontal.
 *
 * Actualiza el store global (`setCamera`) con el estado y las dimensiones
 * reales del track, y limpia todo (tracks + `srcObject`) al parar o desmontar.
 */
export function useCameraStream(): {
  status: CameraStatus;
  videoRef: RefObject<HTMLVideoElement | null>;
  start: () => Promise<void>;
  stop: () => void;
  mirrored: boolean;
  toggleMirror: () => void;
} {
  const [status, setStatus] = useState<CameraStatus>(IDLE_STATUS);
  const [mirrored, setMirrored] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const apply = useCallback((next: CameraStatus) => {
    setStatus(next);
    useAppStore.getState().setCamera(next);
  }, []);

  const stop = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
    apply({ state: 'idle', width: 0, height: 0 });
  }, [apply]);

  const start = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      apply({
        state: 'unsupported',
        error: 'Tu navegador no soporta el acceso a la cámara.',
        width: 0,
        height: 0,
      });
      return;
    }

    apply({ state: 'requesting', width: 0, height: 0 });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      const video = videoRef.current;
      if (!video) {
        for (const track of stream.getTracks()) track.stop();
        apply({
          state: 'error',
          error: 'No se encontró el elemento de vídeo.',
          width: 0,
          height: 0,
        });
        return;
      }

      streamRef.current = stream;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;

      try {
        await video.play();
      } catch {
        // Algunos navegadores difieren la reproducción hasta un gesto del usuario.
      }

      const track = stream.getVideoTracks()[0];
      const settings = track?.getSettings();
      const width = settings?.width ?? video.videoWidth;
      const height = settings?.height ?? video.videoHeight;

      apply({ state: 'streaming', width, height });
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        apply({
          state: 'denied',
          error: 'Permiso de cámara denegado.',
          width: 0,
          height: 0,
        });
      } else {
        apply({
          state: 'error',
          error: 'No se pudo acceder a la cámara.',
          width: 0,
          height: 0,
        });
      }
    }
  }, [apply]);

  const toggleMirror = useCallback(() => {
    setMirrored((value) => !value);
  }, []);

  useEffect(() => {
    return () => {
      const stream = streamRef.current;
      if (stream) {
        for (const track of stream.getTracks()) track.stop();
        streamRef.current = null;
      }
      const video = videoRef.current;
      if (video) {
        video.srcObject = null;
      }
    };
  }, []);

  return { status, videoRef, start, stop, mirrored, toggleMirror };
}
