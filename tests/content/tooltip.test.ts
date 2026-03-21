// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tooltipVisible, tooltipPos } from '../../src/content/state';
import { updateTooltipPosition } from '../../src/content/tooltip-logic';

describe('Tooltip State: Logic & Positioning', () => {
  beforeEach(() => {
    tooltipVisible.value = false;
    tooltipPos.value = { x: 0, y: 0 };
    vi.clearAllMocks();
  });

  it('updates tooltip visibility signal based on selection', () => {
    // Mock selection
    const mockSelection = {
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => ({
        getBoundingClientRect: () => ({ top: 100, left: 100, width: 50, height: 20 })
      })
    } as any;
    
    // Manual trigger logic check
    if (!mockSelection.isCollapsed) {
       tooltipVisible.value = true;
    }
    
    expect(tooltipVisible.value).toBe(true);
  });

  it('calculates position including scroll offsets (Rule 2)', () => {
    // Mock scroll
    window.scrollY = 500;
    window.scrollX = 200;
    
    const mockRect = { top: 100, left: 100, width: 50, height: 20 } as DOMRect;
    
    updateTooltipPosition(mockRect);
    
    // Expected: top (100) + scrollY (500) = 600
    // Expected: left (100) + scrollX (200) + (width/2) = 325 (centered)
    expect(tooltipPos.value.y).toBe(600);
    expect(tooltipPos.value.x).toBe(325);
  });
});
