import { signal } from '@preact/signals';
import type { Highlight, SpacesStore, ChatMessage, UUID } from '../lib/types';

export type ViewType = 'home' | 'search' | 'chat' | 'spaces' | 'settings';

export interface SearchResult {
  text: string;
  score?: number;
  id: string;
}

export const activeView = signal<ViewType>('home');
export const activeSpaceId = signal<UUID | null>(null);
export const highlights = signal<Highlight[]>([]);
export const spaces = signal<SpacesStore>({});
export const searchResults = signal<SearchResult[]>([]);
export const chatMessages = signal<ChatMessage[]>([]);
export const selectedContextTabs = signal<Array<{ tabId: number; url: string; title: string }>>([]);
export const isLoading = signal(false);
export const error = signal<string | null>(null);

