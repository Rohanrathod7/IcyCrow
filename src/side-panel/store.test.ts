import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  spaces, 
  removeTabFromSpace, 
  expandedSpaceId, 
  reorderTabsInSpace,
  moveTabBetweenSpaces,
  updateSpaceConfig,
  triggerManualSync,
  currentWindowOpenTabs,
  currentWindowId,
  hydrateStore,
  bulkSelectionMode,
  selectedStandaloneTabIds,
  toggleStandaloneTabSelection,
  selectAllStandaloneTabs,
  clearStandaloneTabSelection,
  bulkDeleteStandaloneTabs,
  bulkMoveStandaloneTabsToSpace,
  standaloneTabs
} from './store';
import type { Space, UUID } from '../lib/types';

// Mock chrome API
const tabListeners: Record<string, Function[]> = {};

const mockChrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
    session: {
      get: vi.fn(),
      set: vi.fn(),
    },
    onChanged: {
      addListener: vi.fn(),
    }
  },
  runtime: {
    sendMessage: vi.fn(),
  },
  windows: {
    getCurrent: vi.fn(),
  },
  tabs: {
    query: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    onCreated: {
      addListener: (cb: Function) => {
        tabListeners['onCreated'] = tabListeners['onCreated'] || [];
        tabListeners['onCreated'].push(cb);
      }
    },
    onUpdated: {
      addListener: (cb: Function) => {
        tabListeners['onUpdated'] = tabListeners['onUpdated'] || [];
        tabListeners['onUpdated'].push(cb);
      }
    },
    onRemoved: {
      addListener: (cb: Function) => {
        tabListeners['onRemoved'] = tabListeners['onRemoved'] || [];
        tabListeners['onRemoved'].push(cb);
      }
    },
    onAttached: {
      addListener: (cb: Function) => {
        tabListeners['onAttached'] = tabListeners['onAttached'] || [];
        tabListeners['onAttached'].push(cb);
      }
    },
    onDetached: {
      addListener: (cb: Function) => {
        tabListeners['onDetached'] = tabListeners['onDetached'] || [];
        tabListeners['onDetached'].push(cb);
      }
    }
  }
};

vi.stubGlobal('chrome', mockChrome);

// Mock messaging
vi.mock('../lib/messaging', () => ({
  sendToSW: vi.fn(),
}));

import { sendToSW } from '../lib/messaging';

