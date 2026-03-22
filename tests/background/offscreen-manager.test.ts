import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OffscreenManager } from '../../src/background/offscreen-manager';

describe('OffscreenManager', () => {
  let manager: OffscreenManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = OffscreenManager.getInstance();
    
    // Mock chrome APIs
    globalThis.chrome = {
      offscreen: {
        hasDocument: vi.fn(),
        createDocument: vi.fn(),
        Reason: { LOCAL_STORAGE: 'LOCAL_STORAGE' }
      },
      runtime: {
        getURL: vi.fn((path) => `chrome-extension://id/${path}`),
        sendMessage: vi.fn()
      }
    } as any;
  });

  it('creates document if none exists', async () => {
    (chrome.offscreen.hasDocument as any).mockResolvedValue(false);
    (chrome.offscreen.createDocument as any).mockResolvedValue(undefined);

    await manager.ensureOffscreenDocument();

    expect(chrome.offscreen.createDocument).toHaveBeenCalledWith(expect.objectContaining({
      url: expect.stringContaining('offscreen.html')
    }));
  });

  it('does not create document if one already exists', async () => {
    (chrome.offscreen.hasDocument as any).mockResolvedValue(true);

    await manager.ensureOffscreenDocument();

    expect(chrome.offscreen.createDocument).not.toHaveBeenCalled();
  });

  it('handles concurrent calls gracefully (idempotency)', async () => {
    (chrome.offscreen.hasDocument as any).mockResolvedValue(false);
    let createCount = 0;
    (chrome.offscreen.createDocument as any).mockImplementation(async () => {
      createCount++;
      return new Promise(resolve => setTimeout(resolve, 10));
    });

    await Promise.all([
      manager.ensureOffscreenDocument(),
      manager.ensureOffscreenDocument()
    ]);

    expect(createCount).toBe(1);
  });
});
