import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  chatMessages, 
  chatEngine, 
  activeSpaceId, 
  chatSessions,
  activeChatSessionId,
  createNewChatSession,
  loadChatSession,
  saveActiveSessionMessages,
  deleteChatSessionAndHistory,
  initializeChatForSpace 
} from '../../src/side-panel/store';
import type { ChatMessage, UUID, ISOTimestamp } from '../../src/lib/types';

// Mock chrome APIs
global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
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
    chatSessions.value = [];
    activeChatSessionId.value = null;
  });

  it('defaults chatEngine to "gemini"', () => {
    expect(chatEngine.value).toBe('gemini');
  });

  it('createNewChatSession should clear messages and reset active session ID', () => {
    chatMessages.value = [{ id: 'msg-1' as UUID, role: 'user' as const, content: 'Hello', timestamp: '2026-03-23T12:00:00Z' as ISOTimestamp, contextTabIds: [], taskId: null }];
    activeChatSessionId.value = 'session-123' as UUID;

    createNewChatSession();

    expect(chatMessages.value).toEqual([]);
    expect(activeChatSessionId.value).toBeNull();
  });

  it('loadChatSession should fetch messages and set active session ID', async () => {
    const mockHistory: ChatMessage[] = [
      { id: 'msg-1' as UUID, role: 'user' as const, content: 'Hello', timestamp: '2026-03-23T12:00:00Z' as ISOTimestamp, contextTabIds: [], taskId: null }
    ];

    vi.mocked(chrome.storage.local.get).mockImplementation(async (key) => {
      if (key === 'chatMessages:session-123') {
        return { 'chatMessages:session-123': mockHistory };
      }
      return {};
    });

    await loadChatSession('session-123' as UUID);

    expect(activeChatSessionId.value).toBe('session-123');
    expect(chatMessages.value).toEqual(mockHistory);
  });

  it('saveActiveSessionMessages should update existing session and save history', async () => {
    activeChatSessionId.value = 'session-123' as UUID;
    const initialSessions = [{ id: 'session-123' as UUID, title: 'Chat', createdAt: 'now' as any, updatedAt: 'now' as any, spaceId: null }];

    vi.mocked(chrome.storage.local.get).mockImplementation(async (key) => {
      if (key === 'chatSessions') {
        return { chatSessions: initialSessions };
      }
      return {};
    });

    const messages = [{ id: 'msg-1' as UUID, role: 'user' as const, content: 'Hello', timestamp: 'now' as any, contextTabIds: [], taskId: null }];
    await saveActiveSessionMessages(messages);

    expect(chrome.storage.local.set).toHaveBeenCalled();
  });

  it('deleteChatSessionAndHistory should remove session and reset if active', async () => {
    activeChatSessionId.value = 'session-123' as UUID;
    const initialSessions = [{ id: 'session-123' as UUID, title: 'Chat', createdAt: 'now' as any, updatedAt: 'now' as any, spaceId: null }];

    vi.mocked(chrome.storage.local.get).mockImplementation(async (key) => {
      if (key === 'chatSessions') {
        return { chatSessions: initialSessions };
      }
      return {};
    });

    await deleteChatSessionAndHistory('session-123' as UUID);

    expect(chatMessages.value).toEqual([]);
    expect(activeChatSessionId.value).toBeNull();
  });

  it('initializeChatForSpace should load chat session or create new one', async () => {
    const initialSessions = [{ id: 'session-123' as UUID, title: 'Chat', createdAt: 'now' as any, updatedAt: 'now' as any, spaceId: 'space-123' as UUID }];

    vi.mocked(chrome.storage.local.get).mockImplementation(async (key) => {
      if (key === 'chatSessions') {
        return { chatSessions: initialSessions };
      }
      if (key === 'chatMessages:session-123') {
        return { 'chatMessages:session-123': [] };
      }
      return {};
    });

    await initializeChatForSpace('space-123' as UUID);

    expect(activeChatSessionId.value).toBe('session-123');
  });
});
