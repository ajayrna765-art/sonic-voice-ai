export interface VoiceOption {
  id: string;
  name: string;
  hindiName?: string;
  gender: 'Female' | 'Male' | 'Neutral';
  language: 'Hindi' | 'English' | 'Multilingual';
  accent: string;
  description: string;
  category: 'gemini-ai' | 'browser-native';
  sampleText?: string;
  traits: string[];
  color: string;
  baseGeminiVoice?: string;
  isPhoneticSpecialist?: boolean;
}

export type SpeechStyle = 
  | 'natural'
  | 'cheerful'
  | 'storyteller'
  | 'meditative'
  | 'dramatic'
  | 'newscaster'
  | 'whisper'
  | 'energetic'
  | 'hindi-shudh'
  | 'hinglish-conversational';

export type EmotionStrength = 'subtle' | 'neutral' | 'expressive';

export interface DialogueLine {
  id: string;
  speaker: 'Speaker A' | 'Speaker B';
  voice: string;
  text: string;
  emotion?: string;
}

export interface GeneratedAudioItem {
  id: string;
  timestamp: number;
  text: string;
  voiceName: string;
  voiceCategory: 'gemini-ai' | 'browser-native';
  language?: string;
  style?: string;
  duration?: number;
  audioUrl?: string; // Blob URL or base64 data URL
  audioBlob?: Blob;
  isDialogue?: boolean;
}

export interface PresetScript {
  id: string;
  title: string;
  category: string;
  language?: 'Hindi' | 'English' | 'Hinglish';
  icon: string;
  recommendedVoice: string;
  recommendedStyle: SpeechStyle;
  text: string;
}

export interface PaymentTransaction {
  id: string;
  timestamp: number;
  amount: number; // in INR e.g. 20
  creditsAdded: number;
  paymentMethod: 'UPI' | 'QR_CODE' | 'CARD' | 'TEST_SIMULATION';
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  utrRef?: string;
}

export interface UserCreditsState {
  creditsRemaining: number;
  totalUsed: number;
  hasPurchasedPro: boolean;
  history: PaymentTransaction[];
}
