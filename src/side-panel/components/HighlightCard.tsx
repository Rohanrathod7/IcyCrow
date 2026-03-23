import { h } from 'preact';
import { useState } from 'preact/hooks';
import type { Highlight, HighlightColor } from '../../lib/types';

interface Props {
  highlight: Highlight;
  isGhost?: boolean;
}

/**
 * SHA-256 helper for generating urlHash from URL
 */
async function hashUrl(url: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(url);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function HighlightCard({ highlight, isGhost }: Props) {
  const [note, setNote] = useState(highlight.note || '');
  const [isSaving, setIsSaving] = useState(false);
  const date = new Date(highlight.createdAt).toLocaleDateString();

  const handleGoToSource = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: highlight.url });
    }
  };

  const handleUpdateNote = async () => {
    if (note === highlight.note) return;
    
    setIsSaving(true);
    try {
      const urlHash = await hashUrl(highlight.url);
      await chrome.runtime.sendMessage({
        type: 'HIGHLIGHT_UPDATE',
        payload: {
          urlHash,
          highlightId: highlight.id,
          updates: { note }
        }
      });
    } catch (err) {
      console.error('[HighlightCard] Update failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Permanently delete this highlight?')) return;
    
    try {
      const urlHash = await hashUrl(highlight.url);
      await chrome.runtime.sendMessage({
        type: 'HIGHLIGHT_DELETE',
        payload: {
          urlHash,
          highlightId: highlight.id
        }
      });
    } catch (err) {
      console.error('[HighlightCard] Delete failed:', err);
    }
  };

  return (
    <div className={`highlight-card bento-card glass ${isGhost ? 'ghost-fail' : ''}`}>
      <div className="card-header">
        <div className={`highlight-marker ${highlight.color}`} title={highlight.color} />
        <span className="timestamp">{date}</span>
        {isGhost && (
          <span className="ghost-warning" title="Page content changed since this highlight was created">
            ⚠️ Page changed
          </span>
        )}
        <button 
          className="btn-delete btn-icon-only" 
          onClick={handleDelete}
          title="Delete highlight"
        >
          🗑️
        </button>
      </div>
      
      <div className="card-body">
        <blockquote className="quote-snippet">
          "{highlight.text}"
        </blockquote>
        
        <div className="note-editor">
          <textarea 
            value={note}
            onInput={(e) => setNote((e.target as HTMLTextAreaElement).value)}
            onBlur={handleUpdateNote}
            placeholder="Add a note..."
            disabled={isSaving}
          />
          {isSaving && <span className="saving-spinner">⌛</span>}
        </div>
      </div>
      
      <div className="card-footer">
        <span className="page-title" title={highlight.url}>
          {highlight.pageMeta?.title || 'Untitled Page'}
        </span>
        <button 
          className="btn-source btn-icon-only" 
          onClick={handleGoToSource}
          title="Go to original page"
        >
          ↗️
        </button>
      </div>
    </div>
  );
}
