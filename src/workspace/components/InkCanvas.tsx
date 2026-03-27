import { useEffect, useRef } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { strokes, Stroke, Point, persistAnnotations, deleteStroke, highlights, deleteHighlight } from '../store/annotation-state';
import { viewerScale, activeTool, toolSettings } from '../store/viewer-state';

interface InkCanvasProps {
  pageNumber: number;
  url: string;
}

export const InkCanvas = ({ pageNumber, url }: InkCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useSignal(false);
  const currentStrokeId = useSignal<string | null>(null);
  const hoverPos = useSignal<Point | null>(null);

  const isPenTool = ['draw', 'brush', 'eraser'].includes(activeTool.value);
  const isEraser = activeTool.value === 'eraser';

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      // High-DPI resize
      if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
      }

      ctx.clearRect(0, 0, rect.width, rect.height);

      const scale = viewerScale.value;
      const pageStrokes = strokes.value.filter(s => s.pageNumber === pageNumber);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      pageStrokes.forEach(stroke => {
        if (stroke.points.length < 2) return;
        
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = stroke.opacity ?? 1.0;
        ctx.lineWidth = stroke.width * scale;
        
        ctx.moveTo(
          stroke.points[0].x * scale, 
          stroke.points[0].y * scale
        );

        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(
            stroke.points[i].x * scale, 
            stroke.points[i].y * scale
          );
        }
        ctx.stroke();
      });

      ctx.globalAlpha = 1.0; // Reset

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [pageNumber]);

  const handleEraser = (x: number, y: number) => {
    const scale = viewerScale.value;
    const eraserSize = toolSettings.value.eraser?.size || 20;
    
    // 1. Check Strokes (Vector Collision)
    const pageStrokes = strokes.value.filter(s => s.pageNumber === pageNumber);
    for (const stroke of pageStrokes) {
      for (const point of stroke.points) {
        const dx = point.x - x;
        const dy = point.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < eraserSize / scale) {
          deleteStroke(stroke.id, url);
          return;
        }
      }
    }

    // 2. Check Highlights (Rect Collision)
    const pageHighlights = highlights.value.filter(h => h.pageNumber === pageNumber);
    for (const highlight of pageHighlights) {
      for (const rect of highlight.rects) {
        const buffer = eraserSize / scale;
        if (
          x >= rect.left - buffer && 
          x <= rect.left + rect.width + buffer &&
          y >= rect.top - buffer && 
          y <= rect.top + rect.height + buffer
        ) {
          deleteHighlight(highlight.id, url);
          return;
        }
      }
    }
  };

  const handlePointerDown = (e: PointerEvent) => {
    if (!isPenTool) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = viewerScale.value;
    
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const currentToolId = activeTool.value;
    const settings = toolSettings.value[currentToolId] || { size: 4 };

    if (currentToolId === 'eraser') {
      isDrawing.value = true;
      handleEraser(x, y);
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    const newStrokeId = crypto.randomUUID();
    currentStrokeId.value = newStrokeId;
    isDrawing.value = true;

    const newStroke: Stroke = {
      id: newStrokeId,
      pageNumber,
      points: [{ x, y }],
      color: settings.color || '#facc15',
      width: settings.size,
      opacity: settings.opacity ?? 1.0
    };

    strokes.value = [...strokes.value, newStroke];
    canvas.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = viewerScale.value;
    
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    if (isEraser) {
      hoverPos.value = { x, y };
      if (isDrawing.value) {
        handleEraser(x, y);
      }
      return;
    }

    if (!isDrawing.value || !currentStrokeId.value) return;

    strokes.value = strokes.value.map(s => 
      s.id === currentStrokeId.value 
        ? { ...s, points: [...s.points, { x, y }] }
        : s
    );
  };

  const handlePointerLeave = () => {
    hoverPos.value = null;
    isDrawing.value = false;
    currentStrokeId.value = null;
  };

  const handlePointerUp = () => {
    isDrawing.value = false;
    currentStrokeId.value = null;
    if (activeTool.value !== 'eraser') {
      persistAnnotations(url);
    }
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        className={`ink-canvas ${isPenTool ? 'active' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 5,
          pointerEvents: isPenTool ? 'auto' : 'none',
          touchAction: 'none'
        }}
      />
      {isEraser && hoverPos.value && (
        <div 
          style={{
            position: 'absolute',
            top: `${hoverPos.value.y * viewerScale.value}px`,
            left: `${hoverPos.value.x * viewerScale.value}px`,
            width: `${(toolSettings.value.eraser?.size || 20) * 2}px`,
            height: `${(toolSettings.value.eraser?.size || 20) * 2}px`,
            border: '2px solid rgba(255, 255, 255, 0.8)',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            boxShadow: '0 0 10px rgba(0,0,0,0.3), inset 0 0 5px rgba(255,255,255,0.5)',
            zIndex: 100,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(2px)'
          }}
        />
      )}
    </>
  );
};
