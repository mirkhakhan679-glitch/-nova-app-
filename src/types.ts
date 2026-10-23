export type Role = 'user' | 'assistant' | 'system';

export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  prompt: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  isUrdu?: boolean;
  media?: MediaItem;
  audioUrl?: string;
  isAudioLoading?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
}

export interface AppSettings {
  apiKey: string;
  textModel: string;
  imageModel: string;
  videoModel: string;
  voiceModel: string;
  voice: string;
  voiceRepliesEnabled: boolean;
  preferredLanguage: 'auto' | 'urdu' | 'english';
}
