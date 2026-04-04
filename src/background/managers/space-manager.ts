import type { Space, SpaceTab, UUID, ISOTimestamp } from '@lib/types';
import { getSpaces, setSpaces } from '@lib/storage';

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
      createNativeGroup: createTabGroup
    };

    let tabsToProcess: any[] = [];
    if (tabs && tabs.length > 0) {
      tabsToProcess = tabs;
    } else if (captureCurrentTabs) {
      tabsToProcess = await chrome.tabs.query({ currentWindow: true });
    }

    // [PARALLEL SERIALIZATION]: Process all tabs simultaneously to prevent bottlenecks
    const serializedTabs = await Promise.all(
      tabsToProcess.map(async (tab) => {
        const isInternalTab = tab.id && typeof tab.id === 'string' && tab.id.length >= 36 && 'favicon' in tab;
        if (isInternalTab) {
          return tab as SpaceTab;
        } else {
          try {
            return await this.serializeTab(tab as chrome.tabs.Tab);
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
          // Only track for discard if it's a background tab and a discardable URL
          if (i > 0 && sTab.url.startsWith('http')) {
            backgroundTabIds.push(tab.id);
          }
        }
      } catch (err) {
        console.warn(`[IcyCrow] Failed to open tab ${sTab.url}:`, err);
      }
    }

    // [SINGLE TICK DELAY]: Wait for Chrome to register tabs before suspension
    if (backgroundTabIds.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));

      // [BATCH DISCARD]: Suspend background tabs to save RAM/CPU
      for (const id of backgroundTabIds) {
        try {
          await chrome.tabs.discard(id);
        } catch (err) {
          console.warn(`[IcyCrow] Failed to discard tab ${id}:`, err);
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

  async updateSpace(spaceId: UUID, updates: Partial<Pick<Space, 'name' | 'color'>>): Promise<boolean> {
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
}

export const spaceManager = new SpaceManager();
