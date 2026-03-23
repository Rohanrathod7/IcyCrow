import { h, Fragment } from 'preact';
import { useMemo } from 'preact/hooks';
import { allHighlights } from '../store';
import { HighlightCard } from './HighlightCard';
import type { Highlight } from '../../lib/types';

export function HighlightsPanel() {
  const highlightsList = allHighlights.value;

  const groupedHighlights = useMemo(() => {
    const groups: Record<string, { title: string; items: Highlight[] }> = {};
    
    highlightsList.forEach(h => {
      if (!groups[h.url]) {
        groups[h.url] = {
          title: h.pageMeta?.title || h.url,
          items: []
        };
      }
      groups[h.url].items.push(h);
    });
    
    return Object.entries(groups);
  }, [highlightsList]);

  if (highlightsList.length === 0) {
    return (
      <div className="highlights-empty bento-card glass">
        <div className="empty-icon">🔖</div>
        <p>No highlights captured yet.</p>
        <span className="hint">Select text on any page and right-click to highlight.</span>
      </div>
    );
  }

  return (
    <div className="highlights-panel">
      {groupedHighlights.map(([url, group]) => (
        <div key={url} className="highlight-group">
          <div className="group-header">
            <span className="group-title">{group.title}</span>
            <span className="group-count">{group.items.length}</span>
          </div>
          
          <div className="group-items">
            {group.items.map(item => (
              <HighlightCard key={item.id} highlight={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
