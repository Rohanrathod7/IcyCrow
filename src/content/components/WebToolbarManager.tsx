import { useState, useEffect } from 'preact/hooks';
import { EdgeToolbar } from '../../workspace/components/EdgeToolbar';
import { ToolCustomizer } from '../../workspace/components/ToolCustomizer';
import { ToolLibraryPicker } from '../../workspace/components/ToolLibraryPicker';
import { toolbarPosition, isToolPickerOpen } from '../../workspace/store/toolbar-state';
import { activeTool, activeCustomizationTool } from '../../workspace/store/viewer-state';
import { Download, Upload, Layers, HardDrive } from 'lucide-preact';
import { webStrokes, webTextAnnotations, webStickyNotes, webCallouts, webFlashcardNotes, webHighlights, isWebSidebarOpen, linkLocalFile, webLinkedFileHandle, webLinkedFileName, webSyncStatus, requestFilePermission } from '../store/web-annotation-state';
import { saveWorkspaceHandle } from '../../lib/idb-store';
import { WebAnnotationsSidebar } from './WebAnnotationsSidebar';
import { sha256Hash, canonicalUrl } from '../../lib/url-utils';
import type { WebAnnotationDocument, SHA256Hash } from '../../lib/types';
import { useKeyboardShortcuts } from '../../workspace/hooks/useKeyboardShortcuts';

