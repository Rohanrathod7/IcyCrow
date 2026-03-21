import { initUiRoot } from './ui-root';
import { tooltipVisible } from './state';
import { updateTooltipPosition } from './tooltip-logic';

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
 * IcyCrow Content Script Entry Point
 */
function main() {
  initUiRoot();
  
  document.addEventListener('mouseup', handleSelectionChange);
  document.addEventListener('keyup', handleSelectionChange); // Handle keyboard selection
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
