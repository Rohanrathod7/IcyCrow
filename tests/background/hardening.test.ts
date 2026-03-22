import { describe, it, expect, vi, beforeEach } from 'vitest';

// @vitest-environment jsdom

vi.hoisted(() => {
  globalThis.chrome = {
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn()
      },
      session: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue({})
      }
    },
    runtime: {
      sendMessage: vi.fn(),
      onMessage: { addListener: vi.fn() },
      onInstalled: { addListener: vi.fn() },
      lastError: null
    },
    commands: {
      onCommand: { addListener: vi.fn() }
    },
    alarms: {
      onAlarm: { addListener: vi.fn() },
      create: vi.fn()
    },
    tabs: {
      query: vi.fn(),
      sendMessage: vi.fn()
    }
  } as any;
  
  vi.stubGlobal('crypto', {
    randomUUID: () => Math.random().toString(36).substring(7),
    subtle: {
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
    }
  });
});

vi.mock('@lib/url-utils', () => ({
  sha256Hash: async () => 'mock-hash',
  canonicalUrl: () => 'https://example.com'
}));

import { handleMessage } from '../../src/background/index';

describe('Background Hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles concurrent HIGHLIGHT_CREATE without losing data', async () => {
    const mockStorage: Record<string, any> = {};
    
    // Simulate real storage behavior with slight delays to trigger races
    (chrome.storage.local.get as any).mockImplementation(async (key: string) => {
      await new Promise(r => setTimeout(r, Math.random() * 10));
      return { [key]: mockStorage[key] };
    });
    
    (chrome.storage.local.set as any).mockImplementation(async (data: any) => {
      await new Promise(r => setTimeout(r, Math.random() * 10));
      Object.assign(mockStorage, data);
    });

    const createMsg = (text: string) => ({
      type: 'HIGHLIGHT_CREATE',
      payload: {
        url: 'https://example.com',
        urlHash: 'mock-hash',
        text,
        color: 'yellow',
        anchor: { exact: text, prefix: '', suffix: '', type: 'TextQuoteSelector', xpathFallback: '', cssFallback: '', startOffset: 0, endOffset: text.length },
        pageMeta: { title: 'Test', domFingerprint: 'fg1' },
        spaceId: null
      }
    });

    const sendResponse = vi.fn();
    
    // Fire 5 concurrent requests
    await Promise.all([
      handleMessage(createMsg('h1') as any, sendResponse),
      handleMessage(createMsg('h2') as any, sendResponse),
      handleMessage(createMsg('h3') as any, sendResponse),
      handleMessage(createMsg('h4') as any, sendResponse),
      handleMessage(createMsg('h5') as any, sendResponse)
    ]);

    const saved = mockStorage['highlights:mock-hash'] || [];
    // Currently, this will likely fail because handleMessage reads and then writes without a transaction
    expect(saved.length).toBe(5);
  });

  it('returns STORAGE_FAILURE on quota exceeded', async () => {
    (chrome.storage.local.get as any).mockResolvedValue({});
    (chrome.storage.local.set as any).mockImplementation(() => {
      throw new Error('Quota exceeded');
    });

    const msg = {
      type: 'HIGHLIGHT_CREATE',
      payload: {
        url: 'https://example.com',
        urlHash: 'mock-hash',
        text: 'h1',
        color: 'yellow',
        anchor: { exact: 'h1', prefix: '', suffix: '', type: 'TextQuoteSelector', xpathFallback: '', cssFallback: '', startOffset: 0, endOffset: 2 },
        pageMeta: { title: 'Test', domFingerprint: 'fg1' },
        spaceId: null
      }
    };

    const sendResponse = vi.fn();
    await handleMessage(msg as any, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({
        code: 'STORAGE_FAILURE'
      })
    }));
  });
});
