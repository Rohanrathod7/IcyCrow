import { useEffect, useState } from 'preact/hooks';
import { pdfUrl } from '../store/viewer-state';
import { highlights, strokes, stickyNotes, callouts } from '../store/annotation-state';
import { Sparkles, X, ChevronRight } from 'lucide-preact';
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
        background: 'rgba(18, 18, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '12px 16px',
        borderRadius: '20px',
        color: '#fff',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'auto'
      }}
    >
      <div style={{ 
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
        width: '32px', 
        height: '32px', 
        borderRadius: '10px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)'
      }}>
        <Sparkles size={16} color="#fff" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, opacity: 0.9 }}>Recover Annotations?</span>
        <span style={{ fontSize: '11px', opacity: 0.5 }}>Previous workspace found for this document.</span>
      </div>

      <button 
        onClick={() => {
          isToolbarSettingsOpen.value = true;
          setDismissed(true);
        }}
        style={{
          background: '#3b82f6',
          border: 'none',
          color: '#fff',
          padding: '6px 12px',
          borderRadius: '10px',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        Open Settings
        <ChevronRight size={12} />
      </button>

      <button 
        onClick={() => setDismissed(true)}
        style={{ background: 'transparent', border: 'none', color: '#fff', opacity: 0.3, cursor: 'pointer', padding: '4px' }}
      >
        <X size={14} />
      </button>
    </div>
  );
};
