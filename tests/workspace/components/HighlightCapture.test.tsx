import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { PdfPage } from '../../../src/workspace/components/PdfPage';
import { highlights } from '../../../src/workspace/store/annotation-state';
import { viewerScale } from '../../../src/workspace/store/viewer-state';
import { activeTool } from '../../../src/workspace/store/viewer-state';

// @vitest-environment jsdom

vi.mock('react-pdf', () => ({
  Page: () => <div />,
  pdfjs: { GlobalWorkerOptions: {} }
}));

describe('Highlight Capture Engine', () => {
  beforeEach(() => {
    highlights.value = [];
    viewerScale.value = 1.0;
    activeTool.value = 'highlight';
    
    // Mock getSelection
    vi.stubGlobal('getSelection', vi.fn(() => ({
      isCollapsed: false,
      rangeCount: 1,
      getRangeAt: () => ({
        getClientRects: () => [
          { top: 150, left: 100, width: 100, height: 20 }
        ]
      }),
      removeAllRanges: vi.fn()
    })));
  });

  it('captures and normalizes selection coordinates', () => {
    // Page container layout mock
    // container is at (50, 50)
    const { getByTestId } = render(<PdfPage pageNumber={1} url="mock.pdf" />);
    const container = getByTestId('pdf-page-1');
    
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      top: 50,
      left: 50,
      width: 500,
      height: 800,
      bottom: 850,
      right: 550,
      x: 50,
      y: 50,
      toJSON: () => {}
    });

    // Scale is 2.0
    viewerScale.value = 2.0;

    // Trigger pointerup
    fireEvent.pointerUp(container);

    expect(highlights.value.length).toBe(1);
    const h = highlights.value[0];
    
    // Math: (150 - 50) / 2 = 50
    // Math: (100 - 50) / 2 = 25
    expect(h.rects[0].top).toBe(50);
    expect(h.rects[0].left).toBe(25);
    expect(h.rects[0].width).toBe(50);
    expect(h.rects[0].height).toBe(10);
  });

  it('ignores selection if activeTool is not highlight', () => {
    activeTool.value = 'pan';
    const { getByTestId } = render(<PdfPage pageNumber={1} url="mock.pdf" />);
    const container = getByTestId('pdf-page-1');
    
    fireEvent.pointerUp(container);
    expect(highlights.value.length).toBe(0);
  });
});
