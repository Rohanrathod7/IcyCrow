import { signal } from '@preact/signals';
import type { Highlight, SpacesStore, ChatMessage, UUID } from '../lib/types';

export type ViewType = 'home' | 'search' | 'chat' | 'spaces' | 'settings' | 'highlights';

export interface SearchResult {
  text: string;
  score?: number;
  id: string;
}

export const activeView = signal<ViewType>('home');
export const activeSpaceId = signal<UUID | null>(null);
export const allHighlights = signal<Highlight[]>([]);
export const spaces = signal<SpacesStore>({});
export const searchResults = signal<SearchResult[]>([]);
export const chatMessages = signal<ChatMessage[]>([]);
export const selectedContextTabs = signal<Array<{ tabId: number; url: string; title: string }>>([]);
export const isLoading = signal(false);
export const error = signal<string | null>(null);

/**
 * Syncs the unified highlights list from all chrome.storage.local buckets.
 */
export async function syncAllHighlights() {
  try {
    const data = await chrome.storage.local.get(null);
    const merged: Highlight[] = [];
    Object.keys(data).forEach(key => {
      if (key.startsWith('highlights:')) {
        merged.push(...(data[key] as Highlight[]));
      }
    });
    // Sort by createdAt descending
    allHighlights.value = merged.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (err) {
    console.error('[IcyCrow] Failed to sync all highlights:', err);
  }
}

// Global listener for storage changes to keep allHighlights in sync
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      const hasHighlightChange = Object.keys(changes).some(k => k.startsWith('highlights:'));
      if (hasHighlightChange) {
        syncAllHighlights();
      }
    }
  });
}

