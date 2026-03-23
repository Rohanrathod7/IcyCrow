import { h } from 'preact';
import type { Highlight } from '../../lib/types';

interface Props {
  highlight: Highlight;
  isGhost?: boolean;
}

export function HighlightCard({ highlight, isGhost }: Props) {
  const date = new Date(highlight.createdAt).toLocaleDateString();

  const handleGoToSource = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: highlight.url });
    }
  };

  return (
    <div className={`highlight-card bento-card glass ${isGhost ? 'ghost-fail' : ''}`}>
      <div className="card-header">
        <div className={`highlight-marker ${highlight.color}`} />
        <span className="timestamp">{date}</span>
        {isGhost && (
          <span className="ghost-warning" title="Page content changed since this highlight was created">
            ⚠️ Page changed
          </span>
        )}
      </div>
      
      <div className="card-body">
        <blockquote className="quote-snippet">
          "{highlight.text}"
        </blockquote>
        
        {highlight.note && (
          <div className="user-note">
            <span className="note-icon">📝</span>
            <p>{highlight.note}</p>
          </div>
        )}
      </div>
      
      <div className="card-footer">
        <span className="page-title">{highlight.pageMeta.title || 'Untitled Page'}</span>
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
