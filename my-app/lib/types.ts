export interface TyreSize {
    width: number | 'not available';
    aspectRatio: number | 'not available';
    wheelDiameter: number | 'not available';
    fullSize: string;
    isImageClear: boolean;
  }
  
  export interface SafetyInfo {
    isSafeToDrive: boolean;
    visibleDamage: boolean;
    sufficientTread: boolean;
    unevenWear: boolean;
    needsReplacement: boolean;
  }
  
  export interface Explanations {
    safety: string;
    damage: string;
    tread: string;
    wear: string;
    replacement: string;
  }
  
  export interface TyreAnalysis {
    tyreSize: TyreSize;
    safety?: SafetyInfo;
    explanations?: Explanations;
  }
  
  export interface TireImage {
    file: File | null;
    preview: string;
  }
  export interface TireMedia {
    file: File | null;
    preview: string;
    type: 'image' | 'video';
  }
  
  export type ViewType = 'treadView' | 'sidewallView';
  
  export interface AnalysisState {
    treadView: TyreAnalysis | null;
    sidewallView: TyreAnalysis | null;
  }
  
  export interface ViewData {
    treadView: TireMedia;
    sidewallView: TireMedia;
  }
  
