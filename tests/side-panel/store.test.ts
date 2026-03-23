import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chatMessages, chatEngine, loadChatHistory, activeSpaceId } from '../../src/side-panel/store';
import type { ChatMessage, UUID, ISOTimestamp } from '../../src/lib/types';

// Mock chrome APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
    onChanged: {
      addListener: vi.fn(),
    },
  },
  runtime: {
    id: 'test-extension-id',
  },
} as any;

describe('Store: Chat History Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatMessages.value = [];
    chatEngine.value = 'gemini';
    activeSpaceId.value = null;
  });

  it('defaults chatEngine to "gemini"', () => {
    expect(chatEngine.value).toBe('gemini');
  });

  it('loadChatHistory retrieves messages from storage for the given space', async () => {
    const spaceId = 'space-123' as UUID;
    const mockHistory: ChatMessage[] = [
      {
        id: 'msg-1' as UUID,
        role: 'user',
        content: 'Hello',
        timestamp: '2026-03-23T12:00:00Z' as ISOTimestamp,
        contextTabIds: [],
        taskId: null
      }
    ];

    vi.mocked(chrome.storage.local.get).mockResolvedValue({
      [`chatHistories:${spaceId}`]: mockHistory
    });

    await loadChatHistory(spaceId);

    expect(chrome.storage.local.get).toHaveBeenCalledWith(`chatHistories:${spaceId}`);
    expect(chatMessages.value).toEqual(mockHistory);
  });

  it('hydration guard prevents stale history from overwriting the latest space', async () => {
    const space1 = 'space-1' as UUID;
    const space2 = 'space-2' as UUID;

    const history1: ChatMessage[] = [{ id: 'm1' as UUID, role: 'user', content: 'Msg 1', timestamp: '...', contextTabIds: [], taskId: null }];
    const history2: ChatMessage[] = [{ id: 'm2' as UUID, role: 'user', content: 'Msg 2', timestamp: '...', contextTabIds: [], taskId: null }];

    // Simulate space 1 query taking longer
    vi.mocked(chrome.storage.local.get).mockImplementation(async (key) => {
      if (key === `chatHistories:${space1}`) {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { [key as string]: history1 };
      }
      return { [key as string]: history2 };
    });

    // Start loading space 1, then immediately switch and load space 2
    const p1 = loadChatHistory(space1);
    await loadChatHistory(space2); // Space 2 finishes first (no delay)
    await p1; // Space 1 finishes last

    // Should still be space 2's history
    expect(chatMessages.value).toEqual(history2);
  });
});
