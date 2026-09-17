export {
  BEARD_STYLES,
  BEARD_STYLE_LIST,
  getStyleById,
  isClosedPolygon,
  isOpenGuideLine,
} from './beardStyles';
export { createFaceProjector, buildOverlayModel } from './maskBuilder';
export type { FaceProjector } from './maskBuilder';
export {
  STYLE_FIT_MATRIX,
  recommendStyles,
  styleFit,
} from './recommendationMatrix';
export type { StyleFit } from './recommendationMatrix';
export { buildGuidance } from './guidance';
