import { describe, it, expect, vi, beforeEach } from 'vitest';
import { appendChatMessage, getChatHistory } from '@lib/storage';
import type { ChatMessage, UUID } from '@lib/types';

describe('Storage History Pruning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.chrome = {
      storage: {
        local: {
          get: vi.fn(),
          set: vi.fn().mockResolvedValue(undefined),
        }
      },
      runtime: {
        lastError: undefined
      }
    } as any;
  });

  it('should prune history to 50 messages when appending the 51st', async () => {
    const spaceId = 'space-prune' as UUID;
    const existingHistory: ChatMessage[] = Array.from({ length: 50 }, (_, i) => ({
      id: `msg-${i}` as UUID,
      role: 'user',
      content: `Message ${i}`,
      timestamp: new Date().toISOString() as any,
      contextTabIds: []
    }));

    vi.mocked(chrome.storage.local.get).mockResolvedValue({
      [`chatHistories:${spaceId}`]: existingHistory
    });

    const newMessage: ChatMessage = {
      id: 'msg-51' as UUID,
      role: 'user',
      content: 'The 51st message',
      timestamp: new Date().toISOString() as any,
      contextTabIds: []
    };

    await appendChatMessage(spaceId, newMessage);

    // Should call set with 50 messages (the last 49 existing + 1 new)
    expect(chrome.storage.local.set).toHaveBeenCalledWith(expect.objectContaining({
      [`chatHistories:${spaceId}`]: expect.arrayContaining([
        expect.objectContaining({ content: 'Message 1' }), // Message 0 should be pruned
        expect.objectContaining({ content: 'The 51st message' })
      ])
    }));

    const passedHistory = vi.mocked(chrome.storage.local.set).mock.calls[0][0][`chatHistories:${spaceId}`];
    expect(passedHistory).toHaveLength(50);
    expect(passedHistory[0].content).toBe('Message 1');
  });
});
