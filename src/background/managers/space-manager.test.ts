import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpaceManager } from './space-manager';
import { getSpaces, setSpaces } from '@lib/storage';
import { UUID } from '@lib/types';

// Mock storage
vi.mock('@lib/storage', () => ({
  getSpaces: vi.fn(),
  setSpaces: vi.fn(),
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
      },
      tabGroups: {
        update: vi.fn(),
      },
      windows: {
        getCurrent: vi.fn(),
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
      ok: false,
      blob: async () => ({})
    });

    // Mock FileReader for favicon serialization (Synchronous for testing)
    global.FileReader = class {
      onload: any;
      result: any;
      readAsDataURL() {
        this.result = 'data:image/x-icon;base64,ZmFrZS1pbWFnZS1kYXRh';
        if (this.onload) this.onload();
      }
    } as any;
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
        favIconUrl: 'https://example.com/favicon.ico'
      } as chrome.tabs.Tab;

      // Mock image fetch and blob conversion
      const mockBlob = {
        arrayBuffer: async () => new TextEncoder().encode('fake-image-data').buffer,
        type: 'image/x-icon'
      };
      (global.fetch as any).mockResolvedValue({
        ok: true,
        blob: async () => mockBlob
      });

      const result = await manager.serializeTab(mockTab);

      // In the stub, this defaults to null, which will make the test FAIL (RED)
      expect(result.favicon).toMatch(/^data:image\/x-icon;base64,/);
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
  });

  describe('restoreSpace', () => {
    it('should open tabs for a valid space', async () => {
      const mockSpace = {
        id: 's1' as UUID,
        name: 'Test Space',
        color: '#3a76f0',
        createNativeGroup: false,
        tabs: [{ url: 'https://site1.com' }, { url: 'https://site2.com' }]
      } as any;
      (getSpaces as any).mockResolvedValue({ s1: mockSpace });
      (chrome.tabs.create as any).mockResolvedValue({ id: 99 });

      const count = await manager.restoreSpace('s1' as UUID);

      expect(count).toBe(2);
      expect(chrome.tabs.create).toHaveBeenCalledTimes(2);
      expect(chrome.tabs.create).toHaveBeenCalledWith(expect.objectContaining({
        url: 'https://site1.com',
        discarded: true
      }));
    });

    it('should optionally create a tab group', async () => {
      const mockSpace = {
        id: 's1' as UUID,
        name: 'Test Space',
        color: '#3a76f0',
        createNativeGroup: true,
        tabs: [{ url: 'https://site1.com' }]
      } as any;
      (getSpaces as any).mockResolvedValue({ s1: mockSpace });
      (chrome.tabs.create as any).mockResolvedValue({ id: 100 });
      (chrome.windows.getCurrent as any).mockResolvedValue({ id: 1 });

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
      (chrome.tabs.group as any).mockResolvedValue(42); // Mock groupId

      await manager.restoreSpace('s1' as UUID, true);

      expect(chrome.tabGroups.update).toHaveBeenCalledWith(42, {
        title: 'Work Project',
        color: 'blue'
      });
    });

    it('should fallback to grey if space color is unknown', async () => {
      const mockSpace = {
        id: 's1' as UUID,
        name: 'Work Project',
        color: '#3a76f0', // Blue
        createNativeGroup: true,
        tabs: [{ url: 'https://site1.com' }]
      } as any;
      (getSpaces as any).mockResolvedValue({ s1: mockSpace });
      (chrome.tabs.create as any).mockResolvedValue({ id: 102 });
      (chrome.tabs.group as any).mockResolvedValue(43);

      await manager.restoreSpace('s1' as UUID, true);

      expect(chrome.tabGroups.update).toHaveBeenCalledWith(43, {
        title: 'Unknown Color',
        color: 'grey'
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

      // Restoration should still report success for the opened tabs
      expect(count).toBe(1);
      expect(chrome.tabs.create).toHaveBeenCalled();
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
});