export const WebToolbarManager = () => {
  useKeyboardShortcuts();
  const [isHovered, setIsHovered] = useState(false);
  const isPanelOpen = isToolPickerOpen.value || !!activeCustomizationTool.value;
  const showSidebar = isHovered || isPanelOpen;

  useEffect(() => {
    // Force toolbar to right for web pages
    toolbarPosition.value = 'right';
    // Default to select/cursor so we don't start drawing accidentally
    activeTool.value = 'select' as any;
  }, []);

  const handleExport = async () => {
    try {
      const hash = (await sha256Hash(canonicalUrl(window.location.href))) as SHA256Hash;
      const doc: WebAnnotationDocument & { highlights?: any[] } = {
        urlHash: hash,
        strokes: webStrokes.value,
        textAnnotations: webTextAnnotations.value,
        stickyNotes: webStickyNotes.value,
        callouts: webCallouts.value,
        flashcardNotes: webFlashcardNotes.value,
        highlights: webHighlights.value,
        lastUpdated: new Date().toISOString() as any
      };

      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `icycrow-annotations-${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`,
        types: [{
          description: 'IcyCrow Annotation JSON',
          accept: { 'application/json': ['.json'] },
        }]
      });

      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(doc, null, 2));
      await writable.close();

      // Automatically link it!
      webLinkedFileHandle.value = handle;
      webLinkedFileName.value = handle.name;
      webSyncStatus.value = 'idle';
      await saveWorkspaceHandle(hash, handle, handle.name);

      alert('Exported and Linked successfully!');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('[IcyCrow] Export failed:', err);
        alert('Failed to export file.');
      }
    }
  };

  const handleImport = async () => {
    await linkLocalFile();
  };

  return (
    <>
      {/* These modals must sit at the root to avoid transform clipping. We wrap them in a container with a very high z-index so they sit ABOVE the WebInkCanvas (which is 2147483645). */}
      <div style={{ position: 'fixed', zIndex: 2147483648, top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto' }}>
          <ToolCustomizer />
          <ToolLibraryPicker />
          <WebAnnotationsSidebar />
        </div>
      </div>

      <style>{`
        /* Force EdgeToolbar to participate in Flexbox layout inside the sidebar */
        .web-toolbar-override-wrapper > div:first-child {
          position: relative !important;
          top: auto !important;
          bottom: auto !important;
          left: auto !important;
          right: auto !important;
          transform: none !important;
          margin-bottom: 24px;
        }
      `}</style>

      {/* The sliding sidebar container */}
      <div 
        className="icycrow-ui-element"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '80px',
          height: '100vh',
          zIndex: 2147483647,
          transform: `translateX(${showSidebar ? '0' : '100%'})`,
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 0',
          boxSizing: 'border-box'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Visual cue when collapsed (the little frosted edge) that sits just outside the container to the left */}
        <div style={{
          position: 'absolute',
          left: '-10px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '10px',
          height: '100px',
          background: 'rgba(255,255,255,0.2)',
          borderTopLeftRadius: '12px',
          borderBottomLeftRadius: '12px',
          backdropFilter: 'blur(10px)',
          boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
          opacity: showSidebar ? 0 : 1,
          transition: 'opacity 0.2s',
          cursor: 'pointer'
        }} />

        {/* EdgeToolbar positions itself absolute, but we force it to center via CSS above */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="web-toolbar-override-wrapper">
            <EdgeToolbar />
          </div>
        </div>

        {/* Action Buttons (Export, Import, Layers) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '24px' }}>
            <div 
              role="button"
              onClick={handleExport}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(28, 28, 30, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                transition: 'background 0.2s, transform 0.1s',
                boxSizing: 'border-box'
              }}
              title="Export Annotations"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(28, 28, 30, 0.95)'; (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              <Download size={20} />
            </div>
            
            <div 
              role="button"
              onClick={handleImport}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(28, 28, 30, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                transition: 'background 0.2s, transform 0.1s',
                boxSizing: 'border-box'
              }}
              title="Import Annotations"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(28, 28, 30, 0.95)'; (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              <Upload size={20} />
            </div>

            <div 
              role="button"
              onClick={() => isWebSidebarOpen.value = !isWebSidebarOpen.value}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(28, 28, 30, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                transition: 'background 0.2s, transform 0.1s',
                boxSizing: 'border-box'
              }}
              title="Toggle Annotations Sidebar"
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(28, 28, 30, 0.95)'; (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              <Layers size={20} />
            </div>

            {/* Sync Button */}
            <div 
              role="button"
              onClick={() => {
                if (webSyncStatus.value === 'permission-needed') {
                  requestFilePermission();
                } else if (!webLinkedFileName.value || webSyncStatus.value === 'missing') {
                  linkLocalFile();
                }
              }}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(28, 28, 30, 0.95)',
                border: `1px solid ${
                  (webSyncStatus.value === 'error' || webSyncStatus.value === 'missing') ? 'rgba(239, 68, 68, 0.5)'
                  : webSyncStatus.value === 'permission-needed' ? 'rgba(234, 179, 8, 0.5)'
                  : webLinkedFileName.value ? 'rgba(34, 197, 94, 0.5)' 
                  : 'rgba(255,255,255,0.1)'
                }`,
                color: (webSyncStatus.value === 'error' || webSyncStatus.value === 'missing') ? '#fca5a5' 
                  : webSyncStatus.value === 'permission-needed' ? '#fde047'
                  : webLinkedFileName.value ? '#86efac' 
                  : '#d1d5db',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                transition: 'background 0.2s, transform 0.1s',
                boxSizing: 'border-box',
                position: 'relative'
              }}
              title={
                webSyncStatus.value === 'saving' ? 'Saving...' 
               : webSyncStatus.value === 'saved' ? 'Saved!' 
               : webSyncStatus.value === 'error' ? 'Save Failed' 
               : webSyncStatus.value === 'missing' ? 'File Missing - Click to Relink'
               : webSyncStatus.value === 'permission-needed' ? 'Permission Needed - Click to Grant'
               : webLinkedFileName.value ? `Linked: ${webLinkedFileName.value}`
               : 'Link Local JSON File'
              }
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.transform = 'scale(1.1)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(28, 28, 30, 0.95)'; (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
            >
              <HardDrive size={20} />
              {(webLinkedFileName.value || webSyncStatus.value === 'permission-needed' || webSyncStatus.value === 'missing') && (
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: webSyncStatus.value === 'saving' ? '#fbbf24'
                    : webSyncStatus.value === 'saved' ? '#4ade80'
                    : (webSyncStatus.value === 'error' || webSyncStatus.value === 'missing') ? '#ef4444'
                    : webSyncStatus.value === 'permission-needed' ? '#eab308'
                    : '#4ade80',
                  boxShadow: webSyncStatus.value === 'saved' ? '0 0 8px #4ade80' : 'none',
                  animation: (webSyncStatus.value === 'saving' || webSyncStatus.value === 'permission-needed' || (!['saving', 'error', 'missing', 'permission-needed'].includes(webSyncStatus.value))) 
                    ? 'icycrow-pulse 2s infinite' : 'none',
                  border: '1px solid rgba(0,0,0,0.5)'
                }} />
              )}
            </div>
        </div>
      </div>
      <style>{`
        @keyframes icycrow-pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}</style>
    </>
  );
};
