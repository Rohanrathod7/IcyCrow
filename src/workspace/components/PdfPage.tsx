import { useEffect, useState, useRef } from 'preact/hooks';
import { Page, pdfjs } from 'react-pdf';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { HighlightOverlay } from './HighlightOverlay';
import { InkCanvas } from './InkCanvas';
import { viewerScale, activeTool } from '../store/viewer-state';
import { highlights, Highlight, initializeAnnotations, persistAnnotations } from '../store/annotation-state';

// Standard react-pdf styles
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure the worker explicitly for Vite/MV3
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfPageProps {
  url: string; // Renamed from fileUrl to match usual usage or test
  pageNumber: number;
}

export function PdfPage({ url, pageNumber }: PdfPageProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Persistence: Load on mount
  useEffect(() => {
    initializeAnnotations(url);
  }, [url]);

  const onRenderSuccess = (page: { width: number; height: number }) => {
    setDimensions({ width: page.width, height: page.height });
  };

  const handlePointerUp = () => {
    if (activeTool.value !== 'highlight') return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const container = containerRef.current;
    if (!container) return;

    const containerBox = container.getBoundingClientRect();
    const range = selection.getRangeAt(0);
    const clientRects = Array.from(range.getClientRects());
    const scale = viewerScale.value;

    if (clientRects.length === 0) return;

    const normalizedRects = clientRects.map(rect => ({
      top: (rect.top - containerBox.top) / scale,
      left: (rect.left - containerBox.left) / scale,
      width: rect.width / scale,
      height: rect.height / scale
    }));

    const newHighlight: Highlight = {
      id: crypto.randomUUID(),
      pageNumber,
      rects: normalizedRects,
      color: 'rgba(255, 255, 0, 0.4)' // Default yellow
    };

    highlights.value = [...highlights.value, newHighlight];
    persistAnnotations(url);

    // Clear native selection
    selection.removeAllRanges();
  };

  return (
    <div 
      className="pdf-page-container" 
      data-testid={`pdf-page-${pageNumber}`}
      data-url={url}
      ref={containerRef}
      onPointerUp={handlePointerUp}
      style={{ 
        position: 'relative', 
        display: 'inline-block'
      }}
    >
      <Page 
        pageNumber={pageNumber} 
        renderTextLayer={true} 
        renderAnnotationLayer={false} 
        devicePixelRatio={window.devicePixelRatio || 1}
        onRenderSuccess={onRenderSuccess}
        className="pdf-artboard"
        scale={viewerScale.value}
      />
      {dimensions.width > 0 && (
        <>
          <HighlightOverlay pageNumber={pageNumber} />
          <InkCanvas pageNumber={pageNumber} url={url} />
        </>
      )}
    </div>
  );
}
