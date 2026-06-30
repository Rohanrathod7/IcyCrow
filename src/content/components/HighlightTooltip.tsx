import { tooltipVisible, tooltipPos, selectedColor } from '../state';
import { webFlashcardNotes, triggerAutoSave, webStickyNotes, webCallouts } from '../store/web-annotation-state';
import { HighlightColor } from '../../lib/types';
import { captureAnchor } from '../anchoring';
import { wrapRange } from '../highlighter';
import { sha256Hash, canonicalUrl } from '../../lib/url-utils';
import { Bookmark, Brain, Plus, Eraser, StickyNote, ArrowUpRight } from 'lucide-preact';
import { isToolPickerOpen } from '../../workspace/store/toolbar-state';
import { activeTool } from '../../workspace/store/viewer-state';

/**
 * Floating Tooltip for text selection
 * Following preact-ui SKILL and LLD §5
 * Enhanced with Bookmark + Flashcard actions
 */
export const HighlightTooltip = () => {
  if (!tooltipVisible.value) return null;

  const onHighlight = async () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const anchor = captureAnchor(selection);
    if (anchor) {
      const range = selection.getRangeAt(0);
      const highlightId = crypto.randomUUID();
      const url = window.location.href;
      const urlHash = await sha256Hash(canonicalUrl(url));
      const bodyText = document.body.innerText || document.body.textContent || '';
      const domFingerprint = await sha256Hash(bodyText.slice(0, 500));

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'HIGHLIGHT_CREATE',
          payload: {
            url,
            urlHash,
            text: anchor.exact,
            color: getColorValue(selectedColor.value as any),
            anchor,
            pageMeta: { title: document.title, domFingerprint },
            spaceId: null
          }
        });
        if (response && response.ok) {
          wrapRange(range, response.data.id, getColorValue(selectedColor.value as any));
        } else {
          wrapRange(range, highlightId, getColorValue(selectedColor.value as any));
        }
      } catch (e) {
        wrapRange(range, highlightId, getColorValue(selectedColor.value as any));
      }

      selection.removeAllRanges();
      tooltipVisible.value = false;
    }
  };

  const onBookmark = async () => {
    const selection = window.getSelection();
    const anchor = selection && !selection.isCollapsed ? captureAnchor(selection) : null;
    const url = window.location.href;
    const urlHash = await sha256Hash(canonicalUrl(url));
    const scrollYPercent = window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);

    try {
      await chrome.runtime.sendMessage({
        type: 'BOOKMARK_CREATE',
        payload: {
          url,
          urlHash,
          title: document.title,
          anchorExact: anchor?.exact || null,
          anchorData: anchor || null,
          scrollYPercent: Math.min(1, Math.max(0, scrollYPercent)),
          favicon: null,
          spaceId: null,
        }
      });
      // Brief visual feedback
      showToast('🔖 Bookmarked!');
    } catch (e) {
      console.warn('[IcyCrow] Bookmark creation failed:', e);
    }

    if (selection) selection.removeAllRanges();
    tooltipVisible.value = false;
  };

  const onFlashcard = async () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString();
    const anchor = captureAnchor(selection);

    // First, create a highlight so the flashcard has a parent
    let highlightId = crypto.randomUUID();
    if (anchor) {
      const range = selection.getRangeAt(0);
      const url = window.location.href;
      const urlHash = await sha256Hash(canonicalUrl(url));
      const bodyText = document.body.innerText || document.body.textContent || '';
      const domFingerprint = await sha256Hash(bodyText.slice(0, 500));

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'HIGHLIGHT_CREATE',
          payload: {
            url,
            urlHash,
            text: anchor.exact,
            color: getColorValue(selectedColor.value as any),
            anchor,
            pageMeta: { title: document.title, domFingerprint },
            spaceId: null
          }
        });
        if (response && response.ok) {
          highlightId = response.data.id;
          wrapRange(range, highlightId, getColorValue(selectedColor.value as any));
        }
      } catch (e) {
        wrapRange(range, highlightId, getColorValue(selectedColor.value as any));
      }
    }

    // Position the flashcard note near the tooltip
    const id = crypto.randomUUID();
    const docX = tooltipPos.value.x;
    const docY = tooltipPos.value.y + 50;
    
    webFlashcardNotes.value = [
      ...webFlashcardNotes.value, 
      { 
        id, 
        x: docX, 
        y: docY, 
        frontText: selectedText, 
        backText: '', 
        color: selectedColor.value === 'yellow' ? '#a855f7' : getColorValue(selectedColor.value) 
      }
    ];
    triggerAutoSave();

    triggerAutoSave();

    if (selection) selection.removeAllRanges();
    tooltipVisible.value = false;
  };

  const createHighlightForAnnotation = async (selection: Selection) => {
    const anchor = captureAnchor(selection);
    let highlightId = crypto.randomUUID();
    if (anchor) {
      const range = selection.getRangeAt(0);
      const url = window.location.href;
      const urlHash = await sha256Hash(canonicalUrl(url));
      const bodyText = document.body.innerText || document.body.textContent || '';
      const domFingerprint = await sha256Hash(bodyText.slice(0, 500));
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'HIGHLIGHT_CREATE',
          payload: { url, urlHash, text: anchor.exact, color: getColorValue(selectedColor.value as any), anchor, pageMeta: { title: document.title, domFingerprint }, spaceId: null }
        });
        if (response && response.ok) {
          highlightId = response.data.id;
          wrapRange(range, highlightId, getColorValue(selectedColor.value as any));
        }
      } catch (e) {
        wrapRange(range, highlightId, getColorValue(selectedColor.value as any));
      }
    }
    return highlightId;
  };

  const onStickyNote = async () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    await createHighlightForAnnotation(selection);

    const id = crypto.randomUUID();
    const docX = tooltipPos.value.x;
    const docY = tooltipPos.value.y + 50;
    
    webStickyNotes.value = [
      ...webStickyNotes.value,
      {
        id,
        x: docX,
        y: docY,
        text: '', 
        color: selectedColor.value === 'yellow' ? '#fde047' : getColorValue(selectedColor.value),
        isExpanded: true
      }
    ];
    triggerAutoSave();
    if (selection) selection.removeAllRanges();
    tooltipVisible.value = false;
  };

  const onCallout = async () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    await createHighlightForAnnotation(selection);

    const id = crypto.randomUUID();
    const docX = tooltipPos.value.x;
    const docY = tooltipPos.value.y; // anchor right at the text
    
    webCallouts.value = [
      ...webCallouts.value,
      {
        id,
        anchor: { x: docX, y: docY },
        box: { x: docX + 40, y: docY + 40 },
        text: '',
        color: selectedColor.value === 'yellow' ? '#fde047' : getColorValue(selectedColor.value),
        isExpanded: true
      }
    ];
    triggerAutoSave();
    if (selection) selection.removeAllRanges();
    tooltipVisible.value = false;
  };

  const colors: HighlightColor[] = ['green', 'red', 'blue', 'yellow'];

  return (
    <div
      id="icycrow-tooltip"
      style={{
        position: 'absolute',
        top: `${tooltipPos.value.y}px`,
        left: `${tooltipPos.value.x}px`,
        transform: 'translate(-50%, -100%) translateY(-12px)',
        zIndex: 2147483647,
        background: 'rgba(28, 28, 30, 0.85)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '6px 10px',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        pointerEvents: 'auto',
        animation: 'icycrow-pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Inline Styles for Animation */}
      <style>{`
        @keyframes icycrow-pop {
          0% { transform: translate(-50%, -100%) translateY(0) scale(0.9); opacity: 0; }
          100% { transform: translate(-50%, -100%) translateY(-12px) scale(1); opacity: 1; }
        }
        .icycrow-action-btn {
          border: none;
          background: transparent;
          cursor: pointer;
          padding: 5px 7px;
          border-radius: 10px;
          font-size: 15px;
          line-height: 1;
          transition: background 0.15s, transform 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icycrow-action-btn:hover {
          background: rgba(255,255,255,0.1);
          transform: scale(1.15);
        }
      `}</style>

      <div style={{ display: 'flex', gap: '4px' }}>
        {colors.map(color => (
          <button
            key={color}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => selectedColor.value = color}
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: getColorValue(color),
              border: selectedColor.value === color ? '2px solid #3a76f0' : '1px solid rgba(0,0,0,0.1)',
              cursor: 'pointer',
              padding: 0,
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s',
              boxShadow: selectedColor.value === color ? '0 0 10px rgba(58, 118, 240, 0.4)' : 'none',
              transform: selectedColor.value === color ? 'scale(1.1)' : 'scale(1)',
            }}
            onMouseEnter={(e) => (e.currentTarget as any).style.transform = 'scale(1.15)'}
            onMouseLeave={(e) => (e.currentTarget as any).style.transform = selectedColor.value === color ? 'scale(1.1)' : 'scale(1)'}
            title={color}
          />
        ))}
      </div>

      <div style={{ width: '1px', height: '22px', background: 'rgba(255,255,255,0.15)' }} />

      {/* Highlight Button */}
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={onHighlight}
        style={{
          border: 'none',
          background: 'linear-gradient(135deg, #3a76f0 0%, #6366f1 100%)',
          color: 'white',
          padding: '5px 12px',
          borderRadius: '10px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '12px',
          fontFamily: 'inherit',
          boxShadow: '0 4px 12px rgba(58, 118, 240, 0.3)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget as any).style.filter = 'brightness(1.1)'}
        onMouseLeave={(e) => (e.currentTarget as any).style.filter = 'brightness(1)'}
      >
        Highlight
      </button>

      {/* Bookmark Button */}
      <button
        className="icycrow-action-btn"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onBookmark}
        title="Bookmark this location"
      >
        <Bookmark size={16} color="#e5e7eb" />
      </button>

      {/* Flashcard Button */}
      <button
        className="icycrow-action-btn"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onFlashcard}
        title="Create flashcard"
      >
        <Brain size={16} color="#e5e7eb" />
      </button>

      <div style={{ width: '1px', height: '22px', background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />

      {/* Eraser Tool */}
      <button
        className="icycrow-action-btn"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => { activeTool.value = 'eraser' as any; tooltipVisible.value = false; }}
        title="Eraser tool"
      >
        <Eraser size={16} color="#e5e7eb" />
      </button>

      {/* Sticky Note Tool */}
      <button
        className="icycrow-action-btn"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onStickyNote}
        title="Add Sticky Note to text"
      >
        <StickyNote size={16} color="#e5e7eb" />
      </button>

      {/* Callout Tool */}
      <button
        className="icycrow-action-btn"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onCallout}
        title="Add Callout to text"
      >
        <ArrowUpRight size={16} color="#e5e7eb" />
      </button>

      <div style={{ width: '1px', height: '22px', background: 'rgba(255,255,255,0.15)' }} />

      {/* Add Tool Button */}
      <button
        className="icycrow-action-btn"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          isToolPickerOpen.value = true;
          tooltipVisible.value = false;
        }}
        title="Add more tools"
      >
        <Plus size={16} color="#e5e7eb" />
      </button>
    </div>
  );
};

