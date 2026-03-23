// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/preact';
import { ChatView } from '../../../src/side-panel/components/ChatView';
import { chatMessages, isLoading, selectedContextTabs } from '../../../src/side-panel/store';

describe('ChatView Component Logic', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    chatMessages.value = [];
    isLoading.value = false;
    selectedContextTabs.value = [{ tabId: 1, title: 'Test Tab', url: 'https://test.com' }];
    
    // Mock chrome.runtime
    global.chrome = {
      runtime: {
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
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
    });

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
    });

    await waitFor(() => {
      expect(chatMessages.value[1].content).toBe('Hello there!');
      expect(isLoading.value).toBe(false);
    });
  });
});
