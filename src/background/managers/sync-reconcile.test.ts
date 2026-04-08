// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock chrome before imports
vi.hoisted(() => {
  (global as any).chrome = {
    tabs: {
      query: vi.fn(),
      onCreated: { addListener: vi.fn() },
      onUpdated: { addListener: vi.fn() },
      onRemoved: { addListener: vi.fn() },
      onMoved: { addListener: vi.fn() },
      onAttached: { addListener: vi.fn() },
      onDetached: { addListener: vi.fn() },
    },
    windows: {
      onRemoved: { addListener: vi.fn() },
      getAll: vi.fn().mockResolvedValue([]),
    },
    storage: {
      onChanged: { addListener: vi.fn() },
    },
  };
});

import { SyncManager } from './sync-manager';
import { getSpaces, setSpaces, getActiveWorkspaces } from '@lib/storage';
import { UUID } from '@lib/types';
import { spaceManager } from './space-manager';

vi.mock('@lib/storage', () => ({
  getSpaces: vi.fn(),
  setSpaces: vi.fn(),
  getActiveWorkspaces: vi.fn(),
  updateActiveWorkspace: vi.fn(),
}));

vi.mock('./space-manager', () => ({
  spaceManager: {
    serializeTab: vi.fn(),
  },
}));

describe('SyncManager - Mirror Reconciliation', () => {
  let syncManager: SyncManager;

  beforeEach(() => {
    vi.clearAllMocks();
    syncManager = new SyncManager();
  });

  it('CORRUPTION TEST: should add extra tabs at index 0 without overwriting existing tabs', async () => {
    vi.useFakeTimers();
    
    const spaceId = 's1' as UUID;
    const windowId = 1;

    // Current Space Data: Space only has [Tab A]
    const spaceData = {
      s1: {
        id: spaceId,
        syncMode: 'auto',
        tabs: [
          { id: 'uuid-a', activeTabId: 100, url: 'a.com', title: 'Tab A' }
        ]
      }
    };

    // Live Window State: Window has [Tab Extra, Tab A]
    // Tab Extra at index 0, Tab A at index 1
    const liveTabs = [
      { id: 200, index: 0, url: 'extra.com', title: 'Extra', windowId },
      { id: 100, index: 1, url: 'a.com', title: 'Tab A', windowId }
    ];

    (getActiveWorkspaces as any).mockResolvedValue({ [windowId]: spaceId });
    (getSpaces as any).mockResolvedValue(spaceData);
    (chrome.tabs.query as any).mockResolvedValue(liveTabs);
    
    // Mock serialization for the NEW tab
    (spaceManager.serializeTab as any).mockImplementation(async (tab: any) => ({
      id: 'uuid-extra',
      url: tab.url,
      title: tab.title,
      activeTabId: tab.id
    }));

    // Trigger reconciliation
    // Note: We'll add this method to SyncManager
    if ((syncManager as any).reconcile) {
        await (syncManager as any).reconcile(windowId);
    } else {
        throw new Error('reconcile method does not exist yet (RED PHASE)');
    }

    await vi.advanceTimersByTimeAsync(800);

    // Assert that setSpaces was called with both tabs in the correct order
    // And NO data from Tab A was lost or overwritten
    expect(setSpaces).toHaveBeenCalledWith(expect.objectContaining({
      s1: expect.objectContaining({
        tabs: [
          expect.objectContaining({ url: 'extra.com', title: 'Extra' }), // Index 0 is the extra tab
          expect.objectContaining({ id: 'uuid-a', url: 'a.com', title: 'Tab A' }) // Index 1 is still Tab A
        ]
      })
    }));
  });

  it('RESTART TEST: should re-bridge tabs using URL match after a reload (activeTabId is missing)', async () => {
    vi.useFakeTimers();
    
    const spaceId = 's1' as UUID;
    const windowId = 1;

    // Current Space Data: activeTabId is MISSING (simulating a reload)
    const spaceData = {
      s1: {
        id: spaceId,
        syncMode: 'auto',
        tabs: [
          { id: 'uuid-a', activeTabId: undefined, url: 'a.com', title: 'Tab A' }
        ]
      }
    };

    // Live Window State: Tab A is there with a new ID
    const liveTabs = [
      { id: 300, index: 0, url: 'a.com', title: 'Tab A', windowId }
    ];

    (getActiveWorkspaces as any).mockResolvedValue({ [windowId]: spaceId });
    (getSpaces as any).mockResolvedValue(spaceData);
    (chrome.tabs.query as any).mockResolvedValue(liveTabs);
    
    await (syncManager as any).reconcile(windowId);

    await vi.advanceTimersByTimeAsync(800);

    // Assert that the existing UUID was preserved and the new activeTabId was bridged
    expect(setSpaces).toHaveBeenCalledWith(expect.objectContaining({
      s1: expect.objectContaining({
        tabs: [
          expect.objectContaining({ 
            id: 'uuid-a', 
            activeTabId: 300, 
            url: 'a.com' 
          })
        ]
      })
    }));
  });
});
