import { signal } from '@preact/signals';
import { arrayMove } from '@dnd-kit/sortable';
import { 
  getSpaces, 
  getStandaloneTabs, 
  getPreferredView,
  setPreferredView,
  getChatSessions,
  setChatSessions,
  getChatHistoryBySession,
  saveChatHistoryBySession,
  deleteChatSession
} from '../lib/storage';
import type { 
  Highlight, 
  SpacesStore, 
  ChatMessage, 
  UUID, 
  ChatEngine, 
  IcyCrowSettings, 
  ActiveWorkspaces, 
  Space,
  StandaloneTabsStore,
  SpaceTab,
  SHA256Hash,
  ChatSession,
  ISOTimestamp 
} from '../lib/types';
import { DEFAULT_SETTINGS } from '../lib/constants';
import { sendToSW } from '../lib/messaging';

export type ViewType = 'home' | 'search' | 'chat' | 'spaces' | 'settings' | 'highlights' | 'bookmarks' | 'study';
export type AppStatus = 'idle' | 'saving' | 'thinking' | 'success';

export interface SearchResult {
  text: string;
  score?: number;
  id: string;
}

export const activeView = signal<ViewType>('home');
export const dashboardViewMode = signal<'spaces' | 'tabs'>('spaces');
export const activeSpaceId = signal<UUID | null>(null);
export const allHighlights = signal<Highlight[]>([]);
export const spaces = signal<SpacesStore>({});
export const standaloneTabs = signal<StandaloneTabsStore>([]);
export const activeWorkspaces = signal<ActiveWorkspaces>({});
export const searchResults = signal<SearchResult[]>([]);
export const chatMessages = signal<ChatMessage[]>([]);
export const chatEngine = signal<ChatEngine>('gemini');
export const chatSessions = signal<ChatSession[]>([]);
export const activeChatSessionId = signal<UUID | null>(null);
export const selectedContextTabs = signal<Array<{ tabId: number; url: string; title: string }>>([]);
export const isLoading = signal(false);
export const error = signal<string | null>(null);
export const settings = signal<IcyCrowSettings>(DEFAULT_SETTINGS);
export const isLocked = signal(true);
export const expandedSpaceId = signal<UUID | null>(null);
export const currentAppStatus = signal<AppStatus>('idle');
export const commandPaletteOpen = signal(false);
export const activeDragTab = signal<SpaceTab | null>(null);
export const draftSpaces = signal<SpacesStore | null>(null);
export const manualBridgeTabId = signal<number | null>(null);
export const searchQuery = signal('');
export const currentWindowId = signal<number | null>(null);
export const currentWindowOpenTabs = signal<chrome.tabs.Tab[]>([]);
export const bulkSelectionMode = signal<boolean>(false);
export const selectedStandaloneTabIds = signal<Record<UUID, boolean>>({});

// Bookmark & Flashcard signals
export const allBookmarks = signal<any[]>([]);
export const allFlashcards = signal<any[]>([]);
export const dueFlashcards = signal<any[]>([]);

export const selectionModalState = signal({
  isOpen: false,
  mode: 'all' as 'all' | 'none' | 'single',
  targetTabs: [] as number[]
});

export const standaloneModalState = signal({ isOpen: false });


/**
 * Hydrates settings and session state.
 */
