import { viewerScale } from '../store/viewer-state';
import { callouts, draftCallout } from '../store/annotation-state';

interface CalloutLayerProps {
  pageNumber: number;
}

export function CalloutLayer({ pageNumber }: CalloutLayerProps) {
  const scale = viewerScale.value;
  const pageCallouts = callouts.value.filter(c => c.pageNumber === pageNumber);
  const draft = draftCallout.value && draftCallout.value.pageNumber === pageNumber ? draftCallout.value : null;

  return (
    <svg 
      style={{ 
        position: 'absolute', 
        inset: 0, 
        pointerEvents: 'none', 
        zIndex: 5,
        width: '100%',
        height: '100%',
        overflow: 'visible'
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
        </marker>
      </defs>

      {/* Render Saved Callouts */}
      {pageCallouts.map(callout => (
        <line
          key={callout.id}
          x1={callout.anchor.x * scale}
          y1={callout.anchor.y * scale}
          x2={callout.box.x * scale}
          y2={callout.box.y * scale}
          stroke={callout.color}
          strokeWidth="2"
          marker-end="url(#arrowhead)"
          style={{ color: callout.color }}
        />
      ))}

      {/* Render Draft Preview */}
      {draft && (
        <line
          x1={draft.anchor.x * scale}
          y1={draft.anchor.y * scale}
          x2={draft.current.x * scale}
          y2={draft.current.y * scale}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="2"
          strokeDasharray="4 4"
          marker-end="url(#arrowhead)"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        />
      )}
    </svg>
  );
}
