import { useRef, useEffect, useState } from 'preact/hooks';
import * as pdfjs from 'pdfjs-dist';
import { InkCanvas } from './InkCanvas';
import { HighlightOverlay } from './HighlightOverlay';

interface SpatialPageProps {
  pdf: pdfjs.PDFDocumentProxy;
  pageNumber: number;
  fileUrl: string | null;
}

import { getNormalizedRects } from '../../lib/spatial-engine/coordinates';
import { saveSpatialAnnotation } from '../../lib/storage';
import { activeTool } from '../state';

export function SpatialPage({ pdf, pageNumber, fileUrl }: SpatialPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [pageDim, setPageDim] = useState({ width: 0, height: 0 });
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    }, { threshold: 0.05 });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleCaptureHighlight = async () => {
    if (activeTool.value !== 'highlight-text' || !fileUrl || !containerRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const interactionStack = containerRef.current.querySelector('.spatial-interaction-stack') as HTMLElement;
    if (!interactionStack) return;

    const rects = getNormalizedRects(selection, interactionStack, pageDim.width, pageDim.height);
    if (rects.length === 0) return;

    await saveSpatialAnnotation(fileUrl, {
      kind: 'spatial-highlight',
      pageNumber,
      rects,
      color: 'rgba(255, 235, 59, 0.4)'
    }, 'spatial-highlight');

    selection.removeAllRanges();
    // Notify overlay to reload
    window.dispatchEvent(new CustomEvent('REFRESH_HIGHLIGHTS'));
  };

  useEffect(() => {
    if (!isVisible || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1.3 });
        
        setPageDim({ width: viewport.width, height: viewport.height });

        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        renderTaskRef.current = page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        });

        await renderTaskRef.current.promise;

        if (textLayerRef.current) {
          textLayerRef.current.innerHTML = '';
          const textContent = await page.getTextContent();
          
          // Set required scale factor for PDF.js text layer alignment
          textLayerRef.current.style.setProperty('--scale-factor', viewport.scale.toString());
          
          const textLayer = new (pdfjs as any).TextLayer({
            textContentSource: textContent,
            container: textLayerRef.current,
            viewport: viewport,
          });
          await textLayer.render();
        }
      } catch (err) {
        console.error(`[IcyCrow] Failed to render page ${pageNumber}:`, err);
      }
    };

    renderPage();
  }, [isVisible, pdf, pageNumber]);

  return (
    <div 
      ref={containerRef}
      className="spatial-page-container"
      onPointerUp={handleCaptureHighlight}
      style={{
        position: 'relative',
        width: pageDim.width > 0 ? `${pageDim.width}px` : '900px',
        height: pageDim.height > 0 ? `${pageDim.height}px` : '1200px',
        margin: '0 auto 60px auto',
        backgroundColor: 'white',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        borderRadius: '4px',
        overflow: 'visible', // Don't clip text layer or selection handles
        userSelect: 'text' // Allow anchoring everywhere on the page
      }}
    >
      <div 
        className="spatial-interaction-stack"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${pageDim.width + 100}px`, // 100px safety buffer on the right
          height: `${pageDim.height}px`,
          overflow: 'visible' 
        }}
      >
        <canvas 
          ref={canvasRef} 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${pageDim.width}px`,
            height: `${pageDim.height}px`,
            zIndex: 1,
            pointerEvents: 'none'
          }} 
        />

      <div 
        ref={textLayerRef} 
        className="textLayer" 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${pageDim.width + 100}px`,
          height: `${pageDim.height}px`,
          zIndex: 50,
          userSelect: 'text',
          '--scale-factor': '1.3' as any
        }} 
      />
      
      {isVisible && pageDim.width > 0 && (
        <>
          <HighlightOverlay 
            width={pageDim.width} 
            height={pageDim.height} 
            fileUrl={fileUrl} 
            pageNumber={pageNumber} 
          />
          <InkCanvas 
            width={pageDim.width} 
            height={pageDim.height} 
            fileUrl={fileUrl} 
            pageNumber={pageNumber} 
          />
        </>
      )}
      </div>

      {/* Page Badge: Outside the interaction stack to prevent offset inheritance */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '-40px',
        transform: 'rotate(45deg)',
        background: 'rgba(99, 102, 241, 0.9)',
        color: '#fff',
        padding: '4px 40px',
        fontSize: '0.7rem',
        fontWeight: 700,
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
        zIndex: 100,
        pointerEvents: 'none',
        textTransform: 'uppercase',
        letterSpacing: '0.1em'
      }}>
        P. {pageNumber}
      </div>
    </div>
  );
}