export async function hydrateStore() {
  try {
    const [local, session, preferredView, storedStandalone, sessionStateRes, currentWin] = await Promise.all([
      chrome.storage.local.get(['settings', 'activeWorkspaces']) as Promise<Record<string, any>>,
      chrome.storage.session.get('cryptoKeyUnlocked') as Promise<Record<string, any>>,
      getPreferredView(),
      getStandaloneTabs(),
      chrome.storage.session.get('sessionState') as Promise<Record<string, any>>,
      chrome.windows?.getCurrent ? chrome.windows.getCurrent().catch(() => null) : Promise.resolve(null)
    ]);
    if (local && local.settings) settings.value = local.settings as IcyCrowSettings;
    if (local && local.activeWorkspaces) activeWorkspaces.value = local.activeWorkspaces as ActiveWorkspaces;
    if (session.cryptoKeyUnlocked !== undefined) {
      isLocked.value = !session.cryptoKeyUnlocked;
    }
    if (sessionStateRes && sessionStateRes.sessionState) {
      const state = sessionStateRes.sessionState;
      if (state.manualGeminiTabId !== undefined) {
        manualBridgeTabId.value = state.manualGeminiTabId;
      }
    }
    if (currentWin && currentWin.id !== undefined) {
      currentWindowId.value = currentWin.id;
      const winTabs = await chrome.tabs.query({ windowId: currentWin.id });
      currentWindowOpenTabs.value = winTabs;
    }
    dashboardViewMode.value = preferredView;
    standaloneTabs.value = storedStandalone;
  } catch (err) {
    console.error('[IcyCrow] Hydration failed:', err);
  }
}

/**
 * Persists the preferred view mode.
 */
export const setViewMode = async (mode: 'spaces' | 'tabs') => {
  dashboardViewMode.value = mode;
  await setPreferredView(mode);
};

/**
 * Captures active tab as standalone.
 */
export const addActiveTabStandalone = async () => {
  currentAppStatus.value = 'saving';
  const result = await sendToSW<{ success: boolean; reason?: string }>({
    type: 'TAB_ADD_STANDALONE'
  } as any);

  if (result.ok && result.data?.success) {
    const updated = await getStandaloneTabs();
    standaloneTabs.value = updated;
    currentAppStatus.value = 'success';
    setTimeout(() => currentAppStatus.value = 'idle', 2000);
    return { success: true };
  }
  
  // Also reset on failure or duplicate
  currentAppStatus.value = 'idle';
  return { success: false, reason: (result.data as any)?.reason || 'error' };
};

/**
 * Captures multiple raw tabs as standalone entries in bulk.
 */
export async function addMultipleStandaloneTabs(tabs: chrome.tabs.Tab[]) {
  const result = await sendToSW<{ success: boolean; reason?: string }>({
    type: 'TAB_ADD_MULTIPLE_STANDALONE',
    payload: { tabs }
  } as any);

  if (result.ok && result.data?.success) {
    const updated = await getStandaloneTabs();
    standaloneTabs.value = updated;
    return { success: true };
  }
  return { success: false, reason: result.error?.code || (result.data as any)?.reason || 'error' }; 
}

/**
 * Deletes a standalone tab.
 */
export const deleteStandaloneTab = async (tabId: UUID) => {
  const result = await sendToSW<{ deleted: boolean }>({
    type: 'TAB_DELETE_STANDALONE',
    payload: { tabId }
  } as any);

  if (result.ok && result.data?.deleted) {
    standaloneTabs.value = standaloneTabs.value.filter(t => t.id !== tabId);
  }
};

/**
 * Moves a tab into a space.
 */
export const moveTabToSpace = async (tabId: UUID, spaceId: UUID) => {
  const result = await sendToSW<{ moved: boolean }>({
    type: 'TAB_MOVE_TO_SPACE',
    payload: { tabId, spaceId }
  } as any);

  if (result.ok && result.data?.moved) {
    // Refresh both collections
    const [updatedSpaces, updatedStandalone] = await Promise.all([
      getSpaces(),
      getStandaloneTabs()
    ]);
    spaces.value = updatedSpaces;
    standaloneTabs.value = updatedStandalone;
  }
};

/**
 * Toggles selection of a standalone tab.
 */
export const toggleStandaloneTabSelection = (tabId: UUID) => {
  const current = { ...selectedStandaloneTabIds.value };
  current[tabId] = !current[tabId];
  selectedStandaloneTabIds.value = current;
};

/**
 * Selects all standalone tabs.
 */
export const selectAllStandaloneTabs = (tabIds: UUID[]) => {
  const next: Record<UUID, boolean> = {};
  tabIds.forEach(id => {
    next[id] = true;
  });
  selectedStandaloneTabIds.value = next;
};

/**
 * Clears selection.
 */
