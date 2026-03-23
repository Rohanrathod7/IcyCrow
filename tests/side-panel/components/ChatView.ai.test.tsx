// @vitest-environment jsdom
import { h } from 'preact';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// MOCK THE MUTEX TO PREVENT DEADLOCKS
vi.mock('@lib/storage-mutex', () => ({
  StorageMutex: class {
    async withLock(key: string, task: () => Promise<any>) {
      return task();
    }
  }
}));

import { render, fireEvent, waitFor } from '@testing-library/preact';
import { ChatView } from '../../../src/side-panel/components/ChatView';
import { chatMessages, chatEngine, activeSpaceId, selectedContextTabs } from '../../../src/side-panel/store';
import type { UUID } from '../../../src/lib/types';

describe('ChatView: AI Engine & Persistence', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    chatMessages.value = [];
    chatEngine.value = 'gemini';
    activeSpaceId.value = 'space-1' as UUID;
    selectedContextTabs.value = [];
    
    global.chrome = {
      runtime: {
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
        id: 'test-id'
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined),
        }
      }
    } as any;
  });

  it('renders engine selector and updates chatEngine signal', async () => {
    render(<ChatView />);
    const selector = await waitFor(() => document.querySelector('[data-testid="engine-selector"]') as HTMLSelectElement);
    expect(selector).toBeTruthy();
    fireEvent.change(selector, { target: { value: 'window.ai' } });
    expect(chatEngine.value).toBe('window.ai');
  });

  it('dispatches WINDOW_AI_QUERY when Nano engine is selected', async () => {
    chatEngine.value = 'window.ai';
    render(<ChatView />);
    const input = await waitFor(() => document.querySelector('textarea') as HTMLTextAreaElement);
    const button = document.querySelector('.send-btn') as HTMLButtonElement;
    fireEvent.input(input, { target: { value: 'Local prompt' } });
    fireEvent.click(button);
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'WINDOW_AI_QUERY'
    }));
  });

  it('persists user message to local storage before dispatching', async () => {
    render(<ChatView />);
    const input = await waitFor(() => document.querySelector('textarea') as HTMLTextAreaElement);
    const button = document.querySelector('.send-btn') as HTMLButtonElement;

    fireEvent.input(input, { target: { value: 'Persist me' } });
    fireEvent.click(button);

    // Verify side effect on chrome.storage.local.set
    await waitFor(() => {
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'chatHistories:space-1': expect.arrayContaining([
            expect.objectContaining({ content: 'Persist me', role: 'user' })
          ])
        })
      );
    }, { timeout: 3000 });
  });

  it('shows engine status indicator in input area', async () => {
    chatEngine.value = 'window.ai';
    render(<ChatView />);
    await waitFor(() => {
      expect(document.body.innerHTML).toContain('Gemini Nano (Local)');
    });
  });
});
