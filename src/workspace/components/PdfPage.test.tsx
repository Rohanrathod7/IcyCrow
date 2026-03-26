// @vitest-environment jsdom
import { vi, describe, it, expect } from 'vitest';
import { render, waitFor } from '@testing-library/preact';
import PdfPage from './PdfPage';

// Mock react-pdf
vi.mock('react-pdf', () => ({
  Document: ({ children }: any) => <div className="mock-document">{children}</div>,
  Page: ({ children, onRenderSuccess }: any) => {
    // Immediate call to populate dimensions
    onRenderSuccess?.({ width: 1000, height: 1500 });
    return <div className="mock-page">{children}</div>;
  },
  pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: ''
    }
  }
}));

// Mock overlays
vi.mock('./HighlightOverlay', () => ({
  default: () => <div className="mock-highlight-overlay" style={{ position: 'absolute' }} />
}));

vi.mock('./InkCanvas', () => ({
  default: () => <div className="mock-ink-canvas" style={{ position: 'absolute' }} />
}));

describe('PdfPage (react-pdf Architectural Pivot)', () => {
  it('should implement the 4-Layer Cake architecture with react-pdf', async () => {
    const { container } = render(
      <div className="mock-document">
        <PdfPage fileUrl="test.pdf" pageNumber={1} />
      </div>
    );

    // 1. Container Check
    const root = container.firstChild as HTMLElement;
    expect(root.classList.contains('pdf-page-container')).toBe(true);
    expect(root.style.position).toBe('relative');

    // 2. Document & Page Check
    expect(container.querySelector('.mock-document')).toBeTruthy();
    expect(container.querySelector('.mock-page')).toBeTruthy();

    await waitFor(() => {
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
});
