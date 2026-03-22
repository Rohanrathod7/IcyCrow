import { signal } from '@preact/signals';
import type { Highlight, SpacesStore } from '../lib/types';

export type ViewType = 'home' | 'search' | 'spaces' | 'settings';

export interface SearchResult {
  text: string;
  score?: number;
  id: string;
}

export const activeView = signal<ViewType>('home');
export const highlights = signal<Highlight[]>([]);
export const spaces = signal<SpacesStore>({});
export const searchResults = signal<SearchResult[]>([]);
export const isLoading = signal(false);
export const error = signal<string | null>(null);

