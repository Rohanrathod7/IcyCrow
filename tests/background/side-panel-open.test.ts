import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Use vi.stubGlobal to ensure chrome is available immediately at import time
const chromeMock = {
  action: {
    onClicked: { addListener: vi.fn() },
  },
  sidePanel: {
    setOptions: vi.fn(),
    open: vi.fn(),
    setPanelBehavior: vi.fn().mockResolvedValue(undefined),
  },
  commands: {
    onCommand: { addListener: vi.fn() },
  },
  alarms: {
    onAlarm: { addListener: vi.fn() },
    create: vi.fn(),
  },
  runtime: {
    id: 'test-extension-id',
    getURL: vi.fn(),
    onInstalled: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
  },
  tabs: {
    onCreated: { addListener: vi.fn() },
    onRemoved: { addListener: vi.fn() },
    onMoved: { addListener: vi.fn() },
    onAttached: { addListener: vi.fn() },
    onDetached: { addListener: vi.fn() },
    onUpdated: { addListener: vi.fn() },
    query: vi.fn().mockResolvedValue([]),
    sendMessage: vi.fn().mockResolvedValue(undefined),
  },
  windows: {
    onRemoved: { addListener: vi.fn() },
    getAll: vi.fn().mockResolvedValue([]),
  },
  storage: {
    session: { get: vi.fn().mockResolvedValue({}), set: vi.fn().mockResolvedValue(undefined) },
    local: { get: vi.fn().mockResolvedValue({}), set: vi.fn().mockResolvedValue(undefined) },
  }
};

vi.stubGlobal('chrome', chromeMock);

describe('Service Worker Side Panel Handler', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should register a listener for chrome.action.onClicked', async () => {
    await import('../../src/background/service-worker');
    expect(chrome.action.onClicked.addListener).toHaveBeenCalled();
  });

  it('should call chrome.sidePanel.open when action is clicked', async () => {
    await import('../../src/background/service-worker');
    const calls = (chrome.action.onClicked.addListener as any).mock.calls;
    if (calls.length === 0) throw new Error('No listener registered');
    
    const callback = calls[0][0];
    const mockTab = { id: 123, windowId: 456 };
    
    await callback(mockTab);

    expect(chrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 456 });
  });
});
