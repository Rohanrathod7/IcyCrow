import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLocalSettings = {} as Record<string, any>;

// Mock chrome API for SW
globalThis.chrome = {
  runtime: {
    onInstalled: { addListener: vi.fn() },
    onMessage: {
      addListener: vi.fn((cb) => {
        (globalThis as any)._mockOnMessageListener = cb;
      }),
    },
  },
  storage: {
    local: {
      get: vi.fn(async (keys: string | string[]) => {
        if (typeof keys === 'string') return { [keys]: mockLocalSettings[keys] };
        return mockLocalSettings;
      }),
      set: vi.fn(async (items: Record<string, any>) => {
        Object.assign(mockLocalSettings, items);
      }),
    },
    session: {
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => {}),
    },
  },
  commands: {
    onCommand: { addListener: vi.fn() }
  },
  alarms: {
    create: vi.fn(),
    onAlarm: { addListener: vi.fn() },
  },
} as any;

describe('Background Highlight Handlers', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    for (const key in mockLocalSettings) delete mockLocalSettings[key];
    
    // Import the worker to register the listener
    await import('../../src/background/index');
  });

  async function sendMessage(msg: any) {
    return new Promise((resolve) => {
      const sendResponse = vi.fn((res) => resolve(res));
      (globalThis as any)._mockOnMessageListener(msg, {}, sendResponse);
    });
  }

  const basePayload = {
    url: 'https://example.com',
    urlHash: 'hash123',
    text: 'test exact match',
    color: 'yellow',
    anchor: {
      type: 'TextQuoteSelector',
      exact: 'test exact match',
      prefix: 'pre',
      suffix: 'suf',
      xpathFallback: '/html/body/p',
      cssFallback: 'p',
      startOffset: 0,
      endOffset: 16
    },
    pageMeta: { title: 'Test Page', domFingerprint: 'fg123' },
    spaceId: null
  };

  it('HIGHLIGHT_CREATE saves a new highlight', async () => {
    const res: any = await sendMessage({
      type: 'HIGHLIGHT_CREATE',
      payload: basePayload
    });

    // Wait a tick for async handler
    await new Promise(r => setTimeout(r, 0));
    
    expect(res.ok).toBe(true);
    expect(res.data.id).toBeDefined();
    expect(res.data.createdAt).toBeDefined();
    
    const stored = mockLocalSettings['highlights:hash123'];
    expect(stored).toBeDefined();
    expect(stored.length).toBe(1);
    expect(stored[0].id).toBe(res.data.id);
    expect(stored[0].text).toBe('test exact match');
  });

  it('HIGHLIGHT_CREATE is idempotent (prevents duplicates)', async () => {
    // Send first
    const res1: any = await sendMessage({ type: 'HIGHLIGHT_CREATE', payload: basePayload });
    await new Promise(r => setTimeout(r, 0));
    
    // Send again
    const res2: any = await sendMessage({ type: 'HIGHLIGHT_CREATE', payload: basePayload });
    await new Promise(r => setTimeout(r, 0));

    // Should return existing ID
    expect(res2.ok).toBe(true);
    expect(res2.data.id).toBe(res1.data.id);
    
    // Storage should still only have 1
    const stored = mockLocalSettings['highlights:hash123'];
    expect(stored.length).toBe(1);
  });

  it('HIGHLIGHTS_FETCH returns existing highlights', async () => {
    // Pre-populate
    mockLocalSettings['highlights:hash123'] = [{
      id: 'mock-id-1',
      pageMeta: { domFingerprint: 'fg123' },
      text: 'mocked text'
    }];

    const res: any = await sendMessage({
      type: 'HIGHLIGHTS_FETCH',
      payload: { urlHash: 'hash123', currentDomFingerprint: 'fg123' }
    });
    await new Promise(r => setTimeout(r, 0));

    expect(res.ok).toBe(true);
    expect(res.data.highlights.length).toBe(1);
    expect(res.data.pageChanged).toBe(false);
  });

  it('HIGHLIGHTS_FETCH detects pageChanged when fingerprint shifts', async () => {
    mockLocalSettings['highlights:hash123'] = [{
      id: 'mock-id-1',
      pageMeta: { domFingerprint: 'fgOLD' }
    }];

    const res: any = await sendMessage({
      type: 'HIGHLIGHTS_FETCH',
      payload: { urlHash: 'hash123', currentDomFingerprint: 'fgNEW' }
    });
    await new Promise(r => setTimeout(r, 0));

    expect(res.ok).toBe(true);
    expect(res.data.pageChanged).toBe(true);
  });

  it('HIGHLIGHT_DELETE removes highlight by ID', async () => {
    mockLocalSettings['highlights:hash123'] = [
      { id: '123e4567-e89b-12d3-a456-426614174001', text: 'one' },
      { id: '123e4567-e89b-12d3-a456-426614174002', text: 'two' }
    ];

    const res: any = await sendMessage({
      type: 'HIGHLIGHT_DELETE',
      payload: { urlHash: 'hash123', highlightId: '123e4567-e89b-12d3-a456-426614174001' }
    });
    await new Promise(r => setTimeout(r, 0));

    expect(res.ok).toBe(true);
    expect(res.data.deleted).toBe(true);
    
    const stored = mockLocalSettings['highlights:hash123'];
    expect(stored.length).toBe(1);
    expect(stored[0].id).toBe('123e4567-e89b-12d3-a456-426614174002');
  });

  it('HIGHLIGHT_UPDATE patches color and note', async () => {
    mockLocalSettings['highlights:hash123'] = [
      { id: '123e4567-e89b-12d3-a456-426614174001', color: 'yellow', note: null }
    ];

    const res: any = await sendMessage({
      type: 'HIGHLIGHT_UPDATE',
      payload: { 
        urlHash: 'hash123', 
        highlightId: '123e4567-e89b-12d3-a456-426614174001', 
        updates: { color: 'blue', note: 'test note' } 
      }
    });
    await new Promise(r => setTimeout(r, 0));

    expect(res.ok).toBe(true);
    expect(res.data.updated).toBe(true);
    
    const stored = mockLocalSettings['highlights:hash123'];
    expect(stored[0].color).toBe('blue');
    expect(stored[0].note).toBe('test note');
  });
});
