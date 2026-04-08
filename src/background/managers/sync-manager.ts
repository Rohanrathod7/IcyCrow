import { getSpaces, setSpaces, getActiveWorkspaces, updateActiveWorkspace } from '@lib/storage';
import { UUID, SpacesStore, SpaceTab } from '@lib/types';
import { spaceManager } from './space-manager';

export class SyncManager {
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isInitializing = false;

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;

    chrome.tabs.onCreated.addListener((tab) => {
      if (tab.windowId) this.reconcile(tab.windowId);
    });
    chrome.tabs.onRemoved.addListener((_tabId, removeInfo) => {
      // [PERSISTENCE GUARD]: If the entire window is closing, do NOT reconcile.
      // We want to preserve the last-known tab state for the next session.
      if (removeInfo.isWindowClosing) {
        console.log('[IcyCrow] Window closing detected. Preserving space state.');
        return;
      }
      if (removeInfo.windowId) this.reconcile(removeInfo.windowId);
    });
    chrome.tabs.onMoved.addListener((_tabId, moveInfo) => {
      if (moveInfo.windowId) this.reconcile(moveInfo.windowId);
    });
    chrome.tabs.onAttached.addListener((_tabId, attachInfo) => {
      if (attachInfo.newWindowId) this.reconcile(attachInfo.newWindowId);
    });
    chrome.tabs.onDetached.addListener((_tabId, detachInfo) => {
      if (detachInfo.oldWindowId) this.reconcile(detachInfo.oldWindowId);
    });
    
    chrome.tabs.onUpdated.addListener(this.handleTabUpdated.bind(this));
    chrome.windows.onRemoved.addListener(this.handleWindowRemoved.bind(this));
    
    console.log('[IcyCrow] SyncManager Mirror listeners registered.');
  }

  async init() {
    if (this.isInitializing) return;
    this.isInitializing = true;
    await this.cleanupZombies();
    this.isInitializing = false;
  }

  private async cleanupZombies() {
    try {
      const registry = await getActiveWorkspaces();
      const windows = await chrome.windows.getAll();
      const windowIds = new Set(windows.map(w => w.id));

      for (const [winIdStr] of Object.entries(registry)) {
        const winId = parseInt(winIdStr);
        if (!windowIds.has(winId)) {
          await this.handleWindowRemoved(winId);
        }
      }
    } catch (err) {
      console.error('[IcyCrow] Zombie cleanup failed:', err);
    }
  }

  private async getSpaceForWindow(windowId: number | undefined): Promise<UUID | undefined> {
    if (windowId === undefined) return undefined;
    const registry = await getActiveWorkspaces();
    return registry[windowId];
  }

  /**
   * [CORE] Mirror Reconciliation
   * Synchronizes the entire window state with the Space data.
   */
  private async reconcile(windowId: number) {
    const spaceId = await this.getSpaceForWindow(windowId);
    if (!spaceId) return;

    const spaces = await getSpaces();
    const space = spaces[spaceId];
    if (!space || space.syncMode !== 'auto') return;

    try {
      const liveTabs = await chrome.tabs.query({ windowId });
      const newTabsList: SpaceTab[] = [];
      const usedTabIds = new Set<number>();

      for (const tab of liveTabs) {
        if (tab.id === undefined) continue;
        const currentTabId = tab.id;
        
        // 1. Exact Match (activeTabId)
        let matchedTab = space.tabs.find(t => t.activeTabId === currentTabId);

        // 2. Fuzzy Match (URL + Index) - Re-bridge after restart
        if (!matchedTab) {
          matchedTab = space.tabs.find(t => 
            !t.activeTabId && 
            t.url === tab.url && 
            !usedTabIds.has(currentTabId)
          );
          if (matchedTab) {
            console.log(`[SyncManager] Re-bridged tab ${currentTabId} to UUID ${matchedTab.id} via URL match`);
          }
        }

        if (matchedTab) {
          // Update bridge and metadata
          matchedTab.activeTabId = currentTabId;
          matchedTab.url = tab.url || matchedTab.url;
          matchedTab.title = tab.title || matchedTab.title;
          newTabsList.push(matchedTab);
        } else {
          // 3. Adoption: New tab in window added to space
          const newTab = await spaceManager.serializeTab(tab);
          newTab.activeTabId = tab.id;
          newTabsList.push(newTab);
          console.log(`[SyncManager] Adopted new tab ${tab.id} into space ${spaceId}`);
        }
        
        usedTabIds.add(tab.id);
      }

      space.tabs = newTabsList;
      this.queueUpdate(spaces);
    } catch (err) {
      console.error('[IcyCrow] Reconciliation failed:', err);
    }
  }

  async handleTabUpdated(tabId: number, changeInfo: any, tab: chrome.tabs.Tab) {
    if (tab.incognito) return;
    const spaceId = await this.getSpaceForWindow(tab.windowId);
    if (!spaceId) return;

    const spaces = await getSpaces();
    const space = spaces[spaceId];
    if (!space || space.syncMode !== 'auto') return;

    let targetTab = space.tabs.find(t => t.activeTabId === tabId);

    // If meta change info is critical (URL change), trigger full reconcile to ensure order/adoption
    if (changeInfo.url) {
        await this.reconcile(tab.windowId);
        return;
    }

    if (targetTab && changeInfo.title) {
      targetTab.title = tab.title || targetTab.title;
      this.queueUpdate(spaces);
    }
  }

  async handleWindowRemoved(windowId: number) {
    const spaceId = await this.getSpaceForWindow(windowId);
    if (!spaceId) return;

    await updateActiveWorkspace(windowId, null);

    const spaces = await getSpaces();
    const space = spaces[spaceId];
    if (space) {
      space.tabs.forEach(t => {
        delete t.activeTabId;
      });
      await setSpaces(spaces);
    }
  }

  private queueUpdate(spaces: SpacesStore) {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    
    this.debounceTimer = setTimeout(async () => {
      try {
        await setSpaces(spaces);
        console.log(`[IcyCrow] Mirror Sync persisted.`);
      } catch (err) {
        console.error('[IcyCrow] Sync persistence failed:', err);
      }
    }, 800);
  }
}

export const syncManager = new SyncManager();
