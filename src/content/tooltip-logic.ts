import { tooltipPos } from './state';

/**
 * Update tooltip position based on selection rect
 * Following Coordinate Math Rule (LLD §5)
 */
export function updateTooltipPosition(rect: DOMRect) {
  tooltipPos.value = {
    x: rect.left + window.scrollX + (rect.width / 2),
    y: rect.top + window.scrollY
  };
}
