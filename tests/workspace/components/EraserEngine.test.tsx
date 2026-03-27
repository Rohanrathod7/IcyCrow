import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { InkCanvas } from '../../../src/workspace/components/InkCanvas';
import { HighlightOverlay } from '../../../src/workspace/components/HighlightOverlay';
import { strokes, highlights } from '../../../src/workspace/store/annotation-state';
import { activeTool, viewerScale } from '../../../src/workspace/store/viewer-state';

// @vitest-environment jsdom

vi.mock('../../../src/lib/idb-store', () => ({
  saveAnnotations: vi.fn(),
  getAnnotations: vi.fn(),
  initDB: vi.fn(),
}));

describe('Eraser Engine', () => {
  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      clearRect: vi.fn(),
      scale: vi.fn(),
      lineWidth: 1,
      lineCap: 'round',
      strokeStyle: '#000',
    });

    HTMLCanvasElement.prototype.setPointerCapture = vi.fn();
    HTMLCanvasElement.prototype.releasePointerCapture = vi.fn();

    strokes.value = [];
    highlights.value = [];
    activeTool.value = 'eraser';
    viewerScale.value = 1.0;
  });

  it('deletes a stroke when the eraser passes over its points', () => {
    // 1. Setup a stroke at (10, 10)
    strokes.value = [
      { id: 's1', pageNumber: 1, color: 'red', width: 4, points: [{ x: 10, y: 10 }, { x: 15, y: 15 }] }
    ];

    const { container } = render(<InkCanvas pageNumber={1} url="mock.pdf" />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      top: 0, left: 0, width: 500, height: 500, bottom: 500, right: 500, x: 0, y: 0, toJSON: () => {}
    });

    // 2. Erase at (12, 12) - should hit
    fireEvent.pointerDown(canvas, { clientX: 12, clientY: 12 });
    fireEvent.pointerMove(canvas, { clientX: 12, clientY: 12 });

    expect(strokes.value.length).toBe(0);
  });

  it('deletes a highlight when clicking it in eraser mode', () => {
    // 1. Setup a highlight
    highlights.value = [
      { id: 'h1', pageNumber: 1, color: 'yellow', rects: [{ top: 10, left: 10, width: 100, height: 20 }] }
    ];

    const { getByTestId } = render(<HighlightOverlay pageNumber={1} url="mock.pdf" />);
    const highlightDiv = getByTestId('highlight-h1-0');

    // 2. In eraser mode, highlight should have pointer-events auto and handle clicks
    fireEvent.pointerDown(highlightDiv);
    
    expect(highlights.value.length).toBe(0);
  });
});
