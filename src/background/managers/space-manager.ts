import type { Space, SpaceTab, UUID, ISOTimestamp } from '@lib/types';
import { getSpaces, setSpaces, updateActiveWorkspace, getActiveWorkspaces, getStandaloneTabs, setStandaloneTabs } from '@lib/storage';

export class SpaceManager {
  /**
   * Captures and serializes a tab, including favicon conversion to Base64
   */
  async serializeTab(tab: chrome.tabs.Tab): Promise<SpaceTab> {
    let faviconBase64: string | null = null;
    
    if (tab.favIconUrl && tab.favIconUrl.startsWith('http')) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      try {
        const response = await fetch(tab.favIconUrl, { signal: controller.signal });
        if (response.ok) {
          const blob = await response.blob();
          
          // [SIZE LIMIT]: Skip icons larger than 64KB to prevent storage/CPU bloat
          if (blob.size > 65536) {
            console.warn(`[IcyCrow] Skipping oversized favicon (${Math.round(blob.size/1024)}KB) for ${tab.url}`);
            return {
              id: crypto.randomUUID() as UUID,
              url: tab.url || '',
              title: tab.title || '',
              favicon: null,
              scrollPosition: 0,
              chromeTabId: tab.id || null
            };
          }

          const buffer = await blob.arrayBuffer();
          // [PERFORMANCE]: O(n) conversion using join('') is much faster than reduce for binary strings
          const binary = Array.from(new Uint8Array(buffer), (b) => String.fromCharCode(b)).join('');
          faviconBase64 = `data:${blob.type};base64,${btoa(binary)}`;
        }
      } catch (err) {
        console.warn(`[IcyCrow] Favicon capture timed out or failed for ${tab.url}`);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return {
      id: crypto.randomUUID() as UUID,
      url: tab.url || '',
      title: tab.title || '',
      favicon: faviconBase64,
      scrollPosition: 0,
      chromeTabId: tab.id || null
    };
  }

  /**
   * Creates a new space, optionally capturing current window tabs
   */
  async createSpace(name: string, color: string, captureCurrentTabs: boolean, createTabGroup = false, tabs?: any[]): Promise<Space> {
    const spaces = await getSpaces();
    const spaceId = crypto.randomUUID() as UUID;
    const now = new Date().toISOString() as ISOTimestamp;

    const newSpace: Space = {
      id: spaceId,
      name,
      color,
      createdAt: now,
      updatedAt: now,
      tabs: [],
      createNativeGroup: createTabGroup,
      syncMode: 'auto'
    };

    let tabsToProcess: any[] = [];
    let sourceWindowId: number | undefined;

    if (tabs && tabs.length > 0) {
      tabsToProcess = tabs;
    } else if (captureCurrentTabs) {
      const windowTabs = await chrome.tabs.query({ currentWindow: true });
      tabsToProcess = windowTabs;
      if (windowTabs.length > 0) sourceWindowId = windowTabs[0].windowId;
    }

    // [PARALLEL SERIALIZATION]: Process all tabs simultaneously to prevent bottlenecks
    const serializedTabs = await Promise.all(
      tabsToProcess.map(async (tab) => {
        const isInternalTab = tab.id && typeof tab.id === 'string' && tab.id.length >= 36 && 'favicon' in tab;
        if (isInternalTab) {
          return tab as SpaceTab;
        } else {
          try {
            const sTab = await this.serializeTab(tab as chrome.tabs.Tab);
            // [SYNC BRIDGE]: Assign activeTabId for captured tabs so SyncManager tracks them immediately
            if (tab.id) sTab.activeTabId = tab.id;
            return sTab;
          } catch (err) {
            console.warn('[IcyCrow] Failed to serialize tab:', (tab as any).url, err);
            return null;
          }
        }
      })
    );

    newSpace.tabs = serializedTabs.filter((t): t is SpaceTab => t !== null);

    spaces[spaceId] = newSpace;
    await setSpaces(spaces);

    // [WINDOW ADOPTION]: If we captured current tabs, map the window to this space immediately
    if (sourceWindowId) {
      await updateActiveWorkspace(sourceWindowId, spaceId);
      console.log(`[IcyCrow] Window ${sourceWindowId} adopted by new space ${spaceId}`);
    }

    return newSpace;
  }

  /**
   * Internal mapper for Space hex colors to Chrome Tab Group colors
   */
  private mapToTabGroupColor(hex: string): chrome.tabGroups.Color {
    if (!hex) return 'grey' as chrome.tabGroups.Color;
    const colorMap: Record<string, string> = {
      '#3a76f0': 'blue',
      '#2dd4bf': 'cyan',
      '#fbbf24': 'yellow',
      '#dc2626': 'red',
      '#9333ea': 'purple',
      '#4d7c0f': 'green',
      '#f472b6': 'pink',
      '#fb923c': 'orange',
      '#94a3b8': 'grey'
    };
    return (colorMap[hex.toLowerCase()] || 'grey') as chrome.tabGroups.Color;
  }

  async restoreSpace(spaceId: UUID, createNativeGroup = false): Promise<number> {
    const spaces = await getSpaces();
    const space = spaces[spaceId];
    if (!space) return 0;

    const allTabIds: number[] = [];
    const backgroundTabIds: number[] = [];
    let targetWindowId: number | undefined;

    // [BATCH CREATION]: Create all tabs immediately. First is active, rest background.
    for (let i = 0; i < space.tabs.length; i++) {
      const sTab = space.tabs[i];
      try {
        const tab = await chrome.tabs.create({
          url: sTab.url,
          active: i === 0
        });

        if (tab?.id) {
          allTabIds.push(tab.id);
          // [TRANSIENT MAPPING]: Bridge Chrome's runtime ID to our persisted JSON for live sync
          space.tabs[i].activeTabId = tab.id;
          
          if (!targetWindowId) targetWindowId = tab.windowId;

          // Only track for discard if it's a background tab and a discardable URL
          if (i > 0 && sTab.url.startsWith('http')) {
            backgroundTabIds.push(tab.id);
          }
        }
      } catch (err) {
        console.warn(`[IcyCrow] Failed to open tab ${sTab.url}:`, err);
      }
    }

    // [LIVE SYNC REGISTRY]: Map the window to this Space and persist transient IDs
    if (targetWindowId) {
      await updateActiveWorkspace(targetWindowId, spaceId);
      await setSpaces(spaces);
    }

    // [STABILITY DELAY]: Wait for Chrome to commit URLs before discarding.
    // Discarding too early (before navigation starts) results in about:blank.
    if (backgroundTabIds.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 1500));

      // [BATCH DISCARD]: Suspend background tabs to save RAM/CPU
      for (const id of backgroundTabIds) {
        try {
          // Double-check the tab still exists and has a valid URL before discarding
          const tab = await chrome.tabs.get(id);
          if (tab && tab.url && tab.url !== 'about:blank') {
            await chrome.tabs.discard(id);
          }
        } catch (err) {
          console.warn(`[IcyCrow] Skipping discard for tab ${id}:`, err);
        }
      }
    }