function showToast(message: string) {
  const existing = document.getElementById('icycrow-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'icycrow-toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.8)',
    color: '#fff',
    padding: '10px 20px',
    borderRadius: '12px',
    fontSize: '14px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    zIndex: '2147483647',
    pointerEvents: 'none',
    animation: 'icycrow-toast-in 0.3s ease-out',
    backdropFilter: 'blur(8px)',
  });

  // Inject animation if not present
  let styleEl = document.getElementById('icycrow-toast-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'icycrow-toast-style';
    styleEl.textContent = `
      @keyframes icycrow-toast-in { 0% { opacity:0; transform:translateX(-50%) translateY(12px); } 100% { opacity:1; transform:translateX(-50%) translateY(0); } }
      @keyframes icycrow-toast-out { 0% { opacity:1; } 100% { opacity:0; transform:translateX(-50%) translateY(12px); } }
    `;
    document.head.appendChild(styleEl);
  }

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'icycrow-toast-out 0.3s ease-in forwards';
    setTimeout(() => toast.remove(), 300);
  }, 1500);
}

function getColorValue(color: HighlightColor): string {
  const map: Record<HighlightColor, string> = {
    yellow: '#eab308',
    green: '#22c55e',
    blue: '#3b82f6',
    red: '#ef4444',
    pink: '#ec4899',
    orange: '#f97316'
  };
  return map[color] || map['yellow'];
}
