import { render } from 'preact';
import { useMemo, useState, useEffect } from 'preact/hooks';
import { Document, pdfjs } from 'react-pdf';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PdfPage } from './components/PdfPage';
import { ToolbarManager } from './components/ToolbarManager';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { ToolCustomizer } from './components/ToolCustomizer';
import { ToolLibraryPicker } from './components/ToolLibraryPicker';
import { ToolbarSettingsModal } from './components/ToolbarSettingsModal';
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

    const controller = new AbortController();
    const { signal } = controller;

    const loadBuffer = async () => {
      try {
        setIsLoading(true);
        // 1. Try IndexedDB Cache first
        let buffer = await getPdfFromCache(fileUrl);
        
        if (!buffer) {
          // 2. Fetch from network
          console.log('[IcyCrow] Fetching PDF from network...');
          const response = await fetch(fileUrl, { signal });
          buffer = await response.arrayBuffer();
          // 3. Save to Cache
          await savePdfToCache(fileUrl, buffer);
        } else {
          console.log('[IcyCrow] Loading PDF from IndexDB cache.');
        }

        if (signal.aborted) return;

        // 4. Integrity Check & Direct Blob Passing for CSP compliance
        if (!buffer || buffer.byteLength === 0) {
          throw new Error("Buffer from IDB/Network is empty or corrupted.");
        }

        const blob = new Blob([buffer], { type: 'application/pdf' });
        setPdfBlob(blob);
        console.log(`[PDF Pipeline] Blob created directly. Size: ${blob.size} bytes`);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('[IcyCrow] PDF Buffer synchronization failed:', err);
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadBuffer();
    return () => controller.abort();
  }, [fileUrl]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  // Mount keyboard shortcuts (Epic S30)
  useKeyboardShortcuts();

  return (
    <div className="workspace-container">
      <ToolbarManager />
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
            {Array.from({ length: numPages }, (_, index) => (
              <PdfPage 
                key={index}
                url={fileUrl!} // Changed fileUrl to url, kept original value
                pageNumber={index + 1}
              />
            ))}
          </div>
        </Document>
      ) : !isLoading && fileUrl ? (
        <div style={{ marginTop: '100px', textAlign: 'center', color: '#ef4444' }}>
          Retrieving secure local PDF failed or buffer empty.
        </div>
      ) : null}

      <ToolbarManager />
      <ToolCustomizer />
      <ToolLibraryPicker />
      <ToolbarSettingsModal />
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  render(<WorkspaceApp />, root);
}
