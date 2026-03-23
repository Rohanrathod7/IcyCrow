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
  async createSpace(name: string, color: string, captureCurrentTabs: boolean): Promise<Space> {
    const spaces = await getSpaces();
    const spaceId = crypto.randomUUID() as UUID;
    const now = new Date().toISOString() as ISOTimestamp;

    const newSpace: Space = {
      id: spaceId,
      name,
      color,
      createdAt: now,
      updatedAt: now,
      tabs: []
    };

    if (captureCurrentTabs) {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      for (const tab of tabs) {
        newSpace.tabs.push(await this.serializeTab(tab));
      }
    }

    spaces[spaceId] = newSpace;
    await setSpaces(spaces);
    return newSpace;
  }

  async restoreSpace(spaceId: UUID, createTabGroup = false): Promise<number> {
    const spaces = await getSpaces();
    const space = spaces[spaceId];
    if (!space) return 0;

    const tabIds: number[] = [];
    for (const sTab of space.tabs) {
      const tab = await chrome.tabs.create({
        url: sTab.url,
        active: false,
        discarded: true // Performance optimization
      } as any);
      if (tab?.id) tabIds.push(tab.id);
    }

    if (createTabGroup && tabIds.length > 0) {
      await chrome.tabs.group({
        tabIds: tabIds as [number, ...number[]]
      });
      // Further customization (color, title) could be added here
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
