// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock chrome.runtime.sendMessage BEFORE imports are hoisted
vi.hoisted(() => {
  globalThis.chrome = {
    runtime: {
      sendMessage: vi.fn(),
      onMessage: { addListener: vi.fn() }
    }
  } as any;
  
  if (!globalThis.crypto) {
    globalThis.crypto = {} as any;
  }
  globalThis.crypto.randomUUID = () => '123e4567-e89b-12d3-a456-426614174000';
});

vi.mock('../../src/lib/url-utils', () => ({
  sha256Hash: vi.fn().mockResolvedValue('mock-hash'),
  canonicalUrl: vi.fn().mockReturnValue('https://example.com')
}));

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
    vi.clearAllMocks();
    document.body.innerHTML = '<p id="test">test text</p>';
    window.getSelection = vi.fn().mockReturnValue(new globalThis.Selection());
    
    selectedColor.value = 'yellow';
    tooltipVisible.value = true;
    
    // Reset any module-scoped state (like the 'restored' flag if implemented)
    // We mock the internals of what performHighlight calls
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
    vi.spyOn(highlighter, 'wrapRange').mockImplementation(() => []);
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
    // It should still wrap the element with a locally generated ID
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

    // Run the load cycle
    await main();

    // Check message sent
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'HIGHLIGHTS_FETCH'
      })
    );

    // Give microtasks time to execute the restoration
    await new Promise(r => setTimeout(r, 0));

    // Check if it restored the anchor
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

    // The element for a ghost isn't wrapped through wrapRange, it injects a ghost mark explicitly or logs it?
    // According to plan: "inject a ghost `<mark data-status="ghost">` without calling `restoreAnchor`"
    // We'll just verify restoreAnchor is NOT called for ghost items.
    
    await main();
    await new Promise(r => setTimeout(r, 0));

    expect(anchoring.restoreAnchor).not.toHaveBeenCalled();
    // For Phase 2, we just verify restoreAnchor isn't called. Ghost injection can be checked via DOM or spy.
  });
});
