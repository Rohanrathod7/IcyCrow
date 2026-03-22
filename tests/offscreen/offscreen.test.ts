import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Offscreen Host (Hardened)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal('chrome', {
      runtime: {
        onMessage: { addListener: vi.fn() },
        getURL: vi.fn((p) => `chrome-extension://id/${p}`)
      }
    });
  });

  it('registers onMessage listener on load', async () => {
    await import('../../src/offscreen/offscreen');
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });

  it('loads model from IDB cache if available', async () => {
    const getCachedModelMock = vi.fn().mockResolvedValue({
      modelName: 'all-MiniLM-L6-v2',
      modelData: new ArrayBuffer(5),
      version: 1,
      cachedAt: '2026-03-22T00:00:00Z'
    });
    
    vi.doMock('../../src/lib/idb-store', () => ({
      getCachedModel: getCachedModelMock,
      cacheModel: vi.fn()
    }));

    vi.stubGlobal('fetch', vi.fn());

    await import('../../src/offscreen/offscreen');
    const listener = (chrome.runtime.onMessage.addListener as any).mock.calls[0][0];
    
    await new Promise(resolve => {
      listener({ type: 'EMBED_TEXT', payload: { text: 'test' } }, {}, resolve);
    });

    expect(getCachedModelMock).toHaveBeenCalledWith('all-MiniLM-L6-v2');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('fetches and caches model on IDB cache miss', async () => {
    const cacheModelSpy = vi.fn();
    vi.doMock('../../src/lib/idb-store', () => ({
      getCachedModel: vi.fn().mockResolvedValue(null),
      cacheModel: cacheModelSpy
    }));

    const fetchSpy = vi.fn().mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(10))
    });
    vi.stubGlobal('fetch', fetchSpy);

    await import('../../src/offscreen/offscreen');
    const listener = (chrome.runtime.onMessage.addListener as any).mock.calls[0][0];
    
    await new Promise(resolve => {
      listener({ type: 'EMBED_TEXT', payload: { text: 'test' } }, {}, resolve);
    });

    expect(fetchSpy).toHaveBeenCalled();
    expect(cacheModelSpy).toHaveBeenCalled();
  });
});
