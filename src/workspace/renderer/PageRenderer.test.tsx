// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Use vi.hoisted to ensure polyfill runs BEFORE any imports
vi.hoisted(() => {
  if (typeof window !== 'undefined' && !window.DOMMatrix) {
    (window as any).DOMMatrix = class DOMMatrix {
      constructor() {}
      static fromMatrix() { return new DOMMatrix(); }
    };
  }
});

import { render, waitFor } from '@testing-library/preact';
import PageRenderer from './PageRenderer';

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(() => {
    callback([{ isIntersecting: true }]);
  }),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock pdf.js
const mockPage = {
  getViewport: vi.fn().mockReturnValue({ 
    width: 1000, 
    height: 1500, 
    scale: 1.5,
    rawDims: { pageWidth: 1000, pageHeight: 1500, pageX: 0, pageY: 0 } 
  }),
  render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
  getTextContent: vi.fn().mockReturnValue(Promise.resolve({ items: [] })),
};

const mockPdf = {
  getPage: vi.fn().mockResolvedValue(mockPage),
};

describe('PageRenderer (Bundler Bypass)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('devicePixelRatio', 2);
  });

  it('should inject inline styles to bypass bundler CSS scoping', async () => {
    // Mock renderTextLayer
    const renderTextLayerSpy = vi.fn().mockReturnValue({ promise: Promise.resolve() });
    (window as any).pdfjsLib = { ...((window as any).pdfjsLib || {}), renderTextLayer: renderTextLayerSpy };

    render(<PageRenderer pdf={mockPdf as any} pageNumber={1} />);

    await waitFor(() => {
      // 1. Inline Style Check
      const styleTag = document.body.querySelector('style');
      expect(styleTag).toBeTruthy();
      expect(styleTag?.innerHTML).toContain('.textLayer {');
      expect(styleTag?.innerHTML).toContain('.textLayer span');
      expect(styleTag?.innerHTML).toContain('!important');

      // 2. Opacity and Specificity Check
      expect(styleTag?.innerHTML).toContain('opacity: 0.2;');
      expect(styleTag?.innerHTML).toContain('color: transparent !important');
    }, { timeout: 3000 });
  });
});
