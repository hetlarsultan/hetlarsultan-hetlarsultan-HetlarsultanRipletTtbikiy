export type VideoModel = 
  | 'Sora 2' 
  | 'Kling v1.5' 
  | 'Veo 3.1' 
  | 'Luma Dream Machine' 
  | 'Runway Gen-3' 
  | 'Midjourney v6' 
  | 'DALL-E 3' 
  | 'ElevenLabs Alpha'
  | 'Veo 3'
  | 'Nano Banana 2'
  | 'Lyria'
  | 'Gemini 3.1 Pro';

export type MediaType = 'video' | 'image' | 'audio' | 'chat' | 'analysis' | 'movie' | 'character' | 'animated-image';

export type CharacterStyle = 'realistic' | 'cartoon' | 'fantasy' | '3d-animation';

export interface Character {
  id: string;
  name: string;
  nameAr: string;
  role: string;
  description: string;
  avatar: string;
  glbUrl?: string;
  vrmUrl?: string; // Standard VRM format support
  style?: CharacterStyle;
  isCustom?: boolean;
  preferredVoice?: string;
  preferredDialect?: string;
}

export type VisualFilter = 'none' | 'sepia' | 'bw' | 'vintage' | 'cinematic' | 'noir' | 'vibrant';

export interface VoiceSettings {
  pitch: number; // 0.5 to 2.0
  speed: number; // 0.5 to 2.0
  tone: 'neutral' | 'warm' | 'serious' | 'energetic' | 'soft';
}

export interface ShotConfig {
  shotType: string;
  motion: string;
  lighting: string;
  style: string;
  fps: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  characterStyle?: CharacterStyle;
  voiceType?: 'girl' | 'child' | 'male' | 'female' | 'cartoon' | 'old-man' | 'syrian' | 'iraqi' | 'egyptian' | 'bedouin' | 'sheikh';
  dialect?: 'modern_standard' | 'syrian' | 'egyptian' | 'iraqi' | 'bedouin';
  environment?: 'desert' | 'city' | 'house' | 'mosque' | 'studio';
  voiceSettings?: VoiceSettings;
  soundscape?: 'love' | 'action' | 'war' | 'ambient';
  filter?: VisualFilter;
  selectedCharacters?: Character[];
  isTalkingHead?: boolean;
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'excited' | 'serene';
}

export type GenerationStatus = 
  | 'waiting' 
  | 'analyzing' 
  | 'visualizing' 
  | 'rendering' 
  | 'syncing_audio' 
  | 'completed' 
  | 'failed' 
  | 'error';

export interface Generation {
  id: string;
  type: MediaType;
  timestamp: number;
  prompt: string;
  originalPrompt?: string; // The raw dialogue/user text before technical wrapping
  model: string;
  config: ShotConfig;
  status: GenerationStatus | 'generating'; // 'generating' is a legacy legacy catch-all
  currentStage?: string;
  progress?: number;
  previewUrl?: string;
  scenes?: string[]; 
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
