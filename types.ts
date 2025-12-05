export interface CaptionSuggestion {
  text: string;
  category: 'funny' | 'sarcastic' | 'wholesome' | 'relatable';
}

export interface MemeState {
  originalImage: string | null; // Base64
  currentImage: string | null; // Base64 (might be edited)
  selectedCaption: string;
  topText: string;
  bottomText: string;
  isLoading: boolean;
  loadingMessage: string;
}

export enum GeminiModel {
  EDITING = 'gemini-2.5-flash-image',
}