export interface TreadDepth {
  center: string;
  innerEdge: string;
  outerEdge: string;
}

export interface WearPattern {
  innerEdge: string;
  center: string;
  outerEdge: string;
}

export interface SafetyInfo {
  isSafeToDrive: boolean;
  sufficientTread: boolean;
  unevenWear: boolean;
  needsReplacement: boolean;
}

export interface Recommendations {
  replacementTimeline: 'immediate' | 'soon' | 'monitor';
  explanation: string;
}

export interface TyreAnalysis {
  treadDepth: TreadDepth;
  wearPattern: WearPattern;
  damage: string;
  safety: SafetyInfo;
  recommendations: Recommendations;
}

export interface TireMedia {
  file: File | null;
  preview: string;
  type: 'image' | 'video';
  frames?: string[];
}

export enum ViewType {
  TREAD_VIEW = 'treadView'
}

export interface ViewData {
  treadView: TireMedia;
}

export interface AnalysisState {
  treadView: TyreAnalysis | null;
}