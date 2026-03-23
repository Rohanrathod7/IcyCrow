import { h } from 'preact';
import type { Highlight } from '../../lib/types';

interface Props {
  highlight: Highlight;
}

export function HighlightCard({ highlight }: Props) {
  const date = new Date(highlight.createdAt).toLocaleDateString();

  return (
    <div className="highlight-card bento-card glass">
      <div className="card-header">
        <div className={`highlight-marker ${highlight.color}`} />
        <span className="timestamp">{date}</span>
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
      </div>
    </div>
  );
}
