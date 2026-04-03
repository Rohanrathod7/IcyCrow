import { signal } from '@preact/signals';
import { arrayMove } from '@dnd-kit/sortable';
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
export const commandPaletteOpen = signal(false);

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

/**
 * Reorders tabs within a space.
 */
export async function reorderTabsInSpace(spaceId: UUID, activeId: string, overId: string, shouldPersist = false) {
  const currentSpace = spaces.value[spaceId];
  if (!currentSpace) return;

  const oldIndex = currentSpace.tabs.findIndex(t => t.id === activeId);
  const newIndex = currentSpace.tabs.findIndex(t => t.id === overId);

  // Idempotency: skip if already correct
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return;
  }

  const updatedTabs = arrayMove(currentSpace.tabs, oldIndex, newIndex);

  const current = { ...spaces.value };
  current[spaceId] = { ...currentSpace, tabs: updatedTabs };
  spaces.value = current;

  if (shouldPersist) {
    await chrome.storage.local.set({ spaces: spaces.value });
  }
}

/**
 * Moves a tab from one space to another.
 */
export async function moveTabBetweenSpaces(tabId: string, fromSpaceId: UUID, toSpaceId: UUID, newIndex: number, shouldPersist = false) {
  const fromSpace = spaces.value[fromSpaceId];
  const toSpace = spaces.value[toSpaceId];
  if (!fromSpace || !toSpace) return;

  const tabIndex = fromSpace.tabs.findIndex(t => t.id === tabId);
  // Idempotency: don't move if it's already there at the right index
  if (tabIndex === -1) {
    if (toSpace.tabs[newIndex]?.id === tabId || fromSpaceId === toSpaceId) return;
  }

  const tab = fromSpace.tabs[tabIndex];
  if (!tab) return;
  
  const newFromTabs = fromSpace.tabs.filter(t => t.id !== tabId);
  const newToTabs = [...toSpace.tabs];
  newToTabs.splice(newIndex, 0, tab);

  const current = { ...spaces.value };
  current[fromSpaceId] = { ...fromSpace, tabs: newFromTabs };
  current[toSpaceId] = { ...toSpace, tabs: newToTabs };
  spaces.value = current;

  if (shouldPersist) {
    await chrome.storage.local.set({ spaces: spaces.value });
  }
}


/**
 * PURE FUNCTION: Calculates new spaces state after reordering.
 */
export function calculateReorder(currentSpaces: SpacesStore, spaceId: UUID, activeId: string, overId: string): SpacesStore | null {
  const currentSpace = currentSpaces[spaceId];
  if (!currentSpace) return null;

  const oldIndex = currentSpace.tabs.findIndex(t => t.id === activeId);
  const newIndex = currentSpace.tabs.findIndex(t => t.id === overId);

  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return null;

  const updatedTabs = arrayMove(currentSpace.tabs, oldIndex, newIndex);
  return {
    ...currentSpaces,
    [spaceId]: { ...currentSpace, tabs: updatedTabs }
  };
}

/**
 * PURE FUNCTION: Calculates new spaces state after cross-container movement.
 */
export function calculateMove(currentSpaces: SpacesStore, tabId: string, fromId: UUID, toId: UUID, newIndex: number): SpacesStore | null {
  const fromSpace = currentSpaces[fromId];
  const toSpace = currentSpaces[toId];
  if (!fromSpace || !toSpace) return null;

  const tabIndex = fromSpace.tabs.findIndex(t => t.id === tabId);
  // Idempotency: don't move if it's already there at the right index
  if (fromId === toId) {
    if (tabIndex === newIndex) return null;
  } else {
    // If it's already in the destination space at the target index
    if (toSpace.tabs[newIndex]?.id === tabId) return null;
  }

  const tab = fromSpace.tabs[tabIndex];
  if (!tab) return null;

  const newFromTabs = fromSpace.tabs.filter(t => t.id !== tabId);
  const newToTabs = [...toSpace.tabs];
  newToTabs.splice(Math.max(0, newIndex), 0, tab);

  return {
    ...currentSpaces,
    [fromId]: { ...fromSpace, tabs: newFromTabs },
    [toId]: { ...toSpace, tabs: newToTabs }
  };
}
