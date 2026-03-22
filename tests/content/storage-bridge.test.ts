// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock chrome.runtime.sendMessage BEFORE imports are hoisted
vi.hoisted(() => {
  globalThis.chrome = {
    runtime: {
      sendMessage: vi.fn(),
      onMessage: { addListener: vi.fn() }
    },
    storage: {
      onChanged: { 
        addListener: vi.fn(),
        removeListener: vi.fn()
      },
      local: { get: vi.fn() }
    }
  } as any;
  
  vi.stubGlobal('crypto', {
    randomUUID: () => '123e4567-e89b-12d3-a456-426614174000',
    subtle: {
      digest: vi.fn().mockResolvedValue(new ArrayBuffer(32))
    }
  });
});

vi.mock('@lib/url-utils', () => ({
  sha256Hash: async () => 'mock-hash',
  canonicalUrl: () => 'https://example.com'
}));

vi.mock('../../src/content/highlighter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/content/highlighter')>();
  return {
    ...actual,
    unwrapHighlight: vi.fn(actual.unwrapHighlight),
    wrapRange: vi.fn(actual.wrapRange)
  };
});

import { performHighlight, main, teardown } from '../../src/content/index';
import * as anchoring from '../../src/content/anchoring';
import * as highlighter from '../../src/content/highlighter';
import { tooltipVisible, selectedColor } from '../../src/content/state';

// Mock DOM ranges
globalThis.Selection = class {
  isCollapsed = false;
  rangeCount = 1;
  getRangeAt = vi.fn().mockReturnValue(document.createRange());
  removeAllRanges = vi.fn();
  toString = vi.fn().mockReturnValue('test text');
} as any;

describe('Content Script Storage Bridge', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    document.body.innerHTML = '<p id="test">test text</p>';
    window.getSelection = vi.fn().mockReturnValue(new globalThis.Selection());
    
    selectedColor.value = 'yellow';
    tooltipVisible.value = true;
    
    vi.spyOn(anchoring, 'captureAnchor').mockReturnValue({
      type: 'TextQuoteSelector',
      exact: 'test text',
      prefix: '',
      suffix: '',
      xpathFallback: '/html/body/p',
      cssFallback: 'p',
      startOffset: 0,
      endOffset: 9
    });
    vi.spyOn(anchoring, 'restoreAnchor').mockReturnValue(document.createRange());
  });

  afterEach(() => {
    teardown();
  });

  it('performHighlight sends HIGHLIGHT_CREATE and wraps on success', async () => {
    const mockId = '123e4567-e89b-12d3-a456-426614174000';
    (chrome.runtime.sendMessage as any).mockResolvedValue({
      ok: true,
      data: { id: mockId, createdAt: '2026-03-22T00:00:00Z' }
    });

    await performHighlight();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'HIGHLIGHT_CREATE',
        payload: expect.objectContaining({
          url: window.location.href,
          text: 'test text',
          color: 'yellow'
        })
      })
    );

    expect(highlighter.wrapRange).toHaveBeenCalledWith(
      expect.any(Range),
      mockId,
      'yellow'
    );
  });

  it('performHighlight wraps with local UUID if sendMessage fails', async () => {
    (chrome.runtime.sendMessage as any).mockRejectedValue(new Error('SW asleep'));

    await performHighlight();

    expect(chrome.runtime.sendMessage).toHaveBeenCalled();
    expect(highlighter.wrapRange).toHaveBeenCalledWith(
      expect.any(Range),
      expect.any(String),
      'yellow'
    );
  });

  it('main() calls HIGHLIGHTS_FETCH and restores DOM', async () => {
    (chrome.runtime.sendMessage as any).mockResolvedValue({
      ok: true,
      data: {
        pageChanged: false,
        highlights: [
          {
            id: 'mock-id-1',
            color: 'green',
            anchor: { exact: 'test' }
          }
        ]
      }
    });

    await main();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'HIGHLIGHTS_FETCH'
      })
    );

    await new Promise(r => setTimeout(r, 0));

    expect(anchoring.restoreAnchor).toHaveBeenCalledWith(
      expect.objectContaining({ exact: 'test' })
    );
    expect(highlighter.wrapRange).toHaveBeenCalledWith(
      expect.any(Range),
      'mock-id-1',
      'green'
    );
  });

  it('main() marks as ghost if pageChanged is true', async () => {
    (chrome.runtime.sendMessage as any).mockResolvedValue({
      ok: true,
      data: {
        pageChanged: true,
        highlights: [
          {
            id: 'mock-id-ghost',
            color: 'blue',
            anchor: { exact: 'ghost text' }
          }
        ]
      }
    });

    await main();
    await new Promise(r => setTimeout(r, 0));

    expect(anchoring.restoreAnchor).not.toHaveBeenCalled();
  });

  describe('Deletion Sync', () => {
    it('storage.onChanged triggers unwrapHighlight on deletion', async () => {
      // Setup: Register listeners explicitly
      await main();
      
      const mockId = '123e4567-e89b-12d3-a456-426614174003';
      document.body.innerHTML = `<p>some <mark class="icycrow-highlight" data-id="${mockId}">text</mark> here</p>`;
      
      const addListenerSpy = chrome.storage.onChanged.addListener as any;
      const callback = addListenerSpy.mock.calls[0][0];

      const key = 'highlights:mock-hash';

      callback({
        [key]: {
          oldValue: [{ id: mockId }],
          newValue: []
        }
      }, 'local');

      // Async due to sha256Hash in index.ts
      await new Promise(r => setTimeout(r, 50));
      
      const markAfter = document.querySelector(`mark[data-id="${mockId}"]`);
      expect(markAfter).toBeNull();
      expect(document.body.textContent).toContain('some text here');
    });

    it('highlighter.unwrapHighlight removes mark and preserves text', () => {
      document.body.innerHTML = '<p>prefix <mark class="icycrow-highlight" data-id="test-id">highlighted</mark> suffix</p>';
      
      const markBefore = document.querySelector('mark[data-id="test-id"]');
      expect(markBefore).not.toBeNull();

      highlighter.unwrapHighlight('test-id');
      
      const markAfter = document.querySelector('mark[data-id="test-id"]');
      expect(markAfter).toBeNull();
      expect(document.body.textContent).toContain('prefix highlighted suffix');
    });
  });
});
