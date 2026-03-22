import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Stub Globals at the top level to catch import side-effects
vi.stubGlobal('chrome', {
  runtime: { id: 'test-id', onMessage: { addListener: vi.fn() } },
  storage: {
    local: { get: vi.fn(), set: vi.fn() },
    session: { get: vi.fn(), set: vi.fn() }
  },
  commands: { onCommand: { addListener: vi.fn() } },
  alarms: { onAlarm: { addListener: vi.fn() }, create: vi.fn() }
});

vi.stubGlobal('crypto', {
  randomUUID: () => 'new-uuid'
});

describe('Service Worker — Export/Import Routing', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    
    // Mock dependencies
    vi.doMock('@bg/offscreen-manager', () => ({
      offscreenManager: { sendToOffscreen: vi.fn() }
    }));
    vi.doMock('@lib/idb-store', () => ({
      saveArticle: vi.fn(),
      saveEmbedding: vi.fn(),
      getAllEmbeddings: vi.fn(),
      saveBackupManifest: vi.fn()
    }));
    vi.doMock('@bg/crypto-manager', () => ({ cryptoManager: { checkAutoLock: vi.fn() } }));
    vi.doMock('@lib/storage', () => ({ getHighlights: vi.fn(), updateHighlights: vi.fn() }));
    vi.doMock('@lib/task-queue', () => ({ taskQueue: { process: vi.fn() } }));
    vi.doMock('@bg/gemini-detector', () => ({ watchGeminiTab: vi.fn() }));
    vi.doMock('@lib/zod-schemas', () => ({
      InboundMessageSchema: { safeParse: (data: any) => ({ success: true, data }) }
    }));
  });

  it('delegates EXPORT_WORKSPACE to offscreen', async () => {
    // Dynamically import targets
    const { handleMessage } = await import('../../src/background/index');
    const { offscreenManager } = await import('@bg/offscreen-manager');
    const { saveBackupManifest } = await import('@lib/idb-store');
    
    const sendResponse = vi.fn();
    const msg = { type: 'EXPORT_WORKSPACE', payload: { password: 'ValidPassword123!' } };
    
    vi.mocked(offscreenManager.sendToOffscreen).mockResolvedValue({
      ok: true,
      data: { buffer: new ArrayBuffer(500) }
    });

    await handleMessage(msg as any, sendResponse);

    expect(offscreenManager.sendToOffscreen).toHaveBeenCalled();
    expect(saveBackupManifest).toHaveBeenCalled();
    expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
  });
});
