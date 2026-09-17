import { useCallback, useEffect, useRef } from 'react';
import { CameraView, useCameraStream } from '../features/camera';
import { loadFaceLandmarker, getActiveDelegate } from '../features/face';
import { OverlayCanvas } from '../features/overlay';
import { recommendStyles } from '../features/beard';
import { useAppStore } from '../store/appStore';
import { GuidancePanel } from './components/GuidancePanel';
import { HelpSheet } from './components/HelpSheet';
import { PermissionGate } from './components/PermissionGate';
import { StatusBanner } from './components/StatusBanner';
import { StyleSelector } from './components/StyleSelector';
import { TopBar } from './components/TopBar';
import { useFaceAnalysis } from './hooks/useFaceAnalysis';
import { useInstallPrompt } from './hooks/useInstallPrompt';

export default function App() {
  const { status, videoRef, start, stop, mirrored, toggleMirror } =
    useCameraStream();
  const streaming = status.state === 'streaming';

  const { ready: modelReady, error: modelError } = useFaceAnalysis({
    videoRef,
    enabled: streaming,
  });

  const faceShape = useAppStore((s) => s.faceShape);
  const selectedStyleId = useAppStore((s) => s.selectedStyleId);
  const selectStyle = useAppStore((s) => s.selectStyle);
  const showLandmarks = useAppStore((s) => s.showLandmarks);
  const toggleLandmarks = useAppStore((s) => s.toggleLandmarks);
  const setShowHelp = useAppStore((s) => s.setShowHelp);

  const { canInstall, install } = useInstallPrompt();
  const visionDelegate = useAppStore((s) => s.visionDelegate);

  // Precalienta el modelo (~10 MB) mientras el usuario lee la pantalla de
  // bienvenida y concede el permiso: la espera percibida baja a casi cero.
  useEffect(() => {
    void loadFaceLandmarker(visionDelegate).catch(() => undefined);
  }, [visionDelegate]);

  useEffect(() => {
    if (!modelReady) return;
    useAppStore.getState().setDiagnostics({ delegate: getActiveDelegate() });
  }, [modelReady]);

  // Selecciona automáticamente el mejor estilo la primera vez que hay forma
  // detectada (el usuario puede cambiarlo después).
  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (autoSelectedRef.current || selectedStyleId || !faceShape) return;
    const top = recommendStyles(faceShape.shape)[0];
    if (top) {
      selectStyle(top.styleId);
      autoSelectedRef.current = true;
    }
  }, [faceShape, selectedStyleId, selectStyle]);

  const handleStart = useCallback(() => {
    void start();
  }, [start]);

  const handleInstall = useCallback(() => {
    void install();
  }, [install]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      {/* El <video> debe existir ANTES de pedir getUserMedia, por eso la vista de
          cámara está siempre montada y la puerta de permiso se superpone. */}
      <CameraView videoRef={videoRef} status={status} mirrored={mirrored} />

      {streaming ? (
        <>
          <OverlayCanvas videoRef={videoRef} mirrored={mirrored} />

          <TopBar
            mirrored={mirrored}
            onToggleMirror={toggleMirror}
            showLandmarks={showLandmarks}
            onToggleLandmarks={toggleLandmarks}
            canInstall={canInstall}
            onInstall={handleInstall}
            onOpenHelp={() => setShowHelp(true)}
          />

          <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top,0px)+4.75rem)] z-10 mx-auto flex max-w-md justify-center px-4">
            <StatusBanner modelReady={modelReady} modelError={modelError} />
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 mx-auto flex max-w-md flex-col gap-3 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
            <StyleSelector shape={faceShape?.shape ?? null} />
            <GuidancePanel />

            <button
              type="button"
              onClick={stop}
              className="self-center rounded-full px-4 py-1.5 text-[11px] text-white/40 transition hover:text-white/70"
            >
              Detener cámara
            </button>
          </div>

          <HelpSheet />
        </>
      ) : (
        <PermissionGate status={status} loading={false} onStart={handleStart} />
      )}
    </div>
  );
}