describe('side-panel/store', () => {
  const spaceId = '123' as UUID;
  const initialSpace: Space = {
    id: spaceId,
    name: 'Old Name',
    color: 'blue',
    createdAt: '2026-03-29T00:00:00Z' as any,
    updatedAt: '2026-03-29T00:00:00Z' as any,
    tabs: [
      { id: 't1' as UUID, url: 'https://test.com', title: 'Test', favicon: null, scrollPosition: 0, chromeTabId: null },
      { id: 't2' as UUID, url: 'https://test2.com', title: 'Test 2', favicon: null, scrollPosition: 0, chromeTabId: null },
    ],
    createNativeGroup: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    spaces.value = { [spaceId]: initialSpace };
    expandedSpaceId.value = null;
  });

  describe('updateSpaceConfig', () => {
    it('should update the syncMode in signal and persist via SW message', async () => {
      vi.mocked(sendToSW).mockResolvedValue({ ok: true });
      
      await updateSpaceConfig(spaceId, { syncMode: 'auto' });
      
      expect(spaces.value[spaceId]?.syncMode).toBe('auto');
      expect(sendToSW).toHaveBeenCalledWith({
        type: 'SPACE_UPDATE',
        payload: { spaceId, updates: { syncMode: 'auto' } },
      });
    });
  });

  describe('triggerManualSync', () => {
    it('should send SPACE_SYNC_MANUAL_REQUEST to the SW', async () => {
      vi.mocked(sendToSW).mockResolvedValue({ ok: true });
      
      await triggerManualSync(spaceId);
      
      expect(sendToSW).toHaveBeenCalledWith({
        type: 'SPACE_SYNC_MANUAL_REQUEST',
        payload: { spaceId },
      });
    });
  });

  describe('removeTabFromSpace', () => {
    it('should filter out the tab and update state/storage', async () => {
      vi.mocked(sendToSW).mockResolvedValue({ ok: true, data: true });
      
      await removeTabFromSpace(spaceId, 't1' as UUID);
      
      expect(spaces.value[spaceId]?.tabs).toHaveLength(1);
      expect(spaces.value[spaceId]?.tabs[0].id).toBe('t2');
      
      // Verification of SW message dispatch
      expect(sendToSW).toHaveBeenCalledWith({
        type: 'SPACE_UPDATE',
        payload: {
          spaceId,
          updates: {
            tabs: [
              { id: 't2' as UUID, url: 'https://test2.com', title: 'Test 2', favicon: null, scrollPosition: 0, chromeTabId: null }
            ]
          }
        }
      });
    });
  });

  describe('reorderTabsInSpace', () => {
    it('should reorder tabs within a space and NOT persist when shouldPersist is false', async () => {
      await reorderTabsInSpace(spaceId, 't1', 't2', false);
      
      const tabs = spaces.value[spaceId]?.tabs;
      expect(tabs?.[0].id).toBe('t2');
      expect(tabs?.[1].id).toBe('t1');
      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('should persist when shouldPersist is true', async () => {
      await reorderTabsInSpace(spaceId, 't2', 't1', true);
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
    });
  });

  describe('moveTabBetweenSpaces', () => {
    const spaceBId = '456' as UUID;
    const spaceB: Space = {
      id: spaceBId,
      name: 'Space B',
      color: 'red',
      createdAt: '2026-03-29T00:00:00Z' as any,
      updatedAt: '2026-03-29T00:00:00Z' as any,
      tabs: [],
      createNativeGroup: false,
    };

    beforeEach(() => {
      spaces.value = { 
        [spaceId]: { ...initialSpace, tabs: [{ id: 't1' as UUID, url: 'a', title: 'a' } as any] },
        [spaceBId]: spaceB
      };
    });

    it('should move a tab between spaces and NOT persist when shouldPersist is false', async () => {
      await moveTabBetweenSpaces('t1', spaceId, spaceBId, 0, false);
      
      expect(spaces.value[spaceId]?.tabs).toHaveLength(0);
      expect(spaces.value[spaceBId]?.tabs).toHaveLength(1);
      expect(spaces.value[spaceBId]?.tabs[0].id).toBe('t1');
      expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
    });
  });

  describe('currentWindowOpenTabs', () => {
    beforeEach(() => {
      currentWindowOpenTabs.value = [];
      currentWindowId.value = null;
    });

    it('should populate currentWindowOpenTabs and currentWindowId on hydrateStore', async () => {
      mockChrome.storage.local.get.mockResolvedValue({});
      mockChrome.storage.session.get.mockResolvedValue({});
      mockChrome.windows.getCurrent.mockResolvedValue({ id: 42 });
      const mockTabs = [
        { id: 1, url: 'https://a.com', windowId: 42, title: 'A' },
        { id: 2, url: 'https://b.com', windowId: 42, title: 'B' }
      ];
      mockChrome.tabs.query.mockResolvedValue(mockTabs);

      await hydrateStore();

      expect(currentWindowId.value).toBe(42);
      expect(currentWindowOpenTabs.value).toEqual(mockTabs);
    });

    it('should handle tab events to update currentWindowOpenTabs', async () => {
      currentWindowId.value = 42;
      currentWindowOpenTabs.value = [
        { id: 1, url: 'https://a.com', windowId: 42, title: 'A' } as any
      ];

      // onCreated: add if in current window
      if (tabListeners['onCreated']) {
        const onCreated = tabListeners['onCreated'][0];
        onCreated({ id: 2, url: 'https://b.com', windowId: 42, title: 'B' });
        expect(currentWindowOpenTabs.value).toHaveLength(2);
        
        // should not add if not in current window
        onCreated({ id: 3, url: 'https://c.com', windowId: 43, title: 'C' });
        expect(currentWindowOpenTabs.value).toHaveLength(2);
      }

      // onUpdated: update tab info
      if (tabListeners['onUpdated']) {
        const onUpdated = tabListeners['onUpdated'][0];
        onUpdated(2, { status: 'complete' }, { id: 2, url: 'https://b.com/updated', windowId: 42, title: 'B Updated' });
        const tab2 = currentWindowOpenTabs.value.find(t => t.id === 2);
        expect(tab2?.title).toBe('B Updated');
        expect(tab2?.url).toBe('https://b.com/updated');
      }

      // onRemoved: remove tab if in current window
      if (tabListeners['onRemoved']) {
        const onRemoved = tabListeners['onRemoved'][0];
        onRemoved(2, { windowId: 42 });
        expect(currentWindowOpenTabs.value).toHaveLength(1);
        expect(currentWindowOpenTabs.value.map(t => t.id)).toEqual([1]);
      }

      // onAttached: add tab to current window
      if (tabListeners['onAttached']) {
        const onAttached = tabListeners['onAttached'][0];
        mockChrome.tabs.query.mockResolvedValue([
          { id: 1, url: 'https://a.com', windowId: 42, title: 'A' } as any,
          { id: 4, url: 'https://d.com', windowId: 42, title: 'D' } as any
        ]);
        // simulate attach
        await onAttached(4, { newWindowId: 42 });
        const ids = currentWindowOpenTabs.value.map(t => t.id);
        expect(ids).toContain(4);
      }

      // onDetached: remove tab from current window
      if (tabListeners['onDetached']) {
        const onDetached = tabListeners['onDetached'][0];
        onDetached(4, { oldWindowId: 42 });
        const ids = currentWindowOpenTabs.value.map(t => t.id);
        expect(ids).not.toContain(4);
      }
    });
  });

  describe('bulk selection actions', () => {
    beforeEach(() => {
      bulkSelectionMode.value = false;
      selectedStandaloneTabIds.value = {};
      standaloneTabs.value = [
        { id: 'tab1' as UUID, url: 'https://tab1.com', title: 'Tab 1' },
        { id: 'tab2' as UUID, url: 'https://tab2.com', title: 'Tab 2' },
        { id: 'tab3' as UUID, url: 'https://tab3.com', title: 'Tab 3' }
      ] as any;
    });

    it('should toggle selection of tab', () => {
      toggleStandaloneTabSelection('tab1' as UUID);
      expect(selectedStandaloneTabIds.value).toEqual({ tab1: true });

      toggleStandaloneTabSelection('tab1' as UUID);
      expect(selectedStandaloneTabIds.value).toEqual({ tab1: false });
    });

    it('should select all standalone tabs', () => {
      selectAllStandaloneTabs(['tab1' as UUID, 'tab2' as UUID]);
      expect(selectedStandaloneTabIds.value).toEqual({ tab1: true, tab2: true });
    });

    it('should clear selection', () => {
      selectedStandaloneTabIds.value = {
        ['tab1' as UUID]: true,
        ['tab2' as UUID]: true
      };
      clearStandaloneTabSelection();
      expect(selectedStandaloneTabIds.value).toEqual({});
    });

    it('should bulk delete selected standalone tabs', async () => {
      selectedStandaloneTabIds.value = {
        ['tab1' as UUID]: true,
        ['tab3' as UUID]: true
      };
      bulkSelectionMode.value = true;
      vi.mocked(sendToSW).mockResolvedValue({ ok: true, data: { deleted: true } });

      await bulkDeleteStandaloneTabs();

      expect(sendToSW).toHaveBeenCalledWith({
        type: 'TAB_DELETE_STANDALONE',
        payload: { tabId: 'tab1' }
      });
      expect(sendToSW).toHaveBeenCalledWith({
        type: 'TAB_DELETE_STANDALONE',
        payload: { tabId: 'tab3' }
      });

      expect(standaloneTabs.value).toHaveLength(1);
      expect(standaloneTabs.value[0].id).toBe('tab2');
      expect(bulkSelectionMode.value).toBe(false);
      expect(selectedStandaloneTabIds.value).toEqual({});
    });

    it('should bulk move selected standalone tabs to space', async () => {
      selectedStandaloneTabIds.value = {
        ['tab2' as UUID]: true
      };
      bulkSelectionMode.value = true;
      vi.mocked(sendToSW).mockResolvedValue({ ok: true, data: { moved: true } });
      
      mockChrome.storage.local.get.mockImplementation((key) => {
        if (key === 'standaloneTabs' || (Array.isArray(key) && key.includes('standaloneTabs')) || (typeof key === 'object' && key !== null && 'standaloneTabs' in key)) {
          return Promise.resolve({ standaloneTabs: [
            { id: 'tab1' as UUID, url: 'https://tab1.com', title: 'Tab 1' },
            { id: 'tab3' as UUID, url: 'https://tab3.com', title: 'Tab 3' }
          ] });
        }
        return Promise.resolve({});
      });

      await bulkMoveStandaloneTabsToSpace('space1' as UUID);

      expect(sendToSW).toHaveBeenCalledWith({
        type: 'TAB_MOVE_TO_SPACE',
        payload: { tabId: 'tab2', spaceId: 'space1' }
      });

      expect(standaloneTabs.value).toHaveLength(2);
      expect(standaloneTabs.value.map(t => t.id)).not.toContain('tab2');
      expect(bulkSelectionMode.value).toBe(false);
      expect(selectedStandaloneTabIds.value).toEqual({});
    });
  });
});
