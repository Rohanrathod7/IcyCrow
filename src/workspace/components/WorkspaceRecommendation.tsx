import { useEffect, useState } from 'preact/hooks';
import { pdfUrl } from '../store/viewer-state';
import { highlights, strokes, stickyNotes, callouts } from '../store/annotation-state';
import { Sparkles, X, Settings } from 'lucide-preact';
import { isToolbarSettingsOpen } from '../store/toolbar-state';

export const WorkspaceRecommendation = () => {
  const [suggestion, setSuggestion] = useState<{ sourceName: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const url = pdfUrl.value;
  const hasNotes = highlights.value.length > 0 || 
                   strokes.value.length > 0 || 
                   stickyNotes.value.length > 0 || 
                   callouts.value.length > 0;

  useEffect(() => {
    if (!url || hasNotes || dismissed) {
      setSuggestion(null);
      return;
    }

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get('icycrow_workspace_registry', (res) => {
        const registry: Record<string, any> = res.icycrow_workspace_registry || {};
        if (registry[url]) {
          setSuggestion(registry[url]);
        }
      });
    }
  }, [url, hasNotes, dismissed]);

  if (!suggestion || dismissed) return null;

  return (
    <div 
      className="workspace-recommendation-toast"
      style={{
        position: 'fixed',
        bottom: '100px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(32, 32, 35, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '12px 18px',
        borderRadius: '24px',
        color: '#fff',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        animation: 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'auto'
      }}
    >
      <div style={{ 
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
        width: '36px', 
        height: '34px', 
        borderRadius: '12px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center'
      }}>
        <Sparkles size={18} color="#fff" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>Recover Workspace?</span>
        <span style={{ fontSize: '11px', opacity: 0.6 }}>Found existing annotations for this document.</span>
      </div>

      <button 
        onClick={() => {
          isToolbarSettingsOpen.value = true;
          setDismissed(true);
        }}
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#fff',
          padding: '8px 14px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'background 0.2s'
        }}
      >
        <Settings size={12} />
        Restore
      </button>

      <button 
        onClick={(e) => {
          e.stopPropagation();
          setDismissed(true);
        }}
        style={{ 
          background: 'rgba(255,255,255,0.05)', 
          border: 'none', 
          color: '#fff', 
          opacity: 0.8, 
          cursor: 'pointer', 
          padding: '8px', 
          borderRadius: '50%',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          transition: 'opacity 0.2s'
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};
