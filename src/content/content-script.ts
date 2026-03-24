import { initUiRoot } from './ui-root';
import { tooltipVisible, selectedColor } from './state';
import { updateTooltipPosition } from './tooltip-logic';
import { captureAnchor, restoreAnchor } from './anchoring';
import { wrapRange, unwrapHighlight } from './highlighter';
import { sha256Hash, canonicalUrl } from '@lib/url-utils';
import { injectPrompt, scrapeResponse } from './gemini-bridge';

let restored = false;
let activeQueryTaskId: string | null = null;

async function withRetry<T>(fn: () => Promise<T>, attempts = 2, delayMs = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (attempts <= 1) throw err;
    await new Promise(r => setTimeout(r, delayMs));
    return withRetry(fn, attempts - 1, delayMs);
  }
}

/**
 * Core Highlight Action
 */
export async function performHighlight() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;

  const anchor = captureAnchor(selection);
  if (anchor) {
    const range = selection.getRangeAt(0);
    const url = window.location.href;
    const urlHash = await sha256Hash(canonicalUrl(url));
    const bodyText = document.body.innerText || document.body.textContent || '';
    const domFingerprint = await sha256Hash(bodyText.slice(0, 500));
    
    let highlightId = crypto.randomUUID();
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'HIGHLIGHT_CREATE',
        payload: {
          url,
          urlHash,
          text: anchor.exact,
          color: selectedColor.value,
          anchor,
          pageMeta: { title: document.title, domFingerprint },
          spaceId: null
        }
      });
      if (response && response.ok) {
        highlightId = response.data.id;
      }
    } catch (e) {
      console.warn('[IcyCrow] Failed to sync highlight. Wrapping locally.', e);
    }

    wrapRange(range, highlightId, selectedColor.value);
    selection.removeAllRanges();
    tooltipVisible.value = false;
  }
}

/**
 * Selection listener to show/hide tooltip
 */
function handleSelectionChange() {
  const selection = window.getSelection();
  
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    tooltipVisible.value = false;
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  if (rect.width > 0 && rect.height > 0) {
    // Diagnostic log
    console.log('[IcyCrow] Text selected. Showing tooltip at:', rect.top, rect.left);
    
    updateTooltipPosition(rect);
    tooltipVisible.value = true;
  }
}

/**
 * Fetch and restore highlights on page load
 */
async function restoreHighlightsFromStorage() {
  if (restored) return;
  restored = true;
  
  const urlHash = await sha256Hash(canonicalUrl(window.location.href));
  const bodyText = document.body.innerText || document.body.textContent || '';
  const domFingerprint = await sha256Hash(bodyText.slice(0, 500));

  try {
    const res = await withRetry(() => chrome.runtime.sendMessage({
      type: 'HIGHLIGHTS_FETCH',
      payload: { urlHash, currentDomFingerprint: domFingerprint }
    }));

    if (!res || !res.ok) return;

    for (const h of res.data.highlights) {
      if (res.data.pageChanged) {
        // Ghost mark logic handled here in future phase, skip restore for now
        continue;
      }
      
      try {
        const range = restoreAnchor(h.anchor);
        if (range) {
          wrapRange(range, h.id, h.color);
        }
      } catch (err) {
        console.warn('[IcyCrow] Failed to restore highlight:', h.id, err);
      }
    }
  } catch (err) {
    console.warn('[IcyCrow] Failed to fetch highlights:', err);
  }
}

/**
 * Sync logic: unwrap highlights when deleted from storage
 */
async function handleStorageChange(changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) {
  if (areaName !== 'local') return;

  try {
    const url = window.location.href;
    const cUrl = canonicalUrl(url);
    
    const urlHash = await sha256Hash(cUrl);
    const key = `highlights:${urlHash}`;

    if (changes[key]) {
      const oldHighlights = (changes[key].oldValue || []) as any[];
      const newHighlights = (changes[key].newValue || []) as any[];
      
      const oldIds = new Set(oldHighlights.map(h => h.id));
      const newIds = new Set(newHighlights.map(h => h.id));
      
      // Find deleted IDs
      for (const id of oldIds) {
        if (!newIds.has(id)) {
          unwrapHighlight(id);
        }
      }
    }
  } catch (err) {
    console.error('[IcyCrow] handleStorageChange error:', err);
  }
}

/**
 * Handle messages from background (Hotkeys)
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'COMMAND_HIGHLIGHT') {
    performHighlight();
  } else if (message.type === 'AI_QUERY' && window.location.href.includes('gemini.google.com')) {
    const { prompt, taskId } = message.payload;
    
    // Concurrency guard: Ignore if we're already processing this exact task or a different one
    if (activeQueryTaskId) {
      console.warn('[IcyCrow] Query ignored - another query is active:', activeQueryTaskId);
      sendResponse({ ok: false, error: 'QUERY_IN_PROGRESS' });
      return;
    }
    
    activeQueryTaskId = taskId;
    
    injectPrompt(prompt)
      .then(() => scrapeResponse(taskId))
      .catch(err => {
        chrome.runtime.sendMessage({
          type: 'AI_RESPONSE_STREAM',
          payload: { taskId, chunk: '', done: true, error: err.message }
        });
      })
      .finally(() => {
        activeQueryTaskId = null;
      });
    sendResponse({ ok: true });
  }
});

/**
 * IcyCrow Content Script Entry Point
 */
export async function main() {
  console.log('[IcyCrow] Content Script Main initializing...');
  initUiRoot();
  
  document.addEventListener('mouseup', handleSelectionChange);
  document.addEventListener('keyup', handleSelectionChange);
  document.addEventListener('selectionchange', handleSelectionChange);
  
  chrome.storage.onChanged.addListener(handleStorageChange);
  
  await restoreHighlightsFromStorage();
  console.log('[IcyCrow] Content Script Main ready.');
}

/**
 * Cleanup function to remove event listeners
 */
export function teardown() {
  document.removeEventListener('mouseup', handleSelectionChange);
  document.removeEventListener('keyup', handleSelectionChange);
  document.removeEventListener('selectionchange', handleSelectionChange);
  chrome.storage.onChanged.removeListener(handleStorageChange);
  restored = false;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
