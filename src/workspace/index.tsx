import { render } from 'preact';
import { useMemo, useState, useEffect } from 'preact/hooks';
import { Document, pdfjs } from 'react-pdf';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PdfPage } from './components/PdfPage';
import { WorkspaceSidebar } from './components/WorkspaceSidebar';
import { ToolbarManager } from './components/ToolbarManager';
import { ToolCustomizer } from './components/ToolCustomizer';
import { ToolLibraryPicker } from './components/ToolLibraryPicker';
import { ToolbarSettingsModal } from './components/ToolbarSettingsModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTextSelection } from './hooks/useTextSelection';
import { AiActionBar } from './components/AiActionBar';
import { getPdfFromCache, savePdfToCache } from '../lib/idb-store';
import { 
  viewerScale, 
  pdfRotation, 
  pageLayoutMode, 
  currentPage, 
  isSearchOpen, 
  searchQuery, 
  searchResults, 
  searchIndex,
  autoSaveFileHandle,
  originalPdfBlob
} from './store/viewer-state';
import { isToolbarSettingsOpen, toolbarPosition } from './store/toolbar-state';
import { isSidebarOpen as isRightSidebarOpen } from './store/ui-state';
import { exportAnnotatedPdf, downloadBlob } from './services/PdfExportService';
import { saveToHandle } from './services/StateSyncService';
import { highlights, strokes, stickyNotes, callouts, persistAnnotations } from './store/annotation-state';
import { 
  Search as SearchIcon, 
  Maximize as MaximizeIcon, 
  Minimize as MinimizeIcon, 
  Printer as PrinterIcon, 
  Save as SaveIcon, 
  Download as DownloadIcon, 
  Settings as SettingsIcon,
  X as XIcon,
  ChevronUp,
  ChevronDown
} from 'lucide-preact';
import { showSyncToast, SyncToast } from './components/SyncToast';
// Inject Professional Styles
import './index.css';

// Configure PDF.js worker for Vite
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

async function resolveDestination(pdf: any, dest: any): Promise<number | null> {
  try {
    if (typeof dest === 'string') {
      const explicitDest = await pdf.getDestination(dest);
      if (explicitDest && explicitDest.length > 0) {
        return resolveDestination(pdf, explicitDest);
      }
    } else if (Array.isArray(dest)) {
      const destRef = dest[0];
      if (destRef && typeof destRef === 'object') {
        const pageIdx = await pdf.getPageIndex(destRef);
        return pageIdx + 1; // 1-based page number
      }
    }
  } catch (e) {
    console.error('Error resolving outline destination:', e);
  }
  return null;
}

