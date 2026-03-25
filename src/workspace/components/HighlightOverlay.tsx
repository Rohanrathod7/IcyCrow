import { useEffect } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { getSpatialAnnotationsByPage } from '../../lib/storage';

interface HighlightOverlayProps {
  width: number;
  height: number;
  fileUrl: string | null;
  pageNumber: number;
}

export function HighlightOverlay({ width, height, fileUrl, pageNumber }: HighlightOverlayProps) {
  const highlights = useSignal<any[]>([]);

  const loadHighlights = async () => {
    if (!fileUrl) return;
    const all = await getSpatialAnnotationsByPage(fileUrl, pageNumber);
    highlights.value = all.filter(a => a.type === 'spatial-highlight');
  };

  useEffect(() => {
    loadHighlights();
    
    // Listen for custom REFRESH_HIGHLIGHTS event from parent
    const handleRefresh = () => loadHighlights();
    window.addEventListener('REFRESH_HIGHLIGHTS', handleRefresh);
    return () => window.removeEventListener('REFRESH_HIGHLIGHTS', handleRefresh);
  }, [fileUrl, pageNumber]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
        zIndex: 5,
        overflow: 'visible'
      }}
    >
      {highlights.value.map((h, i) => (
        <div key={i}>
          {(h.data.rects || []).map((rect: any, j: number) => (
            <div
              key={`${i}-${j}`}
              className="spatial-highlight"
              style={{
                position: 'absolute',
                top: `${rect.top * height}px`,
                left: `${rect.left * width}px`,
                width: `${rect.width * width}px`,
                height: `${rect.height * height}px`,
                backgroundColor: h.data.color || 'rgba(255, 235, 59, 0.4)',
                mixBlendMode: 'multiply',
                borderRadius: '2px',
                pointerEvents: 'none' // Ensure we can select THROUGH existing highlights
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
