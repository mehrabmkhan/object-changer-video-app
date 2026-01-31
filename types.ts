
export interface AnalysisResult {
  environment: string;
  subjects: string;
  lighting: string;
  cinematography: string;
  originalCar: string;
  suggestedPrompt: string;
}

export interface GenerationStatus {
  stage: 'idle' | 'analyzing' | 'configuring' | 'generating' | 'completed' | 'error';
  message: string;
}

export interface VideoMetadata {
  name: string;
  size: number;
  type: string;
  url: string;
  base64: string;
}
