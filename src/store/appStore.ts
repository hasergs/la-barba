import { create } from 'zustand';
import type {
  BeardStyleId,
  CameraStatus,
  Diagnostics,
  FaceShapeResult,
  VisionDelegate,
} from '../contracts/types';

const INITIAL_DIAGNOSTICS: Diagnostics = {
  delegate: null,
  modelReady: false,
  frames: 0,
  fps: 0,
  landmarks: 0,
  quality: 0,
  lastError: null,
};

/**
 * Estado global de bajo refresco (PM-owned).
 *
 * ⚠️ Los datos de ALTA frecuencia (478 landmarks por frame) NO viven aquí:
 * viven en `features/face/frameStore.ts` (suscriptores imperativos) para
 * evitar re-render de React a 30fps. Aquí solo hay estado derivado / UI.
 */
interface AppState {
  camera: CameraStatus;
  /** true cuando ya se detectó alguna vez una cara estable */
  hasFace: boolean;
  faceShape: FaceShapeResult | null;
  selectedStyleId: BeardStyleId | null;
  /** 0..1 calidad de seguimiento */
  quality: number;
  unstable: boolean;
  showLandmarks: boolean;
  showHelp: boolean;
  /** delegado del modelo deseado (CPU por defecto: GPU es experimental). */
  visionDelegate: VisionDelegate;
  diagnostics: Diagnostics;

  setCamera: (camera: CameraStatus) => void;
  setHasFace: (hasFace: boolean) => void;
  setFaceShape: (faceShape: FaceShapeResult | null) => void;
  selectStyle: (id: BeardStyleId | null) => void;
  setQuality: (quality: number, unstable: boolean) => void;
  toggleLandmarks: () => void;
  setShowHelp: (showHelp: boolean) => void;
  setVisionDelegate: (delegate: VisionDelegate) => void;
  /** Mezcla parcial: los hooks publican solo los campos que cambian. */
  setDiagnostics: (partial: Partial<Diagnostics>) => void;
}

export const DEFAULT_VISION_DELEGATE: VisionDelegate = 'CPU';

export const useAppStore = create<AppState>((set) => ({
  camera: { state: 'idle', width: 0, height: 0 },
  hasFace: false,
  faceShape: null,
  selectedStyleId: null,
  quality: 0,
  unstable: false,
  showLandmarks: false,
  showHelp: false,
  visionDelegate: DEFAULT_VISION_DELEGATE,
  diagnostics: INITIAL_DIAGNOSTICS,

  setCamera: (camera) => set({ camera }),
  setHasFace: (hasFace) => set({ hasFace }),
  setFaceShape: (faceShape) => set({ faceShape }),
  selectStyle: (selectedStyleId) => set({ selectedStyleId }),
  setQuality: (quality, unstable) => set({ quality, unstable }),
  toggleLandmarks: () => set((s) => ({ showLandmarks: !s.showLandmarks })),
  setShowHelp: (showHelp) => set({ showHelp }),
  setVisionDelegate: (visionDelegate) =>
    set((s) => ({
      visionDelegate,
      diagnostics: { ...s.diagnostics, delegate: null, modelReady: false, lastError: null },
    })),
  setDiagnostics: (partial) =>
    set((s) => ({ diagnostics: { ...s.diagnostics, ...partial } })),
}));
