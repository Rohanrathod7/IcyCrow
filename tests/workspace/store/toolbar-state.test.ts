/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { 
  toolbarPosition, 
  floatingCoordinates, 
  toolsOrder, 
  toolbarIsDragging 
} from '../../../src/workspace/store/toolbar-state';

describe('toolbar-state', () => {
  it('should have correct initial values', () => {
    expect(toolbarPosition.value).toBe('bottom');
    expect(floatingCoordinates.value).toEqual({ 
      x: window.innerWidth / 2, 
      y: window.innerHeight - 80 
    });
    expect(toolsOrder.value).toEqual(['pan', 'select', 'highlight', 'draw', 'zoomIn', 'zoomOut']);
    expect(toolbarIsDragging.value).toBe(false);
  });

  it('should allow updating signals', () => {
    toolbarPosition.value = 'left';
    expect(toolbarPosition.value).toBe('left');

    floatingCoordinates.value = { x: 100, y: 100 };
    expect(floatingCoordinates.value).toEqual({ x: 100, y: 100 });

    toolbarIsDragging.value = true;
    expect(toolbarIsDragging.value).toBe(true);
  });
});
