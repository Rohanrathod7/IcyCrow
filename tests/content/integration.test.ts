// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Integration: Hotkeys & Manifest Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Stub chrome APIs
    (globalThis as any).chrome = {
      runtime: {
        onMessage: { addListener: vi.fn() },
        onInstalled: { addListener: vi.fn() }
      },
      commands: {
        onCommand: { addListener: vi.fn() }
      },
      alarms: {
        onAlarm: { addListener: vi.fn() },
        create: vi.fn()
      },
      storage: {
        session: { get: vi.fn().mockResolvedValue({}), set: vi.fn() },
        local: { get: vi.fn().mockResolvedValue({}), set: vi.fn() }
      }
    };
  });

  it('registers a message listener in the content script to handle background commands', async () => {
    // Import the content script entry point
    await import('../../src/content/index');
    
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });

  it('registers a command listener in the background script', async () => {
    // Import the background script entry point
    await import('../../src/background/index');
    
    expect(chrome.commands.onCommand.addListener).toHaveBeenCalled();
  });
});
