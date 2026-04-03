import type { Space, SpaceTab, UUID, ISOTimestamp } from '@lib/types';
import { getSpaces, setSpaces } from '@lib/storage';

export class SpaceManager {
  /**
   * Captures and serializes a tab, including favicon conversion to Base64
   */
  async serializeTab(tab: chrome.tabs.Tab): Promise<SpaceTab> {
    let faviconBase64: string | null = null;
    
    if (tab.favIconUrl && tab.favIconUrl.startsWith('http')) {
      try {
        const response = await fetch(tab.favIconUrl);
        if (response.ok) {
          const blob = await response.blob();
          const reader = new FileReader();
          faviconBase64 = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        }
      } catch (err) {
        console.warn(`[IcyCrow] Failed to serialize favicon for ${tab.url}:`, err);
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
  async createSpace(name: string, color: string, captureCurrentTabs: boolean, createTabGroup = false, tabs?: SpaceTab[]): Promise<Space> {
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

    if (tabs && tabs.length > 0) {
      newSpace.tabs = tabs;
    } else if (captureCurrentTabs) {
      const chromeTabs = await chrome.tabs.query({ currentWindow: true });
      for (const tab of chromeTabs) {
        newSpace.tabs.push(await this.serializeTab(tab));
      }
    }

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

  async restoreSpace(spaceId: UUID, createTabGroup = false): Promise<number> {
    const spaces = await getSpaces();
    const space = spaces[spaceId];
    if (!space) return 0;

    const tabIds: number[] = [];
    
    // [LOOP]: Sequential await to ensure IDs are captured reliably as per user request
    for (const sTab of space.tabs) {
      try {
        const tab = await chrome.tabs.create({
          url: sTab.url,
          active: false
        });
        if (tab?.id) tabIds.push(tab.id);
      } catch (err) {
        console.warn(`[IcyCrow] Failed to open tab ${sTab.url}:`, err);
      }
    }

    if (createTabGroup && tabIds.length > 0) {
      try {
        const groupId = await chrome.tabs.group({
          tabIds: tabIds as [number, ...number[]]
        });

        await chrome.tabGroups.update(groupId, {
          title: space.name,
          color: this.mapToTabGroupColor(space.color)
        });
      } catch (err) {
        // [ERROR HANDLING]: Silent fail for grouping to prevent master crash
        console.error('[IcyCrow] Native Tab Grouping failed:', err);
      }
    }

    return tabIds.length;
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
