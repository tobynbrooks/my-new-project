export interface TyreSize {
    fullSize: string;
    width: number;
    aspectRatio: number;
    wheelDiameter: number;
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
    safety: SafetyInfo;
    explanations: Explanations;
  }
  
  export interface TireImage {
    file: File | null;
    preview: string;
  }
  export interface TireMedia {
    file: File | null;
    preview: string;
    type: 'image' | 'video';
    frames?: string[];
  }
  
  export type ViewType = 'treadView' | 'sidewallView';
  
  export interface AnalysisState {
    [key: string]: TyreAnalysis | null;
  }
  
  export interface ViewData {
    treadView: TireMedia;
    sidewallView: TireMedia;
  }

  type MessageContentText = {
    type: "text";
    text: string;
  };
  
  type MessageContentImage = {
    type: "image";
    source: {
      type: "base64";
      media_type: string;
      data: string;
    };
  };
  
  export type Content = MessageContentText | MessageContentImage;