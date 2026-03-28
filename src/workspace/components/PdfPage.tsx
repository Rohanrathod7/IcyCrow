import { useEffect, useState, useRef } from 'preact/hooks';
import { Page, pdfjs } from 'react-pdf';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { HighlightOverlay } from './HighlightOverlay';
import { InkCanvas } from './InkCanvas';
import { viewerScale, activeTool, toolSettings, originalPdfBlob, pdfUrl } from '../store/viewer-state';
import { 
  highlights, 
  Highlight, 
  initializeAnnotations, 
  persistAnnotations,
  stickyNotes,
  addSticky,
  callouts,
  draftCallout,
  addCallout,
  strokes
} from '../store/annotation-state';
import { exportAnnotatedPdf, downloadBlob } from '../services/PdfExportService';
import { StickyNote } from './StickyNote';
import { CalloutLayer } from './CalloutLayer';
import { CalloutBox } from './CalloutBox';
import { WorkspaceRecommendation } from './WorkspaceRecommendation';

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
  const [isExporting, setIsExporting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Capture original PDF blob for export engine
  useEffect(() => {
    fetch(url)
      .then(res => res.blob())
      .then(blob => {
        originalPdfBlob.value = blob;
      });
  }, [url]);

  const handlePageClick = (e: MouseEvent) => {
    // Only if sticky tool is active
    const tool = activeTool.value as string;
    if (tool !== 'sticky' && !tool.startsWith('sticky')) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scale = viewerScale.value;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const currentSettings = toolSettings.value[tool] || toolSettings.value['sticky'] || { color: '#fbbf24' };

    // Use current tool's color if available in settings, else default
    addSticky(pageNumber, x, y, currentSettings.color || '#fbbf24');
    persistAnnotations(url);
  };

  // Persistence: Load on mount
  useEffect(() => {
    pdfUrl.value = url;
    initializeAnnotations(url);
  }, [url]);

  const onRenderSuccess = (page: { width: number; height: number }) => {
    setDimensions({ width: page.width, height: page.height });
  };

  const handlePointerDown = (e: PointerEvent) => {
    const tool = activeTool.value as string;
    if (tool !== 'callout' && !tool.startsWith('callout')) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scale = viewerScale.value;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    draftCallout.value = {
      anchor: { x, y },
      current: { x, y },
      pageNumber
    };
    
    // Capture pointer to ensure move/up fire even if mouse leaves container
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!draftCallout.value || draftCallout.value.pageNumber !== pageNumber) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const scale = viewerScale.value;

    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    draftCallout.value = {
      ...draftCallout.value,
      current: { x, y }
    };
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (activeTool.value === 'highlight') {
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
      selection.removeAllRanges();
      return;
    }

    // 2. Handle Callout Finalization
    if (draftCallout.value && draftCallout.value.pageNumber === pageNumber) {
      const { anchor, current } = draftCallout.value;
      const dist = Math.sqrt(Math.pow(current.x - anchor.x, 2) + Math.pow(current.y - anchor.y, 2));

      if (dist > 10) {
        const tool = activeTool.value as string;
        const currentSettings = toolSettings.value[tool] || toolSettings.value['callout'] || { color: '#3b82f6' };
        addCallout(pageNumber, anchor, current, currentSettings.color || '#3b82f6');
        persistAnnotations(url);
      }

      draftCallout.value = null;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const handleExport = async () => {
    if (!originalPdfBlob.value || isExporting) return;
    
    setIsExporting(true);
    try {
      const annotations = {
        highlights: highlights.value,
        strokes: strokes.value,
        stickyNotes: stickyNotes.value,
        callouts: callouts.value
      };
      
      const exportedBlob = await exportAnnotatedPdf(originalPdfBlob.value, annotations);
      downloadBlob(exportedBlob, 'Annotated_IcyCrow_Document.pdf');
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div 
      className="pdf-page-container" 
      data-testid={`pdf-page-${pageNumber}`}
      data-url={url}
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handlePageClick}
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
          {/* Export FAB Service (S27) */}
          <button 
            className="export-fab" 
            onClick={handleExport}
            disabled={isExporting}
          >
            <svg 
              className={`export-icon ${isExporting ? 'exporting-spinner' : ''}`} 
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              {isExporting ? (
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              ) : (
                <>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </>
              )}
            </svg>
            {isExporting ? 'Generating...' : 'Export PDF'}
          </button>

          <HighlightOverlay pageNumber={pageNumber} url={url} />
          <InkCanvas pageNumber={pageNumber} url={url} />
          {stickyNotes.value
            .filter(n => n.pageNumber === pageNumber)
            .map(note => <StickyNote key={note.id} note={note} url={url} />)
          }
          <CalloutLayer pageNumber={pageNumber} />
          {callouts.value
            .filter(c => c.pageNumber === pageNumber)
            .map(callout => <CalloutBox key={callout.id} callout={callout} url={url} />)
          }
        </>
      )}
      <WorkspaceRecommendation />
    </div>
  );
}
