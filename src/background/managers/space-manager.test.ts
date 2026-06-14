import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpaceManager } from './space-manager';
import { getSpaces, setSpaces } from '@lib/storage';
import { UUID } from '@lib/types';

// Mock storage
vi.mock('@lib/storage', () => ({
  getSpaces: vi.fn(),
  setSpaces: vi.fn(),
  getActiveWorkspaces: vi.fn(),
  setActiveWorkspaces: vi.fn(),
  updateActiveWorkspace: vi.fn(),
}));

describe('SpaceManager', () => {
  let manager: SpaceManager;

  beforeEach(() => {
    manager = new SpaceManager();
    global.chrome = {
      tabs: {
        query: vi.fn(),
        create: vi.fn(),
        group: vi.fn(),
        discard: vi.fn(),
        get: vi.fn().mockResolvedValue({ id: 100, url: 'https://site2.com' }),
      },
      tabGroups: {
        update: vi.fn(),
      },
      windows: {
        getCurrent: vi.fn(),
        getLastFocused: vi.fn(),
      },
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn(),
        }
      },
      runtime: { id: 'test-id' }
    } as any;

    // Mock fetch for favicon serialization
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => ({
        type: 'image/png',
        arrayBuffer: async () => new Uint8Array([102, 97, 107, 101]).buffer // "fake"
      })
    });

    // Mock btoa/atob for Node environment
    global.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('serializeTab', () => {
    it('should capture basic tab metadata', async () => {
      const mockTab = {
        id: 123,
        url: 'https://example.com',
        title: 'Example Page',
      } as chrome.tabs.Tab;

      const result = await manager.serializeTab(mockTab);

      expect(result.url).toBe(mockTab.url);
      expect(result.title).toBe(mockTab.title);
      expect(result.chromeTabId).toBe(mockTab.id);
    });

    it('should convert favIconUrl to Base64 string', async () => {
      const mockTab = {
        url: 'https://example.com',
        favIconUrl: 'https://example.com/favicon.ico',
        id: 123,
        title: 'Example'
      } as chrome.tabs.Tab;

      const result = await manager.serializeTab(mockTab);

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/favicon.ico', expect.any(Object));
      expect(result.favicon).toBe('data:image/png;base64,ZmFrZQ==');
    });

    it('should handle missing favIconUrl gracefully', async () => {
      const mockTab = { url: 'https://example.com' } as chrome.tabs.Tab;
      const result = await manager.serializeTab(mockTab);
      expect(result.favicon).toBeNull();
    });
  });

  describe('createSpace', () => {
    it('should save a new space to storage', async () => {
      (getSpaces as any).mockResolvedValue({});
      
      const space = await manager.createSpace('Project A', '#ff0000', false);
      
      expect(space.name).toBe('Project A');
      expect(space.color).toBe('#ff0000');
      expect(space.createNativeGroup).toBe(false);
      expect(setSpaces).toHaveBeenCalledWith(expect.objectContaining({
        [space.id]: expect.objectContaining({ name: 'Project A' })
      }));
    });

    it('should capture current tabs if requested', async () => {
      (getSpaces as any).mockResolvedValue({});
      (chrome.tabs.query as any).mockResolvedValue([
        { id: 1, url: 'https://tab1.com', title: 'Tab 1' },
        { id: 2, url: 'https://tab2.com', title: 'Tab 2' }
      ]);

      const space = await manager.createSpace('Working Space', '#00ff00', true);

      expect(space.tabs).toHaveLength(2);
      expect(space.tabs[0].url).toBe('https://tab1.com');
      expect(space.tabs[1].url).toBe('https://tab2.com');
    });

    it('should serialize provided raw tabs before saving', async () => {
      (getSpaces as any).mockResolvedValue({});
      const rawTabs = [
        { id: 10, url: 'https://site1.com', title: 'Site 1', favIconUrl: 'https://site1.com/icon.png' },
        { id: 20, url: 'https://site2.com', title: 'Site 2' }
      ];

      const space = await manager.createSpace('Custom Tabs', '#0000ff', false, false, rawTabs as any);

      expect(space.tabs).toHaveLength(2);
      // Verify they were serialized: they should have a UUID and favicon field (even if null)
      expect(space.tabs[0].id).toHaveLength(36);
      expect(space.tabs[1].id).toHaveLength(36);
      expect('favicon' in space.tabs[0]).toBe(true);
      expect('favicon' in space.tabs[1]).toBe(true);
    });
  });

  describe('restoreSpace', () => {
    it('should open tabs for a valid space (first active, rest background)', async () => {
      const mockSpace = {
        id: 's1' as UUID,
        name: 'Test Space',
        color: '#3a76f0',
        tabs: [{ url: 'https://site1.com' }, { url: 'https://site2.com' }]
      } as any;
      (getSpaces as any).mockResolvedValue({ s1: mockSpace });
      (chrome.tabs.create as any)
        .mockResolvedValueOnce({ id: 99 })
        .mockResolvedValueOnce({ id: 100 });
      
      (chrome.tabs.discard as any).mockResolvedValue({});
      vi.useFakeTimers();

      const restorePromise = manager.restoreSpace('s1' as UUID);
      
      // Advance timers to trigger the batch discard
      await vi.advanceTimersByTimeAsync(2000);
      const count = await restorePromise;

      expect(count).toBe(2);
      expect(chrome.tabs.create).toHaveBeenCalledTimes(2);
      
      // First tab active
      expect(chrome.tabs.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
        url: 'https://site1.com',
        active: true
      }));

      // Second tab background
      expect(chrome.tabs.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
        url: 'https://site2.com',
        active: false
      }));

      // Discard called for the background tab after 500ms
      expect(chrome.tabs.discard).toHaveBeenCalledWith(100);
      expect(chrome.tabs.discard).not.toHaveBeenCalledWith(99);
      
      vi.useRealTimers();
    });

    it('should optionally create a tab group', async () => {
      const mockSpace = {
        id: 's1' as UUID,
        name: 'Test Space',
        color: '#3a76f0',
        tabs: [{ url: 'https://site1.com' }]
      } as any;
      (getSpaces as any).mockResolvedValue({ s1: mockSpace });
      (chrome.tabs.create as any).mockResolvedValue({ id: 100 });
      (chrome.windows.getCurrent as any).mockResolvedValue({ id: 1 });
      (chrome.tabs.group as any).mockResolvedValue(10);

      await manager.restoreSpace('s1' as UUID, true);

      expect(chrome.tabs.group).toHaveBeenCalledWith(expect.objectContaining({
        tabIds: [100]
      }));
    });

    it('should set the group title and color to match the space', async () => {
      const mockSpace = {
        id: 's1' as UUID,
        name: 'Work Project',
        color: '#3a76f0', // Blue
        tabs: [{ url: 'https://site1.com' }]
      } as any;
      (getSpaces as any).mockResolvedValue({ s1: mockSpace });
      (chrome.tabs.create as any).mockResolvedValue({ id: 101 });
      (chrome.tabs.group as any).mockResolvedValue(42);

      await manager.restoreSpace('s1' as UUID, true);

      expect(chrome.tabGroups.update).toHaveBeenCalledWith(42, {
        title: 'Work Project',
        color: 'blue'
      });
    });

    it('should not crash if tab grouping fails', async () => {
      const mockSpace = {
        id: 's1' as UUID,
        tabs: [{ url: 'https://site1.com' }]
      } as any;
      (getSpaces as any).mockResolvedValue({ s1: mockSpace });
      (chrome.tabs.create as any).mockResolvedValue({ id: 103 });
      (chrome.tabs.group as any).mockRejectedValue(new Error('Group Limit'));

      const count = await manager.restoreSpace('s1' as UUID, true);

      expect(count).toBe(1);
      expect(chrome.tabs.create).toHaveBeenCalled();
    });

    it('should register the window for live sync and inject activeTabIds', async () => {
      const mockSpace = {
        id: 's1' as UUID,
        name: 'Sync Space',
        tabs: [{ id: 't1' as UUID, url: 'https://site1.com' }]
      } as any;
      
      (getSpaces as any).mockResolvedValue({ s1: mockSpace });
      (chrome.tabs.create as any).mockResolvedValue({ id: 999, windowId: 55 });
      (chrome.windows.getCurrent as any).mockResolvedValue({ id: 55 });
      
      await manager.restoreSpace('s1' as UUID);

      // Verify window registration
      const { updateActiveWorkspace } = await import('@lib/storage');
      expect(updateActiveWorkspace).toHaveBeenCalledWith(55, 's1');

      // Verify ID injection into persistence
      expect(setSpaces).toHaveBeenCalledWith(expect.objectContaining({
        s1: expect.objectContaining({
          tabs: [expect.objectContaining({
            id: 't1',
            activeTabId: 999 // The new transient ID
          })]
        })
      }));
    });
  });

  describe('deleteSpace', () => {
    it('should remove space from storage', async () => {
      (getSpaces as any).mockResolvedValue({ s1: { id: 's1' } });
      
      const success = await manager.deleteSpace('s1' as UUID);
      
      expect(success).toBe(true);
      expect(setSpaces).toHaveBeenCalledWith({});
    });
  });

  describe('updateSpace', () => {
    it('should update space metadata', async () => {
      const initialSpace = { id: 's1', name: 'Old', color: 'red' };
      (getSpaces as any).mockResolvedValue({ s1: initialSpace });
      
      const success = await manager.updateSpace('s1' as UUID, { name: 'New' });
      
      expect(success).toBe(true);
      expect(setSpaces).toHaveBeenCalledWith(expect.objectContaining({
        s1: expect.objectContaining({ name: 'New', color: 'red' })
      }));
    });
  });

  describe('addActiveTabToSpace', () => {
    it('should add the currently active tab to the space', async () => {
      const mockSpace = { id: 's1', name: 'Test', tabs: [] };
      (getSpaces as any).mockResolvedValue({ s1: mockSpace });
      (chrome.tabs.query as any).mockResolvedValue([{
        id: 500,
        url: 'https://new-tab.com',
        title: 'New Tab',
        favIconUrl: 'https://new-tab.com/icon.png'
      }]);

      const result = await manager.addActiveTabToSpace('s1');

      expect(result.success).toBe(true);
      expect(setSpaces).toHaveBeenCalledWith(expect.objectContaining({
        s1: expect.objectContaining({
          tabs: [expect.objectContaining({ url: 'https://new-tab.com' })]
        })
      }));
    });

    it('should prevent duplicate tabs based on URL', async () => {
      const mockSpace = { 
        id: 's1', 
        name: 'Test', 
        tabs: [{ url: 'https://exists.com', title: 'Existing' }] 
      };
      (getSpaces as any).mockResolvedValue({ s1: mockSpace });
      (chrome.tabs.query as any).mockResolvedValue([{
        url: 'https://exists.com',
        title: 'Duplicate Title'
      }]);

      const result = await manager.addActiveTabToSpace('s1');

      expect(result.success).toBe(true);
      expect(result.reason).toBe('duplicate');
      expect(setSpaces).not.toHaveBeenCalled();
    });

    it('should handle cases where no active tab is found', async () => {
      (chrome.tabs.query as any).mockResolvedValue([]);
      const result = await manager.addActiveTabToSpace('s1');
      expect(result.success).toBe(false);
      expect(result.reason).toBe('no_active_tab');
    });
  });
});
