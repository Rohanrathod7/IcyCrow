import { describe, it, expect, vi, afterEach } from 'vitest';
import { getActiveWorkspaces, setActiveWorkspaces, updateActiveWorkspace } from './storage';
import { UUID } from './types';

// Mock chrome.storage.local
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn()
    }
  },
  runtime: {
    lastError: null
  }
} as any;

describe('Storage Helpers: ActiveWorkspaces', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('getActiveWorkspaces should return empty object if undefined', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValue({} as any);
    const res = await getActiveWorkspaces();
    expect(res).toEqual({});
    expect(chrome.storage.local.get).toHaveBeenCalledWith('activeWorkspaces');
  });

  it('setActiveWorkspaces should update storage', async () => {
    const data = { 1: 'space-uuid' as UUID };
    await setActiveWorkspaces(data);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ activeWorkspaces: data });
  });

  it('updateActiveWorkspace should add a mapping', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValue({ activeWorkspaces: {} } as any);
    await updateActiveWorkspace(123, 'new-space-uuid' as UUID);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      activeWorkspaces: { 123: 'new-space-uuid' }
    });
  });

  it('updateActiveWorkspace should remove a mapping if spaceId is null', async () => {
    vi.mocked(chrome.storage.local.get).mockResolvedValue({ 
      activeWorkspaces: { 456: 'some-uuid' as UUID } 
    } as any);
    await updateActiveWorkspace(456, null);
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      activeWorkspaces: {}
    });
  });
});