export const clearStandaloneTabSelection = () => {
  selectedStandaloneTabIds.value = {};
};

/**
 * Deletes all selected standalone tabs.
 */
export const bulkDeleteStandaloneTabs = async () => {
  const idsToDelete = Object.keys(selectedStandaloneTabIds.value).filter(
    id => selectedStandaloneTabIds.value[id as UUID]
  ) as UUID[];
  
  if (idsToDelete.length === 0) return;

  // Run SW deletion requests in parallel
  await Promise.all(idsToDelete.map(id => deleteStandaloneTab(id)));
  
  clearStandaloneTabSelection();
  bulkSelectionMode.value = false;
};

/**
 * Moves all selected standalone tabs to a space.
 */
export const bulkMoveStandaloneTabsToSpace = async (spaceId: UUID) => {
  const idsToMove = Object.keys(selectedStandaloneTabIds.value).filter(
    id => selectedStandaloneTabIds.value[id as UUID]
  ) as UUID[];

  if (idsToMove.length === 0) return;

  // Run SW move requests in parallel
  await Promise.all(idsToMove.map(id => moveTabToSpace(id, spaceId)));

  clearStandaloneTabSelection();
  bulkSelectionMode.value = false;
};

/**
 * Adds the active tab to a specific space.
 */
export async function addActiveTabToSpace(spaceId: UUID) {
  try {
    const response = await sendToSW<{ success: boolean; reason?: string }>({
      type: 'SPACE_ADD_ACTIVE_TAB',
      payload: { spaceId }
    });

    if (response.ok && response.data) {
      return response.data;
    }
    return { success: false, reason: 'error' };
  } catch (err) {
    console.error('[IcyCrow] Add Tab Failed:', err);
    error.value = 'Failed to add active tab to space';
    return { success: false, reason: 'error' };
  }
}

/**
 * Creates a new space.
 */
export async function addSpace(name: string, color: string) {
  try {
    const response = await sendToSW<Space | null>({
      type: 'SPACE_CREATE',
      payload: { name, color, captureCurrentTabs: false, createTabGroup: false }
    });

    if (response.ok && response.data) {
      // Local state will sync via storage listener
      return response.data;
    }
    return null;
  } catch (err) {
    console.error('[IcyCrow] Create Space Failed:', err);
    error.value = 'Failed to create space';
    return null;
  }
}

/**
 * Generates a standard fallback name for a space
 */
