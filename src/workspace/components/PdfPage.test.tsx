// @vitest-environment jsdom
import { vi, describe, it, expect, beforeAll } from 'vitest';
import { render, waitFor } from '@testing-library/preact';
import { PdfPage } from './PdfPage';
import { activeTool, toolSettings } from '../store/viewer-state';

beforeAll(() => {
  global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn((el) => {
      callback([{ isIntersecting: true, target: el }]);
    }),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  }));

  const mockFetch = vi.fn().mockResolvedValue({
    blob: () => Promise.resolve(new Blob(['mock pdf content'], { type: 'application/pdf' }))
  });
  global.fetch = mockFetch;
  if (typeof window !== 'undefined') {
    window.fetch = mockFetch;
  }
});

// Mock react-pdf
vi.mock('react-pdf', () => ({
  Document: ({ children }: any) => <div className="mock-document">{children}</div>,
  Page: ({ children, onRenderSuccess }: any) => {
    // Call asynchronously to prevent infinite state update loop
    Promise.resolve().then(() => {
      onRenderSuccess?.({ width: 1000, height: 1500, originalWidth: 1000, originalHeight: 1500 });
    });
    return <div className="mock-page">{children}</div>;
  },
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: ''
    }
  }
}));

vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({
  default: 'mock-worker-url'
}));

// Mock overlays
vi.mock('./HighlightOverlay', () => ({
  HighlightOverlay: () => <div className="mock-highlight-overlay" style={{ position: 'absolute' }} />
}));

vi.mock('./InkCanvas', () => ({
  InkCanvas: () => <div className="mock-ink-canvas" style={{ position: 'absolute' }} />
}));

vi.mock('../store/annotation-state', () => ({
  highlights: { value: [] },
  strokes: { value: [] },
  stickyNotes: { value: [] },
  callouts: { value: [] },
  draftCallout: { value: null },
  initializeAnnotations: vi.fn().mockResolvedValue(undefined),
  persistAnnotations: vi.fn().mockResolvedValue(undefined),
  addSticky: vi.fn(),
  addCallout: vi.fn()
}));

describe('PdfPage (react-pdf Architectural Pivot)', () => {
  it('should implement the 4-Layer Cake architecture with react-pdf', async () => {
    const { container } = render(<PdfPage pageNumber={1} url="mock.pdf" />);

    await waitFor(() => {
      // 1. Container Check
      const root = container.firstChild as HTMLElement;
      expect(root.classList.contains('pdf-page-container')).toBe(true);
      expect(root.style.position).toBe('relative');

      // 2. Document & Page Check
      expect(container.querySelector('.mock-document')).toBeTruthy();
      expect(container.querySelector('.mock-page')).toBeTruthy();

      // 3. Overlay Layering (Layers 2 & 4)
      const highlightOverlay = container.querySelector('.mock-highlight-overlay') as HTMLElement;
      const inkCanvas = container.querySelector('.mock-ink-canvas') as HTMLElement;

      expect(highlightOverlay).toBeTruthy();
      expect(inkCanvas).toBeTruthy();
      
      // 4. Verification of Absolute Positioning for Overlays
      expect(highlightOverlay.style.position).toBe('absolute');
      expect(inkCanvas.style.position).toBe('absolute');
    }, { timeout: 3000 });
  });

  it('should apply dynamic custom cursor when highlight tool is active', async () => {
    activeTool.value = 'highlight';
    toolSettings.value = {
      ...toolSettings.value,
      highlight: { size: 20, color: '#ff0000', opacity: 0.5, mode: 'text' }
    };

    const { container } = render(<PdfPage pageNumber={1} url="mock.pdf" />);
    await waitFor(() => {
      const root = container.firstChild as HTMLElement;
      expect(root.style.cursor).toContain('data:image/svg+xml;base64');
    }, { timeout: 3000 });
  });
});
