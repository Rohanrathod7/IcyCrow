// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findSelector, injectPrompt, scrapeResponse } from '../../src/content/gemini-bridge';
import { humanType } from '../../src/content/anti-detection';

// Mock anti-detection to avoid timing issues in bridge tests
vi.mock('../../src/content/anti-detection', () => ({
  humanType: vi.fn(() => Promise.resolve()),
  typingDelay: vi.fn(() => Promise.resolve()),
  jitter: vi.fn((n) => n),
}));

describe('Gemini Bridge', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
    
    // Global chrome mock
    globalThis.chrome = {
      runtime: {
        sendMessage: vi.fn(),
      },
    } as any;
  });

  describe('findSelector', () => {
    it('returns first matching element from array', () => {
      const div = document.createElement('div');
      div.className = 'match-2';
      document.body.appendChild(div);

      const result = findSelector(['.match-1', '.match-2', '.match-3']);
      expect(result).toBe(div);
    });

    it('returns null if no matches', () => {
      const result = findSelector(['.not-found']);
      expect(result).toBeNull();
    });
  });

  describe('injectPrompt', () => {
    it('finds input and calls humanType', async () => {
      const input = document.createElement('div');
      input.className = 'ql-editor';
      document.body.appendChild(input);

      const sendBtn = document.createElement('button');
      sendBtn.setAttribute('aria-label', 'Send message');
      document.body.appendChild(sendBtn);

      const clickSpy = vi.spyOn(sendBtn, 'click');

      await injectPrompt('Hello Gemini');

      expect(humanType).toHaveBeenCalledWith(input, 'Hello Gemini');
      expect(clickSpy).toHaveBeenCalled();
    });

    it('throws error if input not found', async () => {
      await expect(injectPrompt('Hello')).rejects.toThrow('Gemini input field not found');
    });
  });

  describe('scrapeResponse', () => {
    it('streams chunks via MutationObserver and ends when stable', async () => {
      vi.useFakeTimers();
      const container = document.createElement('model-response');
      container.innerText = 'Initial text';
      document.body.appendChild(container);

      // Mock send button status
      const sendBtn = document.createElement('button');
      sendBtn.setAttribute('aria-label', 'Send message');
      document.body.appendChild(sendBtn);

      const scrapePromise = scrapeResponse('task-123');

      // Trigger mutation
      container.innerText = 'Step 1 content';
      // Mocked MutationObserver callback usually fires on DOM change in JSDOM, 
      // but we might need to manually trigger if JSDOM doesn't support it fully.
      // However, Vitest JSDOM environment does support MutationObserver.

      // Advance timers for stability check
      await vi.advanceTimersByTimeAsync(2000);
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        type: 'AI_RESPONSE_STREAM',
        payload: expect.objectContaining({ chunk: 'Step 1 content', done: true })
      }));

      vi.useRealTimers();
    });
  });
});
