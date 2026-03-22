import { signal } from '@preact/signals';
import type { Highlight, SpacesStore } from '../lib/types';

export type ViewType = 'home' | 'search' | 'spaces' | 'settings';

export const activeView = signal<ViewType>('home');
export const highlights = signal<Highlight[]>([]);
export const spaces = signal<SpacesStore>({});
export const searchResults = signal<any[]>([]); // To beTyped with SearchResult in S11
export const isLoading = signal(false);
