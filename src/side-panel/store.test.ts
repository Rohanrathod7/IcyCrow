import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  spaces, 
  removeTabFromSpace, 
  expandedSpaceId, 
  reorderTabsInSpace,
  moveTabBetweenSpaces,
  updateSpaceConfig,
  triggerManualSync
} from './store';
import type { Space, UUID } from '../lib/types';

// Mock chrome API
const mockChrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
  },
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
      vi.mocked(sendToSW).mockResolvedValue({ ok: true });
      
      await removeTabFromSpace(spaceId, 't1' as UUID);
      
      expect(spaces.value[spaceId]?.tabs).toHaveLength(1);
      expect(spaces.value[spaceId]?.tabs[0].id).toBe('t2');
      
      // Verification of storage persist: current store uses chrome.storage.local for spaces sync
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
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
});
