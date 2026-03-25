import { useRef, useEffect } from 'preact/hooks';
import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker for Vite
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface PdfViewerProps {
  fileUrl: string | null;
  onLoad?: (page: pdfjs.PDFPageProxy) => void;
}

export function PdfViewer({ fileUrl, onLoad }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fileUrl || !canvasRef.current) return;

    const loadPdf = async () => {
      try {
        const loadingTask = pdfjs.getDocument(fileUrl);
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current!;
        const context = canvas.getContext('2d')!;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          // Support for older or newer pdfjs-dist versions that might require the element
          canvas: canvas
        };

        await page.render(renderContext).promise;
        if (onLoad) onLoad(page);
      } catch (err) {
        console.error('[IcyCrow] Failed to load PDF:', err);
      }
    };

    loadPdf();
  }, [fileUrl]);

  return (
    <div style={{ position: 'relative', background: '#333', padding: '20px', display: 'flex', justifyContent: 'center' }}>
      <canvas ref={canvasRef} style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
    </div>
  );
}
