import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Use vi.stubGlobal to ensure chrome is available immediately at import time
const chromeMock = {
  action: {
    onClicked: { addListener: vi.fn() },
  },
  sidePanel: {
    setOptions: vi.fn(),
    open: vi.fn(),
  },
  commands: {
    onCommand: { addListener: vi.fn() },
  },
  alarms: {
    onAlarm: { addListener: vi.fn() },
  },
  runtime: {
    id: 'test-extension-id',
    getURL: vi.fn(),
    onInstalled: { addListener: vi.fn() },
    onMessage: { addListener: vi.fn() },
  },
  tabs: {
    onUpdated: { addListener: vi.fn() },
    onRemoved: { addListener: vi.fn() },
    query: vi.fn(),
    sendMessage: vi.fn(),
  },
  storage: {
    session: { get: vi.fn(), set: vi.fn() },
    local: { get: vi.fn(), set: vi.fn() },
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
    await import('../../src/background/index');
    expect(chrome.action.onClicked.addListener).toHaveBeenCalled();
  });

  it('should call chrome.sidePanel.open when action is clicked', async () => {
    await import('../../src/background/index');
    const calls = (chrome.action.onClicked.addListener as any).mock.calls;
    if (calls.length === 0) throw new Error('No listener registered');
    
    const callback = calls[0][0];
    const mockTab = { id: 123, windowId: 456 };
    
    await callback(mockTab);

    expect(chrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 456 });
  });
});
