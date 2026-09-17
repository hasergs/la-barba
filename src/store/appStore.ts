import { create } from 'zustand';
import type {
  BeardStyleId,
  CameraStatus,
  FaceShapeResult,
} from '../contracts/types';

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

  setCamera: (camera: CameraStatus) => void;
  setHasFace: (hasFace: boolean) => void;
  setFaceShape: (faceShape: FaceShapeResult | null) => void;
  selectStyle: (id: BeardStyleId | null) => void;
  setQuality: (quality: number, unstable: boolean) => void;
  toggleLandmarks: () => void;
  setShowHelp: (showHelp: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  camera: { state: 'idle', width: 0, height: 0 },
  hasFace: false,
  faceShape: null,
  selectedStyleId: null,
  quality: 0,
  unstable: false,
  showLandmarks: false,
  showHelp: false,

  setCamera: (camera) => set({ camera }),
  setHasFace: (hasFace) => set({ hasFace }),
  setFaceShape: (faceShape) => set({ faceShape }),
  selectStyle: (selectedStyleId) => set({ selectedStyleId }),
  setQuality: (quality, unstable) => set({ quality, unstable }),
  toggleLandmarks: () => set((s) => ({ showLandmarks: !s.showLandmarks })),
  setShowHelp: (showHelp) => set({ showHelp }),
}));
