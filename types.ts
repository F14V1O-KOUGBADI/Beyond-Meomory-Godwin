export interface Memory {
  id: string;
  content: string;
  date: string;
  emotions: string[];
  themes: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  isTyping?: boolean;
}

export interface Product {
  id: string;
  title: string;
  category: 'Monuments' | 'Decorations' | 'Univers';
  price: number;
  rarity: 'Classic' | 'Rare' | 'Legendary' | 'Immortal';
  image: string;
}

// Configuration pour Gemini
export enum GeminiModel {
  TEXT = 'gemini-2.5-flash',
}