export function generateFallbackSpaceName(): string {
  return `Session - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * Infers a space name from tab titles using a fast race against a timeout
 */
export async function inferSpaceName(titles: string[], timeout: number = 2000): Promise<string | null> {
  try {
    const aiPromise = new Promise<string>((resolve, reject) => {
      sendToSW<{ category?: string }>({
        type: 'AI_INFER_CATEGORY',
        payload: { titles }
      } as any).then(res => {
        if (res.ok && res.data?.category) {
          resolve(res.data.category);
        } else {
          reject(new Error('AI failed to infer'));
        }
      }).catch(reject);
    });

    const result = await Promise.race([
      aiPromise,
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
    ]);
    return result || null;
  } catch (err) {
    console.warn('[IcyCrow] inferSpaceName failed:', err);
    return null;
  }
}

/**
 * Instantly saves all current window tabs into a Space
 */
export async function saveCurrentSessionAsSpace() {
  currentAppStatus.value = 'saving';
  try {
    const tabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
      chrome.tabs.query({ currentWindow: true }, resolve);
    });
    
    // Convert to strictly defined structure with type scrubbing to fix serialization
    const scrubbedTabs = tabs.filter(t => t.id && t.url).map(t => ({
      id: t.id!,
      url: t.url!,
      title: t.title || 'Untitled',
      favIconUrl: t.favIconUrl || undefined
    }));
    
    const titles = scrubbedTabs.map(t => t.title);
    const suggestedName = await inferSpaceName(titles);
    
    const response = await sendToSW<Space | null>({
      type: 'SPACE_CREATE',
      payload: { 
        name: suggestedName || generateFallbackSpaceName(), 
        color: 'var(--accent-primary)', 
        captureCurrentTabs: false, // We pass them manually to avoid re-querying
        createTabGroup: false,
        tabs: scrubbedTabs
      }
    });

    if (response.ok && response.data) {
      currentAppStatus.value = 'success';
      setTimeout(() => currentAppStatus.value = 'idle', 2000);
      return response.data;
    }
  } catch (err) {
    console.error(err);
  } finally {
    if (currentAppStatus.value === 'saving') {
      currentAppStatus.value = 'idle';
    }
  }
}




/**
 * Syncs the chat sessions signal from storage.
 */
export async function syncChatSessions() {
  const sessions = await getChatSessions();
  // Filter sessions by the currently active space
  const filtered = sessions.filter(s => s.spaceId === activeSpaceId.value);
  // Sort by updatedAt descending
  filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  chatSessions.value = filtered;
}

/**
 * Loads the chat messages for a specific session.
 */
export async function loadChatSession(sessionId: UUID) {
  activeChatSessionId.value = sessionId;
  const history = await getChatHistoryBySession(sessionId);
  chatMessages.value = history;
}

/**
 * Clears the chat messages and active session state.
 */
export function createNewChatSession() {
  activeChatSessionId.value = null;
  chatMessages.value = [];
}

/**
 * Saves chat history to the active session, creating it if needed.
 */
export async function saveActiveSessionMessages(messages: ChatMessage[]) {
  let sessionId = activeChatSessionId.value;
  if (!sessionId) {
    sessionId = crypto.randomUUID() as UUID;
    activeChatSessionId.value = sessionId;

    const firstMessage = messages[0]?.content || 'New Chat';
    const title = firstMessage.slice(0, 30) + (firstMessage.length > 30 ? '...' : '');

    const newSession: ChatSession = {
      id: sessionId,
      title,
      createdAt: new Date().toISOString() as ISOTimestamp,
      updatedAt: new Date().toISOString() as ISOTimestamp,
      spaceId: activeSpaceId.value
    };

    const current = await getChatSessions();
    await setChatSessions([newSession, ...current]);
    await syncChatSessions();
  } else {
    const current = await getChatSessions();
    const updated = current.map(s => {
      if (s.id === sessionId) {
        return {
          ...s,
          updatedAt: new Date().toISOString() as ISOTimestamp
        };
      }
      return s;
    });
    await setChatSessions(updated);
    await syncChatSessions();
  }

  await saveChatHistoryBySession(sessionId, messages);
}

/**
 * Deletes a session and its history, resetting if active.
 */
export async function deleteChatSessionAndHistory(sessionId: UUID) {
  await deleteChatSession(sessionId);
  await syncChatSessions();
  if (activeChatSessionId.value === sessionId) {
    createNewChatSession();
  }
}

/**
 * Initializes chat state for the current active space.
 */
export async function initializeChatForSpace(spaceId: UUID | null) {
  activeSpaceId.value = spaceId;
  await syncChatSessions();
  if (chatSessions.value.length > 0) {
    await loadChatSession(chatSessions.value[0].id);
  } else {
    createNewChatSession();
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

// Global listener for storage changes
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.spaces && changes.spaces.newValue) {
        spaces.value = changes.spaces.newValue as SpacesStore;
      }
      
      if (changes.activeWorkspaces && changes.activeWorkspaces.newValue) {
        activeWorkspaces.value = changes.activeWorkspaces.newValue as ActiveWorkspaces;
      }
      
      const hasHighlightChange = Object.keys(changes).some(k => k.startsWith('highlights:'));
      if (hasHighlightChange) {
        syncAllHighlights();
      }
      
      if (changes.standaloneTabs && changes.standaloneTabs.newValue) {
        standaloneTabs.value = changes.standaloneTabs.newValue as StandaloneTabsStore;
      }

      if (changes.preferredView && changes.preferredView.newValue) {
        dashboardViewMode.value = changes.preferredView.newValue as 'spaces' | 'tabs';
      }
    } else if (area === 'session') {
      if (changes.cryptoKeyUnlocked) {
        isLocked.value = !changes.cryptoKeyUnlocked.newValue;
      }
      if (changes.sessionState && changes.sessionState.newValue) {
        const state = changes.sessionState.newValue as any;
        if (state.manualGeminiTabId !== undefined) {
          manualBridgeTabId.value = state.manualGeminiTabId;
        }
      }
    }
  });
}

// Global listeners for tab changes to maintain current window tabs
if (typeof chrome !== 'undefined' && chrome.tabs) {
  chrome.tabs.onCreated.addListener((tab) => {
    if (tab.windowId === currentWindowId.value) {
      currentWindowOpenTabs.value = [...currentWindowOpenTabs.value, tab];
    }
  });

  chrome.tabs.onUpdated.addListener((tabId, _changeInfo, tab) => {
    if (tab.windowId === currentWindowId.value) {
      currentWindowOpenTabs.value = currentWindowOpenTabs.value.map(t => t.id === tabId ? tab : t);
    }
  });

  chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    if (removeInfo.windowId === currentWindowId.value) {
      currentWindowOpenTabs.value = currentWindowOpenTabs.value.filter(t => t.id !== tabId);
    }
  });

  chrome.tabs.onAttached.addListener((_tabId, attachInfo) => {
    if (attachInfo.newWindowId === currentWindowId.value) {
      chrome.tabs.query({ windowId: currentWindowId.value }, (tabs) => {
        if (tabs) {
          currentWindowOpenTabs.value = tabs;
        }
      });
    }
  });

  chrome.tabs.onDetached.addListener((tabId, detachInfo) => {
    if (detachInfo.oldWindowId === currentWindowId.value) {
      currentWindowOpenTabs.value = currentWindowOpenTabs.value.filter(t => t.id !== tabId);
    }
  });
}

/**
 * Updates a space configuration.
 */
export async function updateSpaceConfig(spaceId: UUID, updates: Partial<Pick<Space, 'name' | 'color' | 'syncMode' | 'tabs'>>) {
  try {
    // Update local signal for immediate UI feedback (and to pass tests)
    const current = { ...spaces.value };
    if (current[spaceId]) {
      current[spaceId] = { ...current[spaceId], ...updates };
      spaces.value = current;
    }

    const response = await sendToSW<boolean>({
      type: 'SPACE_UPDATE',
      payload: { spaceId, updates }
    });
    return !!response.data;
  } catch (err) {
    console.error('[IcyCrow] Update Failed:', err);
    error.value = 'Failed to update space';
    return false;
  }
}

/**
 * Deletes a space.
 */
export async function deleteSpaceAndData(spaceId: UUID) {
  try {
    const response = await sendToSW<boolean>({
      type: 'SPACE_DELETE',
      payload: { spaceId }
    });
    if (activeSpaceId.value === spaceId) activeSpaceId.value = null;
    return !!response.data;
  } catch (err) {
    console.error('[IcyCrow] Delete Failed:', err);
    error.value = 'Failed to delete space';
    return false;
  }
}

/**
 * Triggers a manual sync for a space.
 */
export async function triggerManualSync(spaceId: UUID) {
  try {
    const response = await sendToSW<boolean>({
      type: 'SPACE_SYNC_MANUAL_REQUEST',
      payload: { spaceId }
    });
    return !!response.data;
  } catch (err) {
    console.error('[IcyCrow] Manual Sync Failed:', err);
    return false;
  }
}

/**
 * Removes a highlight.
 */
export async function removeHighlight(_spaceId: UUID, urlHash: string, highlightId: UUID) {
  try {
    const response = await sendToSW<boolean>({
      type: 'HIGHLIGHT_DELETE',
      payload: { urlHash: urlHash as SHA256Hash, highlightId }
    });
    return !!response.data;
  } catch (err) {
    console.error('[IcyCrow] Delete Highlight Failed:', err);
    return false;
  }
}

/**
 * Removes a tab from a space.
 */
export async function removeTabFromSpace(spaceId: UUID, tabId: UUID) {
  const space = spaces.value[spaceId];
  if (!space) return false;
  const updatedTabs = space.tabs.filter(t => t.id !== tabId);
  return updateSpaceConfig(spaceId, { tabs: updatedTabs });
}

/**
 * Saves a highlight.
 */
export async function saveHighlightToSpace(spaceId: UUID, text: string, url: string, title?: string, color?: string) {
  try {
    const response = await sendToSW<boolean>({
      type: 'HIGHLIGHT_CREATE',
      payload: { spaceId, text, url, title, color }
    } as any);
    if (response.ok && response.data) {
      currentAppStatus.value = 'success';
      setTimeout(() => currentAppStatus.value = 'idle', 2000);
      return true;
    }
    return false;
  } catch (err) {
    console.error('[IcyCrow] Save Failed:', err);
    error.value = 'Failed to save highlight';
    return false;
  }
}

/**
 * Pure transformation for reordering tabs.
 */
export function calculateReorder(spacesObj: SpacesStore, spaceId: UUID, activeId: string, overId: string): SpacesStore {
  const currentSpace = spacesObj[spaceId];
  if (!currentSpace) return spacesObj;

  const oldIndex = currentSpace.tabs.findIndex(t => t.id === activeId);
  const newIndex = currentSpace.tabs.findIndex(t => t.id === overId);

  if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
    const newTabs = arrayMove(currentSpace.tabs, oldIndex, newIndex);
    return {
      ...spacesObj,
      [spaceId]: {
        ...currentSpace,
        tabs: newTabs
      }
    };
  }
  
  return spacesObj;
}

/**
 * State-modifying reorder for legacy calls/tests.
 */
export function reorderTabsInSpace(spaceId: UUID, activeId: string, overId: string, shouldPersist: boolean = true): SpacesStore {
  const next = calculateReorder(spaces.value, spaceId, activeId, overId);
  spaces.value = next;
  if (shouldPersist) {
    chrome.storage.local.set({ spaces: next });
  }
  return next;
}

/**
 * Pure transformation for moving tabs between spaces.
 */
export function calculateMove(spacesObj: SpacesStore, activeId: string, activeSpaceId: UUID, overSpaceId: UUID, targetIndex: number): SpacesStore {
  const sourceSpace = spacesObj[activeSpaceId];
  const destSpace = spacesObj[overSpaceId];
  if (!sourceSpace || !destSpace) return spacesObj;

  const tabIndex = sourceSpace.tabs.findIndex(t => t.id === activeId);
  if (tabIndex === -1) return spacesObj;

  const tab = sourceSpace.tabs[tabIndex];
  
  // 1. Create new source space without the tab
  const newSourceTabs = [...sourceSpace.tabs];
  newSourceTabs.splice(tabIndex, 1);
  
  // 2. Create new destination space with the tab
  const newDestTabs = [...destSpace.tabs];
  const safeIndex = Math.max(0, Math.min(targetIndex, newDestTabs.length));
  newDestTabs.splice(safeIndex, 0, tab);

  // 3. Return surgical update
  return {
    ...spacesObj,
    [activeSpaceId]: {
      ...sourceSpace,
      tabs: newSourceTabs
    },
    [overSpaceId]: {
      ...destSpace,
      tabs: newDestTabs
    }
  };
}

/**
 * State-modifying move for legacy calls/tests.
 */
export function moveTabBetweenSpaces(tabId: string, sourceSpaceId: UUID, targetSpaceId: UUID, targetIndex: number, shouldPersist: boolean = true): SpacesStore {
  const next = calculateMove(spaces.value, tabId, sourceSpaceId, targetSpaceId, targetIndex);
  spaces.value = next;
  if (shouldPersist) {
    chrome.storage.local.set({ spaces: next });
  }
  return next;
}

// ===== Bookmark Actions =====

export async function loadBookmarks() {
  try {
    const res = await chrome.runtime.sendMessage({
      type: 'BOOKMARKS_FETCH',
      payload: {}
    });
    if (res && res.ok) {
      allBookmarks.value = res.data.bookmarks || [];
    }
  } catch (err) {
    console.error('[IcyCrow] loadBookmarks error:', err);
  }
}

export async function removeBookmark(bookmarkId: UUID) {
  try {
    await chrome.runtime.sendMessage({
      type: 'BOOKMARK_DELETE',
      payload: { bookmarkId }
    });
    allBookmarks.value = allBookmarks.value.filter(b => b.id !== bookmarkId);
  } catch (err) {
    console.error('[IcyCrow] removeBookmark error:', err);
  }
}

export async function navigateToBookmark(bookmark: any) {
  try {
    // Find or create a tab with the bookmark URL
    const tabs = await chrome.tabs.query({ url: bookmark.url });
    let tabId: number;

    if (tabs.length > 0 && tabs[0].id) {
      tabId = tabs[0].id;
      await chrome.tabs.update(tabId, { active: true });
      // Wait for tab to be ready
      await new Promise(r => setTimeout(r, 300));
    } else {
      const newTab = await chrome.tabs.create({ url: bookmark.url, active: true });
      tabId = newTab.id!;
      // Wait for page to load
      await new Promise(r => setTimeout(r, 1500));
    }

    // Send navigate message to content script
    chrome.tabs.sendMessage(tabId, {
      type: 'BOOKMARK_NAVIGATE',
      payload: {
        anchorData: bookmark.anchorData,
        scrollYPercent: bookmark.scrollYPercent,
      }
    });
  } catch (err) {
    console.error('[IcyCrow] navigateToBookmark error:', err);
  }
}

// ===== Flashcard Actions =====

export async function loadFlashcards() {
  try {
    const res = await chrome.runtime.sendMessage({
      type: 'FLASHCARDS_FETCH',
      payload: {}
    });
    if (res && res.ok) {
      allFlashcards.value = res.data.flashcards || [];
    }
  } catch (err) {
    console.error('[IcyCrow] loadFlashcards error:', err);
  }
}

export async function loadDueFlashcards() {
  try {
    const res = await chrome.runtime.sendMessage({
      type: 'FLASHCARDS_FETCH',
      payload: { dueOnly: true }
    });
    if (res && res.ok) {
      dueFlashcards.value = res.data.flashcards || [];
    }
  } catch (err) {
    console.error('[IcyCrow] loadDueFlashcards error:', err);
  }
}

export async function reviewFlashcard(flashcardId: UUID, quality: number) {
  try {
    const res = await chrome.runtime.sendMessage({
      type: 'FLASHCARD_REVIEW',
      payload: { flashcardId, quality }
    });
    if (res && res.ok) {
      // Remove from due list
      dueFlashcards.value = dueFlashcards.value.filter(c => c.id !== flashcardId);
      // Update in allFlashcards
      allFlashcards.value = allFlashcards.value.map(c =>
        c.id === flashcardId ? { ...c, ...res.data } : c
      );
    }
    return res;
  } catch (err) {
    console.error('[IcyCrow] reviewFlashcard error:', err);
    return null;
  }
}

export async function removeFlashcard(flashcardId: UUID) {
  try {
    await chrome.runtime.sendMessage({
      type: 'FLASHCARD_DELETE',
      payload: { flashcardId }
    });
    allFlashcards.value = allFlashcards.value.filter(c => c.id !== flashcardId);
    dueFlashcards.value = dueFlashcards.value.filter(c => c.id !== flashcardId);
  } catch (err) {
    console.error('[IcyCrow] removeFlashcard error:', err);
  }
}

export async function updateFlashcardContent(flashcardId: UUID, updates: { front?: string; back?: string }) {
  try {
    await chrome.runtime.sendMessage({
      type: 'FLASHCARD_UPDATE',
      payload: { flashcardId, updates }
    });
    allFlashcards.value = allFlashcards.value.map(c =>
      c.id === flashcardId ? { ...c, ...updates } : c
    );
  } catch (err) {
    console.error('[IcyCrow] updateFlashcardContent error:', err);
  }
}
