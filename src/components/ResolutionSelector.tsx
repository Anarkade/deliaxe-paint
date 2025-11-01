// Obsolete wrapper kept for compatibility after folder reorg.
// Re-export the new component and its types from tabMenus.
export {
  ChangeImageResolution as ResolutionSelector,
} from './tabMenus/ChangeImageResolution';

export type {
  ResolutionType,
  AlignmentMode,
  ScalingMode,
  CombinedScalingMode,
} from './tabMenus/ChangeImageResolution';
