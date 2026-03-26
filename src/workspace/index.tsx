import { render } from 'preact';
import { useMemo, useState, useEffect } from 'preact/hooks';
import { Document, pdfjs } from 'react-pdf';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import PdfPage from './components/PdfPage';
import FloatingToolbar from './components/FloatingToolbar';
import { getPdfFromCache, savePdfToCache } from '../lib/idb-store';
// Inject Professional Styles
import './index.css';

// Configure PDF.js worker for Vite
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function WorkspaceApp() {
  const fileUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('url') || params.get('file');
  }, []);

  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!fileUrl) {
      setIsLoading(false);
      return;
    }

    const loadBuffer = async () => {
      try {
        setIsLoading(true);
        // 1. Try IndexedDB Cache first
        let buffer = await getPdfFromCache(fileUrl);
        
        if (!buffer) {
          // 2. Fetch from network
          console.log('[IcyCrow] Fetching PDF from network...');
          const response = await fetch(fileUrl);
          buffer = await response.arrayBuffer();
          // 3. Save to Cache
          await savePdfToCache(fileUrl, buffer);
        } else {
          console.log('[IcyCrow] Loading PDF from IndexDB cache.');
        }

        // 4. Integrity Check & Direct Blob Passing for CSP compliance
        if (!buffer || buffer.byteLength === 0) {
          throw new Error("Buffer from IDB/Network is empty or corrupted.");
        }

        const blob = new Blob([buffer], { type: 'application/pdf' });
        setPdfBlob(blob);
        console.log(`[PDF Pipeline] Blob created directly. Size: ${blob.size} bytes`);
      } catch (err) {
        console.error('[IcyCrow] PDF Buffer synchronization failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBuffer();
  }, [fileUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  return (
    <div className="pdf-workspace-bg">
      {/* Header (Optional, could be moved to Toolbar) */}
      <header style={{ 
        position: 'absolute',
        top: '20px',
        left: '24px',
        zIndex: 100
      }}>
        <h1 style={{ 
          fontSize: '1rem', 
          fontWeight: 800, 
          letterSpacing: '-0.02em',
          color: 'rgba(255,255,255,0.4)',
          margin: 0
        }}>
          ICYCROW SPATIAL
        </h1>
      </header>

      {isLoading && (
        <div className="loading-overlay">
          <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Loading Workspace...</div>
          <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>Retrieving secure local PDF buffer</div>
        </div>
      )}

      {pdfBlob ? (
        <Document 
          file={pdfBlob} 
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(error: Error) => console.error("[react-pdf Error]:", error)}
        >
          <div className="pdf-document-wrapper">
            {Array.from({ length: numPages }, (_, i) => (
              <PdfPage 
                key={i + 1}
                fileUrl={fileUrl!}
                pageNumber={i + 1}
              />
            ))}
          </div>
        </Document>
      ) : !isLoading && fileUrl ? (
        <div style={{ marginTop: '100px', textAlign: 'center', color: '#ef4444' }}>
          Retrieving secure local PDF failed or buffer empty.
        </div>
      ) : null}

      <FloatingToolbar />
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  render(<WorkspaceApp />, root);
}
