import { initUiRoot } from './ui-root';
import { tooltipVisible, selectedColor } from './state';
import { updateTooltipPosition } from './tooltip-logic';
import { captureAnchor, restoreAnchor } from './anchoring';
import { wrapRange } from './highlighter';
import { sha256Hash, canonicalUrl } from '../lib/url-utils';

let restored = false;

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
      
      const range = restoreAnchor(h.anchor);
      if (range) {
        wrapRange(range, h.id, h.color);
      }
    }
  } catch (err) {
    console.warn('[IcyCrow] Failed to fetch highlights:', err);
  }
}

/**
 * Handle messages from background (Hotkeys)
 */
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'COMMAND_HIGHLIGHT') {
    performHighlight();
  }
});

/**
 * IcyCrow Content Script Entry Point
 */
export async function main() {
  initUiRoot();
  
  document.addEventListener('mouseup', handleSelectionChange);
  document.addEventListener('keyup', handleSelectionChange);
  
  await restoreHighlightsFromStorage();
}

/**
 * Cleanup function to remove event listeners
 */
export function teardown() {
  document.removeEventListener('mouseup', handleSelectionChange);
  document.removeEventListener('keyup', handleSelectionChange);
  restored = false;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
