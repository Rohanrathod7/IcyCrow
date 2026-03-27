import { highlights } from '../store/annotation-state';
import { viewerScale } from '../store/viewer-state';

interface HighlightOverlayProps {
  pageNumber: number;
}

export const HighlightOverlay = ({ pageNumber }: HighlightOverlayProps) => {
  const currentScale = viewerScale.value;
  const pageHighlights = highlights.value.filter(h => h.pageNumber === pageNumber);

  if (pageHighlights.length === 0) return null;

  return (
    <div 
      className="highlight-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden'
      }}
    >
      {pageHighlights.map((highlight) => (
        highlight.rects.map((rect, index) => (
          <div
            key={`${highlight.id}-${index}`}
            data-testid={`highlight-${highlight.id}-${index}`}
            style={{
              position: 'absolute',
              top: `${rect.top * currentScale}px`,
              left: `${rect.left * currentScale}px`,
              width: `${rect.width * currentScale}px`,
              height: `${rect.height * currentScale}px`,
              backgroundColor: highlight.color,
              mixBlendMode: 'multiply',
              opacity: 0.8,
              borderRadius: '2px'
            }}
          />
        ))
      ))}
    </div>
  );
};
