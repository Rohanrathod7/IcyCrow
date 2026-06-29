// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/preact';
import { ChatView } from '../../../src/side-panel/components/ChatView';
import { chatMessages, isLoading, selectedContextTabs, activeChatSessionId, activeSpaceId, chatSessions } from '../../../src/side-panel/store';
import type { UUID } from '../../../src/lib/types';

// Mock ResizeObserver globally to prevent ReferenceError under jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('ChatView Component Logic', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    chatMessages.value = [];
    isLoading.value = false;
    selectedContextTabs.value = [{ tabId: 1, title: 'Test Tab', url: 'https://test.com' }];
    activeChatSessionId.value = 'session-123' as UUID;
    activeSpaceId.value = null;
    chatSessions.value = [{ id: 'session-123' as UUID, title: 'Chat', createdAt: 'now' as any, updatedAt: 'now' as any, spaceId: null }];
    
    // Mock chrome.runtime, chrome.tabs and chrome.storage
    global.chrome = {
      runtime: {
        sendMessage: vi.fn().mockImplementation(() => Promise.resolve({ ok: true })),
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
        id: 'test-extension-id'
      },
      tabs: {
        query: vi.fn((query, callback) => {
          if (callback) callback([]);
          return Promise.resolve([]);
        }),
      },
      storage: {
        local: {
          get: vi.fn().mockImplementation((key) => {
            if (key === 'chatSessions') {
              return Promise.resolve({ chatSessions: chatSessions.value });
            }
            if (key === 'chatMessages:session-123') {
              return Promise.resolve({ 'chatMessages:session-123': [] });
            }
            return Promise.resolve({});
          }),
          set: vi.fn().mockResolvedValue(undefined),
          remove: vi.fn().mockResolvedValue(undefined),
        },
        session: {
          get: vi.fn().mockResolvedValue({}),
          remove: vi.fn().mockResolvedValue(undefined),
        }
      }
    } as any;
  });

  it('should dispatch AI_QUERY when a message is sent', async () => {
    const root = document.getElementById('app')!;
    render(<ChatView />, { container: root });
    
    const input = document.querySelector('textarea') as HTMLTextAreaElement;
    const button = document.querySelector('.send-btn') as HTMLButtonElement;
    
    fireEvent.input(input, { target: { value: 'Explain this page' } });
    fireEvent.click(button);
    
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'AI_QUERY',
      payload: expect.objectContaining({
        prompt: 'Explain this page',
        spaceId: null
      })
    }));
    
    expect(isLoading.value).toBe(true);
  });

  it('should update assistant message when AI_RESPONSE_STREAM is received', async () => {
    let messageListener: Function = () => {};
    (chrome.runtime.onMessage.addListener as any).mockImplementation((fn: Function) => {
      messageListener = fn;
    });

    const root = document.getElementById('app')!;
    render(<ChatView />, { container: root });
    
    // Initial state: 0 messages
    expect(chatMessages.value).toHaveLength(0);

    // Simulate sending a message
    const input = document.querySelector('textarea') as HTMLTextAreaElement;
    const button = document.querySelector('.send-btn') as HTMLButtonElement;
    fireEvent.input(input, { target: { value: 'Hi' } });
    fireEvent.click(button);
    
    // Now 1 user message
    expect(chatMessages.value).toHaveLength(1);
    const taskId = (chrome.runtime.sendMessage as any).mock.calls[0][0].payload.taskId;

    // Simulate stream chunk
    messageListener({
      type: 'AI_RESPONSE_STREAM',
      payload: {
        taskId,
        chunk: 'Hello',
        done: false,
        error: undefined
      }
    }, { id: 'test-extension-id' });

    await waitFor(() => {
      expect(chatMessages.value).toHaveLength(2); // User + Assistant
      expect(chatMessages.value[1].role).toBe('assistant');
      expect(chatMessages.value[1].content).toBe('Hello');
    });

    // Simulate second chunk
    messageListener({
      type: 'AI_RESPONSE_STREAM',
      payload: {
        taskId,
        chunk: 'Hello there!',
        done: true,
        error: undefined
      }
    }, { id: 'test-extension-id' });

    await waitFor(() => {
      expect(chatMessages.value[1].content).toBe('Hello there!');
      expect(isLoading.value).toBe(false);
    });
  });

  it('should handle AI_RESPONSE_STREAM errors', async () => {
    let messageListener: Function = () => {};
    (chrome.runtime.onMessage.addListener as any).mockImplementation((fn: Function) => {
      messageListener = fn;
    });

    const root = document.getElementById('app')!;
    render(<ChatView />, { container: root });
    
    isLoading.value = true;
    const taskId = 'test-task-uuid' as UUID;

    // Simulate error
    messageListener({
      type: 'AI_RESPONSE_STREAM',
      payload: {
        taskId,
        chunk: '',
        done: true,
        error: 'Model overloaded'
      }
    }, { id: 'test-extension-id' });

    await waitFor(() => {
      expect(isLoading.value).toBe(false);
    });
  });

  it('should toggle ContextPicker when button is clicked', async () => {
    const root = document.getElementById('app')!;
    render(<ChatView />, { container: root });
    
    const toggleBtn = Array.from(document.querySelectorAll('.btn-ghost')).find(btn => btn.querySelector('.lucide-sparkles')) as HTMLButtonElement;
    expect(document.body.innerHTML).not.toContain('context-picker-overlay');
    
    fireEvent.click(toggleBtn);
    expect(document.body.innerHTML).toContain('context-picker-overlay');
    
    fireEvent.click(toggleBtn);
    expect(document.body.innerHTML).not.toContain('context-picker-overlay');
  });

  it('should render empty state message when no messages exist', async () => {
    chatMessages.value = [];
    const root = document.getElementById('app')!;
    render(<ChatView />, { container: root });
    
    expect(document.body.innerHTML).toContain('No messages yet');
  });
});
