// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/preact';
import { ChatView } from '../../../src/side-panel/components/ChatView';
import { chatMessages, isLoading, selectedContextTabs } from '../../../src/side-panel/store';
import type { UUID } from '../../../src/lib/types';

describe('ChatView Component Logic', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    chatMessages.value = [];
    isLoading.value = false;
    selectedContextTabs.value = [{ tabId: 1, title: 'Test Tab', url: 'https://test.com' }];
    
    // Mock chrome.runtime and chrome.tabs
    global.chrome = {
      runtime: {
        sendMessage: vi.fn(),
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
        contextTabs: expect.arrayContaining([{ tabId: 1, title: 'Test Tab', url: 'https://test.com' }])
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
        chunk: ' there!',
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
    
    const toggleBtn = document.querySelector('.btn-ghost') as HTMLButtonElement;
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
