import { useState } from 'preact/hooks';
import { Page, pdfjs } from 'react-pdf';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { HighlightOverlay } from '../renderer/HighlightOverlay';
import { InkCanvas } from '../renderer/InkCanvas';
import { viewerScale } from '../store/viewer-state';

// Standard react-pdf styles
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure the worker explicitly for Vite/MV3
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfPageProps {
  fileUrl: string;
  pageNumber: number;
}

export default function PdfPage({ fileUrl, pageNumber }: PdfPageProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const onRenderSuccess = (page: any) => {
    // react-pdf already handles scaling internally, but we need the raw width/height for overlays
    setDimensions({ width: page.width, height: page.height });
  };

  return (
    <div className="pdf-page-container" style={{ position: 'relative', display: 'inline-block' }}>
      <Page 
        pageNumber={pageNumber} 
        renderTextLayer={true} 
        renderAnnotationLayer={false} 
        devicePixelRatio={window.devicePixelRatio || 1}
        onRenderSuccess={onRenderSuccess}
        className="pdf-artboard"
        scale={viewerScale.value}
      >
        {dimensions.width > 0 && (
          <>
            {/* Layer 2: Spatial Highlights */}
            <HighlightOverlay 
              width={dimensions.width} 
              height={dimensions.height} 
              fileUrl={fileUrl} 
              pageNumber={pageNumber} 
            />
            
            {/* Layer 4: Tactile Ink */}
            <InkCanvas 
              width={dimensions.width} 
              height={dimensions.height} 
              fileUrl={fileUrl} 
              pageNumber={pageNumber} 
            />
          </>
        )}
      </Page>
    </div>
  );
}