    if (createNativeGroup && allTabIds.length > 0) {
      try {
        const groupId = await chrome.tabs.group({
          tabIds: allTabIds as [number, ...number[]]
        });

        await chrome.tabGroups.update(groupId, {
          title: space.name,
          color: this.mapToTabGroupColor(space.color)
        });
      } catch (err) {
        console.error('[IcyCrow] Native Tab Grouping failed:', err);
      }
    }

    return allTabIds.length;
  }

  async deleteSpace(spaceId: UUID): Promise<boolean> {
    const spaces = await getSpaces();
    if (!spaces[spaceId]) return false;
    
    delete spaces[spaceId];
    await setSpaces(spaces);
    return true;
  }

  async updateSpace(spaceId: UUID, updates: Partial<Pick<Space, 'name' | 'color' | 'syncMode' | 'tabs'>>): Promise<boolean> {
    const spaces = await getSpaces();
    if (!spaces[spaceId]) return false;

    spaces[spaceId] = {
      ...spaces[spaceId],
      ...updates,
      updatedAt: new Date().toISOString() as ISOTimestamp
    };

    await setSpaces(spaces);
    return true;
  }

  /**
   * Manual snapshot: Reads active window tabs mapped to this space and overwrites it.
   */
  async syncManualSnapshot(spaceId: UUID): Promise<boolean> {
    const spaces = await getSpaces();
    const space = spaces[spaceId];
    if (!space) return false;

    const registry = await getActiveWorkspaces();
    // Find the window ID mapped to this space
    const windowIdStr = Object.keys(registry).find(key => registry[parseInt(key)] === spaceId);
    if (!windowIdStr) {
      console.warn(`[IcyCrow] Cannot manual sync space ${spaceId} because it is not active in any window.`);
      return false;
    }

    const windowId = parseInt(windowIdStr);
    const windowTabs = await chrome.tabs.query({ windowId });

    // Serialize all and inject bridging IDs
    const serializedTabs = await Promise.all(
      windowTabs.map(async (tab) => {
        try {
          const newTab = await this.serializeTab(tab);
          newTab.activeTabId = tab.id; // Bridge for later 'auto' toggles
          return newTab;
        } catch (err) {
          console.warn('[IcyCrow] Failed to serialize tab during manual sync:', tab.url, err);
          return null;
        }
      })
    );

  space.tabs = serializedTabs.filter((t): t is SpaceTab => t !== null);
    space.updatedAt = new Date().toISOString() as ISOTimestamp;
    
    await setSpaces(spaces);
    console.log(`[IcyCrow] Manual sync complete for space ${spaceId} (${space.tabs.length} tabs)`);
    return true;
  }

  /**
   * Captures the current active tab and adds it to the specified space, with deduplication.
   */
  async addActiveTabToSpace(spaceId: string): Promise<{ success: boolean; reason?: 'duplicate' | 'no_active_tab' | 'not_found' | 'restricted' | 'storage_error' }> {
    console.log(`[IcyCrow] Stage 1: Quick Add initiated for space ${spaceId}`);
    
    const spaces = await getSpaces();
    const space = spaces[spaceId as UUID];
    if (!space) {
      console.error(`[IcyCrow] Error: Space ${spaceId} not found in storage.`);
      return { success: false, reason: 'not_found' };
    }

    console.log(`[IcyCrow] Stage 2: Finding active tab...`);
    
    // [STRATEGY A]: Standard query for normal active tab in last focused window
    let [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true, windowType: 'normal' });
    
    // [STRATEGY B]: Deeper dive into windows if A fails (Side Panel focus stealing protection)
    if (!activeTab) {
      console.log(`[IcyCrow] Strategy A failed, trying Strategy B (Window Population)...`);
      const lastWindow = await chrome.windows.getLastFocused({ populate: true, windowTypes: ['normal'] });
      if (lastWindow && lastWindow.tabs) {
        const found = lastWindow.tabs.find(t => t.active);
        if (found) activeTab = found;
      }
    }

    // [STRATEGY C]: Final fallback to current window
    if (!activeTab) {
      console.log(`[IcyCrow] Strategy B failed, trying Strategy C (Current Window)...`);
      const currentTabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (currentTabs.length > 0) activeTab = currentTabs[0];
    }

    if (!activeTab || !activeTab.url) {
      console.error(`[IcyCrow] Error: No active tab discovered. Discovery failed.`);
      return { success: false, reason: 'no_active_tab' };
    }

    console.log(`[IcyCrow] Stage 3: Domain validation for ${activeTab.url}`);
    // [RESTRICTION GUARD]: Skip internal extension or browser pages
    const isRestricted = activeTab.url.startsWith('chrome') || 
                         activeTab.url.startsWith('edge') || 
                         activeTab.url.includes(chrome.runtime.id);
    
    if (isRestricted) {
      console.warn(`[IcyCrow] Restricted URL detected: ${activeTab.url}`);
      return { success: false, reason: 'restricted' };
    }

    // [DEDUPLICATION]
    const isDuplicate = space.tabs.some(t => t.url === activeTab.url);
    if (isDuplicate) {
      console.log(`[IcyCrow] Stage 4: Duplicate found (Frictionless Success).`);
      return { success: true, reason: 'duplicate' };
    }

    console.log(`[IcyCrow] Stage 5: Serializing and persisting...`);
    try {
      // Re-assert for TS guard (already validated in Stage 2)
      if (!activeTab) throw new Error('Unreachable: Active tab lost');
      
      const serialized = await this.serializeTab(activeTab);
      if (activeTab.id) serialized.activeTabId = activeTab.id;

      space.tabs.push(serialized);
      space.updatedAt = new Date().toISOString() as ISOTimestamp;

      await setSpaces(spaces);
      
      // Verify persistence
      const verify = await getSpaces();
      if (verify[spaceId as UUID]?.tabs.length === space.tabs.length) {
        console.log(`[IcyCrow] Success: Tab added to ${space.name} and verified in storage.`);
        return { success: true };
      } else {
        throw new Error('Persistence mismatch');
      }
    } catch (err) {
      console.error(`[IcyCrow] Storage Error:`, err);
      return { success: false, reason: 'storage_error' };
    }
  }

  /**
   * Captures the active tab as a standalone entry.
   */
  async addActiveTabStandalone(): Promise<{ success: boolean; reason?: 'duplicate' | 'no_active_tab' | 'storage_error' | 'restricted' }> {
    console.log(`[IcyCrow] Standalone Quick Add initiated`);
    
    // Discovery Logic (Tiered)
    let activeTab: chrome.tabs.Tab | undefined = (await chrome.tabs.query({ active: true, lastFocusedWindow: true, windowType: 'normal' }))[0];
    
    if (!activeTab) {
      const lastWindow = await chrome.windows.getLastFocused({ populate: true, windowTypes: ['normal'] });
      if (lastWindow && lastWindow.tabs) {
        activeTab = lastWindow.tabs.find(t => t.active);
      }
    }
    
    if (!activeTab) {
      const fallbacks = await chrome.tabs.query({ active: true, currentWindow: true });
      if (fallbacks.length > 0) activeTab = fallbacks[0];
    }

    if (!activeTab || !activeTab.url) return { success: false, reason: 'no_active_tab' };

    const isRestricted = activeTab.url.startsWith('chrome') || 
                         activeTab.url.startsWith('edge') || 
                         activeTab.url.includes(chrome.runtime.id);
    if (isRestricted) return { success: false, reason: 'restricted' };

    const tabs = await getStandaloneTabs();
    const isDuplicate = tabs.some(t => t.url === activeTab.url);
    if (isDuplicate) return { success: true, reason: 'duplicate' };

    try {
      if (!activeTab) throw new Error('Unreachable');
      const serialized = await this.serializeTab(activeTab);
      tabs.push(serialized);
      await setStandaloneTabs(tabs);
      return { success: true };
    } catch (err) {
      return { success: false, reason: 'storage_error' };
    }
  }

  /**
   * Captures multiple specified tabs as standalone entries.
   */
  async addMultipleTabsStandalone(tabsToAdd: chrome.tabs.Tab[]): Promise<{ success: boolean; addedCount: number; reason?: string }> {
    console.log(`[IcyCrow] Standalone Bulk Add initiated for ${tabsToAdd.length} tabs`);
    
    if (!tabsToAdd || tabsToAdd.length === 0) {
      return { success: false, addedCount: 0, reason: 'no_tabs' };
    }

    const currentTabs = await getStandaloneTabs();
    let addedCount = 0;

    const serializedPromises = tabsToAdd.map(async (tab) => {
      if (!tab || !tab.url) return null;
      
      const isRestricted = tab.url.startsWith('chrome') || 
                           tab.url.startsWith('edge') || 
                           tab.url.includes(chrome.runtime.id);
      if (isRestricted) return null;

      const isDuplicate = currentTabs.some(t => t.url === tab.url);
      if (isDuplicate) return null;

      return await this.serializeTab(tab);
    });

    const results = await Promise.all(serializedPromises);
    const validTabs = results.filter((t): t is SpaceTab => t !== null);

    if (validTabs.length > 0) {
      currentTabs.push(...validTabs);
      await setStandaloneTabs(currentTabs);
      addedCount = validTabs.length;
    }

    return { success: true, addedCount };
  }

  /**
   * Deletes a specific standalone tab.
   */
  async deleteStandaloneTab(tabId: string): Promise<boolean> {
    const tabs = await getStandaloneTabs();
    const filtered = tabs.filter(t => t.id !== tabId);
    if (filtered.length === tabs.length) return false;
    await setStandaloneTabs(filtered);
    return true;
  }

  /**
   * Moves a standalone tab into a space.
   */
  async moveTabToSpace(tabId: string, spaceId: string): Promise<boolean> {
    const tabs = await getStandaloneTabs();
    const tabToMove = tabs.find(t => t.id === tabId);
    if (!tabToMove) return false;

    const spaces = await getSpaces();
    const space = spaces[spaceId as UUID];
    if (!space) return false;

    // Check for duplicates in target space
    if (!space.tabs.some(t => t.url === tabToMove.url)) {
      space.tabs.push(tabToMove);
      space.updatedAt = new Date().toISOString() as ISOTimestamp;
      await setSpaces(spaces);
    }

    // Remove from standalone
    const filtered = tabs.filter(t => t.id !== tabId);
    await setStandaloneTabs(filtered);
    
    return true;
  }
}

export const spaceManager = new SpaceManager();
