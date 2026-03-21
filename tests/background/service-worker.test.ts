import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/lib/constants';

// We must declare chrome globally for the SW
const mockLocalSettings = { settings: undefined };
const mockSessionState = { sessionState: undefined };

const listeners = {
  onInstalled: [] as Function[],
  onMessage: [] as Function[],
};

// Define global chrome before any imports
globalThis.chrome = {
  runtime: {
    onInstalled: {
      addListener: vi.fn((cb) => {
        listeners.onInstalled.push(cb);
      }),
    },
    onMessage: {
      addListener: vi.fn((cb) => {
        listeners.onMessage.push(cb);
      }),
    },
  },
  storage: {
    local: {
      get: vi.fn().mockImplementation(async () => mockLocalSettings),
      set: vi.fn().mockResolvedValue(undefined),
    },
    session: {
      get: vi.fn().mockImplementation(async () => mockSessionState),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
  alarms: {
    create: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
} as any;

describe('Service Worker Boot Sequence', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    listeners.onInstalled = [];
    listeners.onMessage = [];
    mockLocalSettings.settings = undefined;
    mockSessionState.sessionState = undefined;
  });

  it('sets DEFAULT_SETTINGS on install when none exist', async () => {
    // Import the worker to register listeners
    await import('../../src/background/index');
    
    // Simulate the install event
    expect(listeners.onInstalled.length).toBeGreaterThan(0);
    const onInstalledCallback = listeners.onInstalled[0];
    
    await onInstalledCallback({ reason: 'install' });
    
    expect(chrome.storage.local.get).toHaveBeenCalledWith('settings');
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ settings: DEFAULT_SETTINGS });
  });

  it('increments swRestartCount and sets session defaults on boot()', async () => {
    const { boot } = await import('../../src/background/index');
    
    // Simulate initial state
    mockSessionState.sessionState = {
      swRestartCount: 5,
      cryptoKeyUnlocked: true,
      geminiTabId: 123,
      geminiBridgeHealthy: true,
      lastSelectorCheckAt: null,
      cryptoKeyLastUsedAt: null,
      swBootedAt: '2026-03-21T00:00:00.000Z'
    } as any;
    
    await boot();
    
    // It should read the count
    expect(chrome.storage.session.get).toHaveBeenCalledWith('sessionState');
    
    // It should write back incremented count with reset flags
    expect(chrome.storage.session.set).toHaveBeenCalledWith(expect.objectContaining({
      sessionState: expect.objectContaining({
        swRestartCount: 6,
        cryptoKeyUnlocked: false, // Must reset to false on boot
        geminiTabId: 123, // Preserved
        geminiBridgeHealthy: true
      })
    }));
  });
});

describe('Alarms & Keepalive', () => {
  it('creates a keepalive alarm on boot', async () => {
    const { boot } = await import('../../src/background/index');
    await boot();
    expect(chrome.alarms.create).toHaveBeenCalledWith('keepalive', { periodInMinutes: 0.4 });
  });
});
describe('Message Router', () => {
  it('returns valid stub response for HIGHLIGHTS_FETCH', async () => {
    // Re-import or ensure registered
    await import('../../src/background/index');
    expect(listeners.onMessage.length).toBeGreaterThan(0);
    const onMessageCallback = listeners.onMessage[0];

    const request = {
      type: 'HIGHLIGHTS_FETCH',
      payload: {
        urlHash: '123' as any,
        currentDomFingerprint: 'abc' as any
      }
    };
    
    const sendResponse = vi.fn();
    // In our mock, onMessage returns a boolean for async or nothing
    onMessageCallback(request, {}, sendResponse);
    
    // Give it a tick if it's async
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      data: { highlights: [], pageChanged: false }
    });
  });

  it('catches and returns VALIDATION_ERROR for malformed payloads', async () => {
    await import('../../src/background/index');
    const onMessageCallback = listeners.onMessage[0];
    const sendResponse = vi.fn();
    
    const request = {
      type: 'HIGHLIGHTS_FETCH',
      payload: { wrongKey: true }
    };
    
    onMessageCallback(request, {}, sendResponse);
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
      ok: false,
      error: expect.objectContaining({ code: 'VALIDATION_ERROR' })
    }));
  });
});
