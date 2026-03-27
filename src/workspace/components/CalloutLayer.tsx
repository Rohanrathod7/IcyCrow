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
      {/* Render Saved Callouts */}
      {pageCallouts.map(callout => {
        const { anchor, box } = callout;
        const x1 = anchor.x * scale;
        const y1 = anchor.y * scale;
        const x2 = box.x * scale;
        const y2 = box.y * scale;
        
        // Calculate angle for arrowhead
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = 12;
        // Arrowhead points
        const px1 = x2 - headLen * Math.cos(angle - Math.PI / 6);
        const py1 = y2 - headLen * Math.sin(angle - Math.PI / 6);
        const px2 = x2 - headLen * Math.cos(angle + Math.PI / 6);
        const py2 = y2 - headLen * Math.sin(angle + Math.PI / 6);

        return (
          <g key={callout.id}>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={callout.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
            />
            <polygon
              points={`${x2},${y2} ${px1},${py1} ${px2},${py2}`}
              fill={callout.color}
            />
          </g>
        );
      })}

      {/* Render Draft Preview */}
      {draft && (() => {
        const x1 = draft.anchor.x * scale;
        const y1 = draft.anchor.y * scale;
        const x2 = draft.current.x * scale;
        const y2 = draft.current.y * scale;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = 12;
        const px1 = x2 - headLen * Math.cos(angle - Math.PI / 6);
        const py1 = y2 - headLen * Math.sin(angle - Math.PI / 6);
        const px2 = x2 - headLen * Math.cos(angle + Math.PI / 6);
        const py2 = y2 - headLen * Math.sin(angle + Math.PI / 6);

        return (
          <g>
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.6)"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
            <polygon
              points={`${x2},${y2} ${px1},${py1} ${px2},${py2}`}
              fill="rgba(255,255,255,0.6)"
            />
          </g>
        );
      })()}
    </svg>
  );
}
