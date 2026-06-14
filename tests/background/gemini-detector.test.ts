import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findGeminiTab, watchGeminiTab } from '../../src/background/gemini-detector';

const sessionState = { sessionState: {} as any };
const tabListeners = {
  onUpdated: null as any,
  onRemoved: null as any
};

describe('Gemini Detector & Hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionState.sessionState = {};
    tabListeners.onUpdated = null;
    tabListeners.onRemoved = null;

    globalThis.chrome = {
      tabs: {
        query: vi.fn().mockResolvedValue([]),
        onUpdated: {
          addListener: vi.fn((cb) => {
            tabListeners.onUpdated = cb;
          })
        },
        onRemoved: {
          addListener: vi.fn((cb) => {
            tabListeners.onRemoved = cb;
          })
        }
      },
      storage: {
        session: {
          get: vi.fn().mockImplementation(async () => sessionState),
          set: vi.fn().mockImplementation(async (data) => {
            Object.assign(sessionState, data);
          })
        }
      },
      runtime: {
        getManifest: vi.fn(() => ({
          content_scripts: [{ js: ['content.js'] }]
        }))
      },
      scripting: {
        executeScript: vi.fn().mockResolvedValue([])
      }
    } as any;
  });

  it('returns tab ids if Gemini tabs are found', async () => {
    (chrome.tabs.query as any).mockResolvedValue([{ id: 456 }, { id: 789 }]);
    const result = await findGeminiTab('https://gemini.google.com/*');
    expect(result).toEqual([456, 789]);
  });

  it('prunes manualGeminiTabId if the manual tab is closed', async () => {
    // 1. Setup initial state: tab 456 is registered as manual tab
    sessionState.sessionState = {
      manualGeminiTabId: 456,
      geminiTabIds: [456],
      geminiTabId: 456
    };

    // 2. Start watching
    watchGeminiTab('https://gemini.google.com/*');

    // Query mock returns empty array (tab 456 is gone)
    (chrome.tabs.query as any).mockResolvedValue([]);

    // 3. Trigger tab removal listener
    expect(tabListeners.onRemoved).toBeTypeOf('function');
    await tabListeners.onRemoved(456);

    // 4. Expect session state to be updated and manualGeminiTabId cleared
    expect(chrome.storage.session.set).toHaveBeenCalled();
    expect(sessionState.sessionState.manualGeminiTabId).toBeNull();
    expect(sessionState.sessionState.geminiTabId).toBeNull();
  });

  it('prunes manualGeminiTabId if the manual tab is navigated away from Gemini', async () => {
    // 1. Setup initial state: tab 456 is registered as manual tab
    sessionState.sessionState = {
      manualGeminiTabId: 456,
      geminiTabIds: [456],
      geminiTabId: 456
    };

    // 2. Start watching
    watchGeminiTab('https://gemini.google.com/*');

    // Query mock returns empty array (tab 456 is now on google.com, so query for gemini returns nothing)
    (chrome.tabs.query as any).mockResolvedValue([]);

    // 3. Trigger tab updated listener (representing navigation away)
    expect(tabListeners.onUpdated).toBeTypeOf('function');
    await tabListeners.onUpdated(456, { url: 'https://google.com' }, { id: 456, url: 'https://google.com' });

    // Wait for the async updateId to complete
    await new Promise(r => setTimeout(r, 50));

    // 4. Expect session state to be updated and manualGeminiTabId cleared
    expect(sessionState.sessionState.manualGeminiTabId).toBeNull();
  });
});
