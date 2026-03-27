import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { InkCanvas } from '../../../src/workspace/components/InkCanvas';
import { strokes } from '../../../src/workspace/store/annotation-state';
import { viewerScale, activeTool } from '../../../src/workspace/store/viewer-state';

// @vitest-environment jsdom

describe('InkCanvas', () => {
  beforeEach(() => {
    strokes.value = [];
    viewerScale.value = 1.0;
    activeTool.value = 'draw';
    
    // Mock getBoundingClientRect for the container
    // We'll use a hack to provide it during the test
  });

  it('renders a canvas and responds to tool selection', () => {
    const { container, rerender } = render(<InkCanvas pageNumber={1} />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas).toBeDefined();

    // In draw mode, pointer-events should be auto
    expect(window.getComputedStyle(canvas).pointerEvents).toBe('auto');

    // Switch to highlight - pointer-events should be none
    activeTool.value = 'highlight';
    rerender(<InkCanvas pageNumber={1} />);
    expect(window.getComputedStyle(canvas).pointerEvents).toBe('none');
  });

  it('normalizes coordinates based on viewer scale during capture', () => {
    const { container, getByTestId } = render(<InkCanvas pageNumber={1} />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    
    // Mock container position at (10, 10)
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      top: 10,
      left: 10,
      width: 500,
      height: 500,
      bottom: 510,
      right: 510,
      x: 10,
      y: 10,
      toJSON: () => {}
    });

    // 2.0x Zoom
    viewerScale.value = 2.0;

    // Simulate drawing
    fireEvent.pointerDown(canvas, { clientX: 30, clientY: 50 }); // Native (30, 50)
    
    // Relative to container: (20, 40)
    // Normalized by 2.0x: (10, 20)
    
    expect(strokes.value.length).toBe(1);
    expect(strokes.value[0].points[0]).toEqual({ x: 10, y: 20 });
  });

  it('adds points to an active stroke on move', () => {
    const { container } = render(<InkCanvas pageNumber={1} />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      top: 0, left: 0, width: 500, height: 500, bottom: 500, right: 500, x: 0, y: 0, toJSON: () => {}
    });

    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(canvas, { clientX: 20, clientY: 20 });
    
    expect(strokes.value[0].points).toHaveLength(2);
    expect(strokes.value[0].points[1]).toEqual({ x: 20, y: 20 });
  });
});
