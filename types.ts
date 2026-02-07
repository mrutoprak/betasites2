
export interface MnemonicResult {
  meaning: string;
  targetWord: string;
  keyword: string;
  story: string;
  imagePrompt: string;
  targetLangCode: string;
  quotaRemaining?: string;
}

export interface LoadingState {
  isTextLoading: boolean;
  isImageLoading: boolean;
}

export type ImageModelType = 'gemini-2.5-flash';

export interface Flashcard {
  id: string;
  title: string; // Front (Turkish Meaning)
  target: string; // Back (Target Word)
  subtext: string; // Back (Keyword + Story)
  lang: string;
  imgSrc: string;
  createdAt: number;
  nextTimer?: number;
  lastTimerStartedAt?: number;
}

export interface Folder {
  id: string;
  name: string;
  cards: Flashcard[];
}

export const PRIMARY_LANGUAGES: Record<string, string> = {
  ar: 'Arabic',
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish'
};

export const LANGUAGE_MAP: Record<string, string> = {
  ...PRIMARY_LANGUAGES,
  jp: 'Japanese',
  it: 'Italian',
  ru: 'Russian',
  zh: 'Chinese',
  tr: 'Turkish'
};
