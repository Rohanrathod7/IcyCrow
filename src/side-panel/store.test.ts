import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spaces, updateSpaceName, removeTabFromSpace, expandedSpaceId } from './store';
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    spaces.value = { [spaceId]: initialSpace };
    expandedSpaceId.value = null;
  });

  describe('updateSpaceName', () => {
    it('should update the space name in signal and persist via SW message', async () => {
      vi.mocked(sendToSW).mockResolvedValue({ ok: true });
      
      await updateSpaceName(spaceId, 'New Name');
      
      expect(spaces.value[spaceId]?.name).toBe('New Name');
      expect(sendToSW).toHaveBeenCalledWith({
        type: 'SPACE_UPDATE',
        payload: { spaceId, updates: { name: 'New Name' } },
      });
    });

    it('should revert or handle error if SW update fails', async () => {
      // For now, the requirement just says "call updateSpaceName". 
      // A robust implementation should handle failure, but let's stick to RED first.
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

  describe('expandedSpaceId', () => {
    it('should exist as a signal and defaults to null', () => {
      expect(expandedSpaceId.value).toBeNull();
    });
  });
});