function WorkspaceApp() {
  const fileUrl = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('url') || params.get('file');
  }, []);

  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'outline' | 'thumbnails'>('outline');
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [outline, setOutline] = useState<any[]>([]);

  useEffect(() => {
    if (!pdfDoc) {
      setOutline([]);
      return;
    }

    const loadOutline = async () => {
      try {
        const rawOutline = await pdfDoc.getOutline();
        
        const resolveOutlineItems = async (items: any[]): Promise<any[]> => {
          return Promise.all(items.map(async (item) => {
            let pageNum: number | null = null;
            if (item.dest) {
              pageNum = await resolveDestination(pdfDoc, item.dest);
            }
            
            const resolvedChildren = item.items && item.items.length > 0 
              ? await resolveOutlineItems(item.items)
              : [];
              
            return {
              title: item.title,
              pageNumber: pageNum,
              items: resolvedChildren
            };
          }));
        };

        if (rawOutline && rawOutline.length > 0) {
          const resolved = await resolveOutlineItems(rawOutline);
          setOutline(resolved);
        } else {
          setOutline([]);
        }
      } catch (err) {
        console.error('[IcyCrow] Outline parsing failed:', err);
        setOutline([]);
      }
    };

    loadOutline();
  }, [pdfDoc]);

  const handlePageJump = (pageNumber: number) => {
    const el = document.querySelector(`[data-testid="pdf-page-${pageNumber}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      currentPage.value = pageNumber;
    }
  };

  const handlePageInputKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLInputElement;
      const val = parseInt(target.value, 10);
      if (!isNaN(val) && val >= 1 && val <= numPages) {
        handlePageJump(val);
      } else {
        target.value = currentPage.value.toString();
      }
      target.blur();
    }
  };

  const handleFitWidth = async () => {
    if (!pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 1.0 });
      const workspace = document.querySelector('.pdf-workspace-bg');
      const width = workspace ? workspace.clientWidth : window.innerWidth;
      const targetScale = (width - 80) / viewport.width;
      viewerScale.value = parseFloat(Math.min(Math.max(targetScale, 0.3), 4.0).toFixed(2));
    } catch (e) {
      console.error('Fit to width error:', e);
    }
  };

  const handleFitPage = async () => {
    if (!pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 1.0 });
      const workspace = document.querySelector('.pdf-workspace-bg');
      const width = workspace ? workspace.clientWidth : window.innerWidth;
      const height = workspace ? workspace.clientHeight : window.innerHeight;
      const scaleW = (width - 80) / viewport.width;
      const scaleH = (height - 80) / viewport.height;
      const targetScale = Math.min(scaleW, scaleH);
      viewerScale.value = parseFloat(Math.min(Math.max(targetScale, 0.3), 4.0).toFixed(2));
    } catch (e) {
      console.error('Fit to page error:', e);
    }
  };

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

  const onDocumentLoadSuccess = (pdf: any) => {
    setNumPages(pdf.numPages);
    setPdfDoc(pdf);
  };

  const [isExporting, setIsExporting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleSave = async () => {
    if (!fileUrl) return;
    setIsLoading(true);
    try {
      await persistAnnotations(fileUrl);
      if (autoSaveFileHandle.value) {
        const payload = {
          version: '1.0',
          documentUrl: fileUrl,
          pageCount: numPages,
          highlights: highlights.value,
          strokes: strokes.value,
          stickyNotes: stickyNotes.value,
          callouts: callouts.value,
          exportedAt: new Date().toISOString()
        };
        const success = await saveToHandle(autoSaveFileHandle.value, payload);
        if (success) {
          showSyncToast("Workspace saved to file!", "success");
        } else {
          showSyncToast("Auto-save failed.", "error");
        }
      } else {
        showSyncToast("Saved to browser cache successfully!", "success");
      }
    } catch (e) {
      console.error(e);
      showSyncToast("Failed to save workspace", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAs = async () => {
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
      showSyncToast("PDF exported successfully!", "success");
    } catch (err) {
      console.error('Export failed:', err);
      showSyncToast("Export failed.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleFullScreen = () => {
    const container = document.querySelector('.pdf-workspace-bg');
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error('Error enabling fullscreen:', err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false));
    }
  };

  const handleSearchChange = (val: string) => {
    searchQuery.value = val;
    triggerSearch(val);
  };

  const triggerSearch = async (query: string) => {
    if (!pdfDoc || !query.trim()) {
      searchResults.value = [];
      searchIndex.value = -1;
      return;
    }
    try {
      const results: number[] = [];
      const normalizedQuery = query.toLowerCase().trim();
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ').toLowerCase();
        if (pageText.includes(normalizedQuery)) {
          results.push(i);
        }
      }
      searchResults.value = results;
      if (results.length > 0) {
        searchIndex.value = 0;
        handlePageJump(results[0]);
      } else {
        searchIndex.value = -1;
      }
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleNextSearch = () => {
    if (searchResults.value.length === 0) return;
    const nextIdx = (searchIndex.value + 1) % searchResults.value.length;
    searchIndex.value = nextIdx;
    handlePageJump(searchResults.value[nextIdx]);
  };

  const handlePrevSearch = () => {
    if (searchResults.value.length === 0) return;
    const prevIdx = (searchIndex.value - 1 + searchResults.value.length) % searchResults.value.length;
    searchIndex.value = prevIdx;
    handlePageJump(searchResults.value[prevIdx]);
  };

  // Keyboard and Global Custom Event Binding
  useEffect(() => {
    const onSave = () => handleSave();
    const onSaveAs = () => handleSaveAs();
    const onPrint = () => handlePrint();

    window.addEventListener('workspace-save', onSave);
    window.addEventListener('workspace-save-as', onSaveAs);
    window.addEventListener('workspace-print', onPrint);

    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      window.removeEventListener('workspace-save', onSave);
      window.removeEventListener('workspace-save-as', onSaveAs);
      window.removeEventListener('workspace-print', onPrint);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [pdfDoc, numPages, fileUrl, isExporting]);

  useEffect(() => {
    if (isSearchOpen.value) {
      setTimeout(() => {
        const input = document.querySelector('.search-input') as HTMLInputElement | null;
        if (input) input.focus();
      }, 100);
    }
  }, [isSearchOpen.value]);

  useEffect(() => {
    const query = searchQuery.value;
    if (!query || !pdfDoc) {
      const marks = document.querySelectorAll('mark.search-match');
      marks.forEach(mark => {
        const parent = mark.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
          parent.normalize();
        }
      });
      return;
    }

    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapeRegExp(query), 'gi');

    const highlightNode = (node: Node, pageNum: number, collector: HTMLElement[]) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue || '';
        const match = text.match(regex);
        if (match && match.index !== undefined && match[0].length > 0) {
          const parent = node.parentNode;
          if (parent && parent.nodeName !== 'MARK') {
            const matchText = match[0];
            const prefix = text.slice(0, match.index);
            const suffix = text.slice(match.index + matchText.length);

            const prefixNode = document.createTextNode(prefix);
            const markNode = document.createElement('mark');
            markNode.className = 'search-match';
            markNode.textContent = matchText;
            const suffixNode = document.createTextNode(suffix);

            parent.replaceChild(suffixNode, node);
            parent.insertBefore(markNode, suffixNode);
            parent.insertBefore(prefixNode, markNode);

            collector.push(markNode);

            highlightNode(suffixNode, pageNum, collector);
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE' && node.nodeName !== 'MARK') {
        const children = Array.from(node.childNodes);
        children.forEach(child => highlightNode(child, pageNum, collector));
      }
    };

    const applyHighlights = () => {
      const marks = document.querySelectorAll('mark.search-match');
      marks.forEach(mark => {
        const parent = mark.parentNode;
        if (parent) {
          parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
          parent.normalize();
        }
      });

      const textLayers = document.querySelectorAll('.textLayer');
      textLayers.forEach(layer => {
        const pageEl = layer.closest('[data-testid^="pdf-page-"]');
        if (pageEl) {
          const pageId = pageEl.getAttribute('data-testid');
          if (pageId) {
            const pageNum = parseInt(pageId.replace('pdf-page-', ''), 10);
            const collector: HTMLElement[] = [];
            highlightNode(layer, pageNum, collector);

            if (pageNum === currentPage.value) {
              collector.forEach(el => el.classList.add('search-match-active'));
            }
          }
        }
      });
    };

    applyHighlights();

    const workspace = document.querySelector('.pdf-document-wrapper');
    if (!workspace) return;

    const observer = new MutationObserver((mutations) => {
      let shouldHighlight = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of Array.from(mutation.addedNodes)) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              if (el.classList.contains('textLayer') || el.querySelector('.textLayer')) {
                shouldHighlight = true;
                break;
              }
            }
          }
        }
        if (shouldHighlight) break;
      }

      if (shouldHighlight) {
        observer.disconnect();
        applyHighlights();
        observer.observe(workspace, { childList: true, subtree: true });
      }
    });

    observer.observe(workspace, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [searchQuery.value, currentPage.value, pdfDoc]);

  // Mount keyboard shortcuts (Epic S30)
  useKeyboardShortcuts();
  
  // Mount AI text selection listener (Epic S31)
  useTextSelection();

  // Touchpad & Mouse Wheel Zooming
  useEffect(() => {
    const container = document.querySelector('.pdf-workspace-bg') as HTMLElement | null;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const zoomFactor = 0.03;
        const direction = e.deltaY < 0 ? 1 : -1;
        const newScale = Math.min(Math.max(viewerScale.value + direction * zoomFactor, 0.3), 4.0);
        viewerScale.value = parseFloat(newScale.toFixed(2));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Active Page Detection
  useEffect(() => {
    if (!pdfBlob || numPages === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageIdStr = entry.target.getAttribute('data-testid');
            if (pageIdStr) {
              const pageNum = parseInt(pageIdStr.replace('pdf-page-', ''), 10);
              if (!isNaN(pageNum)) {
                currentPage.value = pageNum;
              }
            }
          }
        });
      },
      {
        root: document.querySelector('.pdf-workspace-bg'),
        rootMargin: '-50% 0px -50% 0px', // Center line threshold
        threshold: 0
      }
    );

    const timer = setTimeout(() => {
      const pageElements = document.querySelectorAll('[data-testid^="pdf-page-"]');
      pageElements.forEach((el) => observer.observe(el));
    }, 500);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [pdfBlob, numPages, pageLayoutMode.value]);

  const renderSinglePages = () => {
    return Array.from({ length: numPages }, (_, index) => (
      <PdfPage 
        key={`single-${index}`}
        url={fileUrl!} 
        pageNumber={index + 1}
      />
    ));
  };

  const renderDoublePages = () => {
    const rows = [];
    for (let i = 1; i <= numPages; i += 2) {
      rows.push(
        <div key={`row-${i}`} className="pdf-page-row" style={{ display: 'flex', gap: '32px', justifyContent: 'center' }}>
          <PdfPage url={fileUrl!} pageNumber={i} />
          {i + 1 <= numPages && <PdfPage url={fileUrl!} pageNumber={i + 1} />}
        </div>
      );
    }
    return rows;
  };

  return (
    <div className="pdf-workspace-bg">
      {/* Floating Control Bar */}
      <div className="top-control-bar">
        {/* Page Navigator */}
        <div className="control-group">
          <button 
            className="control-btn"
            onClick={() => handlePageJump(Math.max(currentPage.value - 1, 1))}
            disabled={currentPage.value <= 1}
            title="Previous Page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          
          <div className="page-indicator">
            <input 
              type="text" 
              className="page-num-input"
              value={currentPage.value}
              onKeyDown={handlePageInputKeyDown}
              onFocus={(e) => (e.target as HTMLInputElement).select()}
              title="Enter page number and press Enter"
            />
            <span className="page-total">of {numPages || 1}</span>
          </div>

          <button 
            className="control-btn"
            onClick={() => handlePageJump(Math.min(currentPage.value + 1, numPages))}
            disabled={currentPage.value >= numPages}
            title="Next Page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div className="control-divider" />

        {/* Zoom Controls */}
        <div className="control-group">
          <button 
            className="control-btn"
            onClick={() => viewerScale.value = parseFloat(Math.max(viewerScale.value - 0.1, 0.3).toFixed(2))}
            disabled={viewerScale.value <= 0.3}
            title="Zoom Out"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <span className="zoom-text">{Math.round(viewerScale.value * 100)}%</span>

          <button 
            className="control-btn"
            onClick={() => viewerScale.value = parseFloat(Math.min(viewerScale.value + 0.1, 4.0).toFixed(2))}
            disabled={viewerScale.value >= 4.0}
            title="Zoom In"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <button 
            className="control-btn"
            onClick={handleFitWidth}
            title="Fit to Page Width"
            style={{ fontSize: '11px', fontWeight: 600, padding: '0 6px', borderRadius: '6px' }}
          >
            ↔
          </button>
          
          <button 
            className="control-btn"
            onClick={handleFitPage}
            title="Fit to Page Screen"
            style={{ fontSize: '11px', fontWeight: 600, padding: '0 6px', borderRadius: '6px' }}
          >
            ↕
          </button>
        </div>

        <div className="control-divider" />

        {/* Layout & Rotation Controls */}
        <div className="control-group">
          <button 
            className={`control-btn ${pageLayoutMode.value === 'double' ? 'active' : ''}`}
            onClick={() => pageLayoutMode.value = pageLayoutMode.value === 'single' ? 'double' : 'single'}
            title={pageLayoutMode.value === 'double' ? "Switch to Single Page View" : "Switch to Double Page View"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              {pageLayoutMode.value === 'double' ? (
                <>
                  <rect x="3" y="3" width="8" height="18" rx="1" />
                  <rect x="13" y="3" width="8" height="18" rx="1" />
                </>
              ) : (
                <rect x="4" y="3" width="16" height="18" rx="2" />
              )}
            </svg>
          </button>

          <button 
            className="control-btn"
            onClick={() => pdfRotation.value = (pdfRotation.value + 90) % 360}
            title="Rotate Page Clockwise"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>
      </div>

      {/* Header with Sidebar Toggle Button */}
      <header style={{ 
        position: 'fixed',
        top: '20px',
        left: isSidebarOpen ? '324px' : '24px',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        transition: 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="sidebar-toggle-btn"
          title="Toggle Sidebar"
          style={{
            background: 'rgba(28, 28, 30, 0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            borderRadius: '8px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
          </svg>
        </button>
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
            {pageLayoutMode.value === 'double' ? renderDoublePages() : renderSinglePages()}
          </div>
          <WorkspaceSidebar 
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            tab={sidebarTab}
            onTabChange={setSidebarTab}
            outline={outline}
            numPages={numPages}
            onJump={handlePageJump}
          />
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
      <AiActionBar />

      {/* Search Overlay Panel */}
      {isSearchOpen.value && (
        <div className="search-bar-panel">
          <div className="search-bar-inner">
            <SearchIcon size={16} className="search-panel-icon" />
            <input
              type="text"
              placeholder="Search document..."
              className="search-input"
              value={searchQuery.value}
              onInput={(e) => handleSearchChange((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (e.shiftKey) {
                    handlePrevSearch();
                  } else {
                    handleNextSearch();
                  }
                }
              }}
            />
            {searchQuery.value && (
              <span className="search-results-count">
                {searchResults.value.length > 0
                  ? `${searchIndex.value + 1} of ${searchResults.value.length}`
                  : '0 results'}
              </span>
            )}
            <div className="search-divider" />
            <button
              onClick={handlePrevSearch}
              disabled={searchResults.value.length === 0}
              className="search-nav-btn"
              title="Previous Match (Shift+Enter)"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={handleNextSearch}
              disabled={searchResults.value.length === 0}
              className="search-nav-btn"
              title="Next Match (Enter)"
            >
              <ChevronDown size={16} />
            </button>
            <button
              onClick={() => {
                isSearchOpen.value = false;
                searchQuery.value = '';
                searchResults.value = [];
                searchIndex.value = -1;
              }}
              className="search-close-btn"
              title="Close Search (Esc)"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Upper-Right Utility Bar */}
      <div 
        className="top-right-utility-bar"
        style={{
          right: `${
            (isRightSidebarOpen.value ? 320 : 0) + 
            (toolbarPosition.value === 'right' ? 100 : 20)
          }px`,
          transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <button
          className={`control-btn ${isSearchOpen.value ? 'active' : ''}`}
          onClick={() => isSearchOpen.value = !isSearchOpen.value}
          title="Find in document (Ctrl+F)"
        >
          <SearchIcon size={16} />
        </button>
        
        <button
          className={`control-btn ${isFullscreen ? 'active' : ''}`}
          onClick={toggleFullScreen}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
        >
          {isFullscreen ? <MinimizeIcon size={16} /> : <MaximizeIcon size={16} />}
        </button>

        <button
          className="control-btn"
          onClick={handlePrint}
          title="Print document (Ctrl+P)"
        >
          <PrinterIcon size={16} />
        </button>

        <div className="control-divider" />

        <button
          className="control-btn"
          onClick={handleSave}
          title="Save annotations (Ctrl+S)"
        >
          <SaveIcon size={16} />
        </button>

        <button
          className="control-btn"
          onClick={handleSaveAs}
          disabled={isExporting}
          title="Save As / Export Annotated PDF (Ctrl+Shift+S)"
        >
          <DownloadIcon size={16} />
        </button>

        <div className="control-divider" />

        <button
          className={`control-btn ${isToolbarSettingsOpen.value ? 'active' : ''}`}
          onClick={() => isToolbarSettingsOpen.value = !isToolbarSettingsOpen.value}
          title="Settings & Preferences"
        >
          <SettingsIcon size={16} />
        </button>
      </div>
      <SyncToast />
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  render(<WorkspaceApp />, root);
}
