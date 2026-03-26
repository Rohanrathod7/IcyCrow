import { useRef, useEffect, useState } from 'preact/hooks';
import * as pdfjs from 'pdfjs-dist';
import './text-layer.css';
import 'pdfjs-dist/web/pdf_viewer.css'; // Standard PDF.js styles

interface PageRendererProps {
  pdf: pdfjs.PDFDocumentProxy;
  pageNumber: number;
}

export default function({ pdf, pageNumber }: PageRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [viewport, setViewport] = useState<any>(null);
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    }, { threshold: 0.1 });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        const vp = page.getViewport({ scale: 1.3 });
        setViewport(vp);

        const outputScale = window.devicePixelRatio || 1;
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;

        // 1. Internal resolution should be scaled for High-DPI displays
        canvas.width = vp.width * outputScale;
        canvas.height = vp.height * outputScale;

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        renderTaskRef.current = page.render({
          canvasContext: context,
          viewport: vp, // Path Parity Part 1
          canvas: canvas,
          transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined
        });

        await renderTaskRef.current.promise;

        if (textLayerRef.current) {
          // Mozilla Strict Rule: Always clear before re-rendering to prevent drift
          textLayerRef.current.innerHTML = '';
          const textContent = await page.getTextContent();
          
          // Use the native renderTextLayer pipeline as requested
          const textLayer = new (pdfjs as any).TextLayer({
            textContentSource: textContent,
            container: textLayerRef.current,
            viewport: vp,
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
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .textLayer {
            position: absolute;
            text-align: initial;
            left: 0;
            top: 0;
            right: 0;
            bottom: 0;
            overflow: hidden;
            opacity: 0.2; /* Debug mode */
            line-height: 1.0;
            text-size-adjust: none;
            forced-color-adjust: none;
            transform-origin: 0 0;
            z-index: 2;
        }
        .textLayer span, .textLayer br {
            color: transparent !important;
            position: absolute !important;
            white-space: pre !important;
            cursor: text !important;
            transform-origin: 0% 0% !important;
            margin: 0 !important;
            padding: 0 !important;
        }
      `}} />
      <div 
        ref={containerRef}
        className="page"
        style={{
          position: 'relative',
          width: viewport ? `${viewport.width}px` : '900px',
          height: viewport ? `${viewport.height}px` : '1200px',
          // The Rigid Box Protocol: Prevent layout squishing
          minWidth: viewport ? `${viewport.width}px` : '900px',
          maxWidth: viewport ? `${viewport.width}px` : '900px',
          minHeight: viewport ? `${viewport.height}px` : '1200px',
          maxHeight: viewport ? `${viewport.height}px` : '1200px',
          flexShrink: 0,
          margin: '0 auto 60px auto',
          backgroundColor: 'white',
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
          borderRadius: '4px',
          overflow: 'hidden',
          // Instructon: --scale-factor must be on the PAGE container
          '--scale-factor': viewport?.scale || 1
        } as any}
      >
        <div 
          className="canvasWrapper" 
          style={{ position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}
        >
          <canvas 
            ref={canvasRef} 
            style={{ 
              display: 'block',
              width: '100%', 
              height: '100%', 
              position: 'absolute', 
              top: 0, 
              left: 0,
              margin: 0,
              padding: 0
            }} 
          />
        </div>
        <div 
          ref={textLayerRef} 
          className="textLayer" 
        />
        
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
    </>
  );
}