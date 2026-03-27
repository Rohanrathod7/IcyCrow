import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/preact';
import { HighlightOverlay } from '../../../src/workspace/components/HighlightOverlay';
import { highlights } from '../../../src/workspace/store/annotation-state';
import { viewerScale } from '../../../src/workspace/store/viewer-state';

// @vitest-environment jsdom

vi.mock('../../../src/lib/idb-store', () => ({
  saveAnnotations: vi.fn(),
  getAnnotations: vi.fn(),
  initDB: vi.fn(),
}));

describe('HighlightOverlay', () => {
  beforeEach(() => {
    highlights.value = [];
    viewerScale.value = 1.0;
  });

  it('renders nothing when there are no highlights for the page', () => {
    const { container } = render(<HighlightOverlay pageNumber={1} url="mock.pdf" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders highlight rects with correct scale and style', () => {
    highlights.value = [
      {
        id: 'h1',
        pageNumber: 1,
        color: 'yellow',
        rects: [
          { top: 100, left: 50, width: 200, height: 20 }
        ]
      }
    ];
    
    // Scale at 2.0
    viewerScale.value = 2.0;

    const { getByTestId } = render(<HighlightOverlay pageNumber={1} url="mock.pdf" />);
    const highlightDiv = getByTestId('highlight-h1-0');

    expect(highlightDiv.style.top).toBe('200px'); // 100 * 2
    expect(highlightDiv.style.left).toBe('100px'); // 50 * 2
    expect(highlightDiv.style.width).toBe('400px'); // 200 * 2
    expect(highlightDiv.style.height).toBe('40px'); // 20 * 2
    expect(highlightDiv.style.backgroundColor).toBe('yellow');
    expect(highlightDiv.style.mixBlendMode).toBe('multiply');
  });

  it('filters highlights by pageNumber', () => {
    highlights.value = [
      { id: 'p1', pageNumber: 1, color: 'red', rects: [{ top: 10, left: 10, width: 10, height: 10 }] },
      { id: 'p2', pageNumber: 2, color: 'blue', rects: [{ top: 20, left: 20, width: 20, height: 20 }] }
    ];

    const { queryByTestId, getByTestId } = render(<HighlightOverlay pageNumber={1} url="mock.pdf" />);
    expect(getByTestId('highlight-p1-0')).toBeDefined();
    expect(queryByTestId('highlight-p2-0')).toBeNull();
  });
});
