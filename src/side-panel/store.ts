import { signal } from '@preact/signals';
import type { Highlight, SpacesStore, ChatMessage, UUID, ChatEngine, IcyCrowSettings } from '../lib/types';
import { DEFAULT_SETTINGS } from '../lib/constants';
import { sendToSW } from '../lib/messaging';

export type ViewType = 'home' | 'search' | 'chat' | 'spaces' | 'settings' | 'highlights';
export type AppStatus = 'idle' | 'saving' | 'thinking' | 'success';

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
export const chatEngine = signal<ChatEngine>('gemini');
export const selectedContextTabs = signal<Array<{ tabId: number; url: string; title: string }>>([]);
export const isLoading = signal(false);
export const error = signal<string | null>(null);
export const settings = signal<IcyCrowSettings>(DEFAULT_SETTINGS);
export const isLocked = signal(true);
export const expandedSpaceId = signal<UUID | null>(null);
export const currentAppStatus = signal<AppStatus>('idle');

/**
 * Hydrates settings and session state.
 */
export async function hydrateStore() {
  try {
    const [local, session] = await Promise.all([
      chrome.storage.local.get('settings') as Promise<Record<string, any>>,
      chrome.storage.session.get('cryptoKeyUnlocked') as Promise<Record<string, any>>
    ]);
    if (local && local.settings) settings.value = local.settings as IcyCrowSettings;
    if (session.cryptoKeyUnlocked !== undefined) {
      isLocked.value = !session.cryptoKeyUnlocked;
    }
  } catch (err) {
    console.error('[IcyCrow] Hydration failed:', err);
  }
}

// Global listener for session changes
if (typeof chrome !== 'undefined' && chrome.storage?.session) {
  chrome.storage.session.onChanged.addListener((changes) => {
    if (changes.cryptoKeyUnlocked) {
      isLocked.value = !changes.cryptoKeyUnlocked.newValue;
    }
  });
}

let lastHydratedSpaceId: UUID | null = null;

/**
 * Loads the chat history for a specific space, with a hydration guard.
 */
export async function loadChatHistory(spaceId: UUID) {
  lastHydratedSpaceId = spaceId;
  try {
    const key = `chatHistories:${spaceId}`;
    const result = await chrome.storage.local.get(key);
    const history = (result[key] as ChatMessage[]) || [];
    
    // Guard: Only update if we're still on the same space
    if (lastHydratedSpaceId === spaceId) {
      chatMessages.value = history;
    }
  } catch (err) {
    console.error('[IcyCrow] Failed to load chat history:', err);
  }
}

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

/**
 * Updates a space name and persists to storage.
 */
export async function updateSpaceName(spaceId: UUID, newName: string) {
  try {
    await sendToSW({
      type: 'SPACE_UPDATE',
      payload: { spaceId, updates: { name: newName } }
    } as any);
    
    // Optimistic Update
    const current = { ...spaces.value };
    if (current[spaceId]) {
      current[spaceId] = { ...current[spaceId], name: newName };
      spaces.value = current;
    }
  } catch (err) {
    console.error('[IcyCrow] Failed to update space name:', err);
  }
}

/**
 * Removes a space and its associated data.
 */
export async function deleteSpace(spaceId: UUID) {
  try {
    await sendToSW({
      type: 'SPACE_DELETE',
      payload: { spaceId }
    } as any);
    
    const current = { ...spaces.value };
    delete current[spaceId];
    spaces.value = current;
  } catch (err) {
    console.error('[IcyCrow] Failed to delete space:', err);
  }
}

/**
 * Removes a specific tab from a space.
 */
export async function removeTabFromSpace(spaceId: UUID, tabId: UUID) {
  try {
    const currentSpace = spaces.value[spaceId];
    if (!currentSpace) return;

    const updatedTabs = currentSpace.tabs.filter(t => t.id !== tabId);
    
    await sendToSW({
      type: 'SPACE_UPDATE',
      payload: { spaceId, updates: { tabs: updatedTabs } }
    } as any);

    // Update signal
    const current = { ...spaces.value };
    current[spaceId] = { ...currentSpace, tabs: updatedTabs };
    spaces.value = current;
    
    // Manually trigger storage set to ensure immediate persistence
    await chrome.storage.local.set({ spaces: spaces.value });
    
  } catch (err) {
    console.error('[IcyCrow] Failed to remove tab from space:', err);
  }
}

