import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.hoisted(() => {
  (global as any).chrome = {
    tabs: {
      onCreated: { addListener: vi.fn() },
      onUpdated: { addListener: vi.fn() },
      onRemoved: { addListener: vi.fn() },
      onAttached: { addListener: vi.fn() },
      onDetached: { addListener: vi.fn() },
    },
    windows: {
      onRemoved: { addListener: vi.fn() },
      getAll: vi.fn().mockResolvedValue([{ id: 1 }])
    },
    storage: {
      onChanged: { addListener: vi.fn() }
    }
  };
});

import { SyncManager } from './sync-manager';
import { getSpaces, setSpaces, getActiveWorkspaces } from '@lib/storage';
import { UUID } from '@lib/types';

vi.mock('@lib/storage', () => ({
  getSpaces: vi.fn(),
  setSpaces: vi.fn(),
  getActiveWorkspaces: vi.fn(),
  updateActiveWorkspace: vi.fn(),
}));

describe('SyncManager', () => {
  let syncManager: SyncManager;

  beforeEach(() => {
    global.chrome = {
      tabs: {
        onCreated: { addListener: vi.fn() },
        onUpdated: { addListener: vi.fn() },
        onRemoved: { addListener: vi.fn() },
        onAttached: { addListener: vi.fn() },
        onDetached: { addListener: vi.fn() },
      },
      windows: {
        onRemoved: { addListener: vi.fn() },
        getAll: vi.fn().mockResolvedValue([{ id: 1 }])
      },
      storage: {
        onChanged: { addListener: vi.fn() }
      }
    } as any;
    syncManager = new SyncManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('should update tab metadata in the correct space onUpdated', async () => {
    vi.useFakeTimers();
    (getActiveWorkspaces as any).mockResolvedValue({ 1: 's1' as UUID });
    (getSpaces as any).mockResolvedValue({
      s1: {
        id: 's1',
        syncMode: 'auto',
        tabs: [{ id: 't1', activeTabId: 123, url: 'old.com', title: 'Old' }]
      }
    });

    // Mock the listener call manually or trigger it if we had a helper
    // For TDD, let's assume we have a handleTabUpdated method
    await syncManager.handleTabUpdated(123, { title: 'New' }, { url: 'new.com', title: 'New', windowId: 1 } as any);

    // Fast-forward debounce
    await vi.advanceTimersByTimeAsync(800);

    expect(setSpaces).toHaveBeenCalledWith(expect.objectContaining({
      s1: expect.objectContaining({
        tabs: [expect.objectContaining({
          activeTabId: 123,
          title: 'New',
          url: 'new.com'
        })]
      })
    }));
  });

  it('should ignore events from unregistered windows', async () => {
    (getActiveWorkspaces as any).mockResolvedValue({ 1: 's1' as UUID });
    (getSpaces as any).mockResolvedValue({ s1: { id: 's1', tabs: [] } });

    await syncManager.handleTabUpdated(999, { title: 'Ghost' }, { windowId: 99 } as any);
    
    expect(setSpaces).not.toHaveBeenCalled();
  });

  it('should ignore events if the space is in manual sync mode', async () => {
    vi.useFakeTimers();
    (getActiveWorkspaces as any).mockResolvedValue({ 1: 's1' as UUID });
    (getSpaces as any).mockResolvedValue({
      s1: {
        id: 's1',
        syncMode: 'manual', // Manual mode!
        tabs: [{ id: 't1', activeTabId: 123, url: 'old.com', title: 'Old' }]
      }
    });

    await syncManager.handleTabUpdated(123, { title: 'New' }, { url: 'new.com', title: 'New', windowId: 1 } as any);

    await vi.advanceTimersByTimeAsync(800);

    expect(setSpaces).not.toHaveBeenCalled();
  });

  it('should process events ONLY if the space syncMode is exactly auto', async () => {
    vi.useFakeTimers();
    (getActiveWorkspaces as any).mockResolvedValue({ 1: 's2' as UUID });
    (getSpaces as any).mockResolvedValue({
      s2: {
        id: 's2',
        syncMode: 'auto', // Auto mode!
        tabs: [{ id: 't2', activeTabId: 456, url: 'old.com', title: 'Old' }]
      }
    });

    await syncManager.handleTabUpdated(456, { title: 'New Auto' }, { url: 'new.com', title: 'New Auto', windowId: 1 } as any);

    await vi.advanceTimersByTimeAsync(800);

    expect(setSpaces).toHaveBeenCalled();
  });

  it('should ignore events if syncMode is undefined (legacy spaces default to manual)', async () => {
    vi.useFakeTimers();
    (getActiveWorkspaces as any).mockResolvedValue({ 1: 's3' as UUID });
    (getSpaces as any).mockResolvedValue({
      s3: {
        id: 's3',
        // NO syncMode defined
        tabs: [{ id: 't3', activeTabId: 789, url: 'old.com', title: 'Old' }]
      }
    });

    await syncManager.handleTabUpdated(789, { title: 'New' }, { url: 'new.com', title: 'New', windowId: 1 } as any);

    await vi.advanceTimersByTimeAsync(800);

    expect(setSpaces).not.toHaveBeenCalled();
  });

});
