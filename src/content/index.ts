import { initUiRoot } from './ui-root';
import { tooltipVisible, selectedColor } from './state';
import { updateTooltipPosition } from './tooltip-logic';
import { captureAnchor } from './anchoring';
import { wrapRange } from './highlighter';

/**
 * Core Highlight Action
 */
function performHighlight() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;

  const anchor = captureAnchor(selection);
  if (anchor) {
    const range = selection.getRangeAt(0);
    wrapRange(range, crypto.randomUUID(), selectedColor.value);
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
function main() {
  initUiRoot();
  
  document.addEventListener('mouseup', handleSelectionChange);
  document.addEventListener('keyup', handleSelectionChange); // Handle keyboard selection
}

/**
 * Cleanup function to remove event listeners
 */
export function teardown() {
  document.removeEventListener('mouseup', handleSelectionChange);
  document.removeEventListener('keyup', handleSelectionChange);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
