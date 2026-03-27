import { useEffect, useRef } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { strokes, Stroke, Point, persistAnnotations } from '../store/annotation-state';
import { viewerScale, activeTool } from '../store/viewer-state';

interface InkCanvasProps {
  pageNumber: number;
  url: string;
}

export const InkCanvas = ({ pageNumber, url }: InkCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useSignal(false);
  const currentStrokeId = useSignal<string | null>(null);

  const isPenTool = ['draw', 'brush', 'eraser'].includes(activeTool.value);

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

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [pageNumber]);

  const handlePointerDown = (e: PointerEvent) => {
    if (!isPenTool) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = viewerScale.value;
    
    const point: Point = {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };

    const newStrokeId = crypto.randomUUID();
    currentStrokeId.value = newStrokeId;
    isDrawing.value = true;

    const newStroke: Stroke = {
      id: newStrokeId,
      pageNumber,
      points: [point],
      color: activeTool.value === 'eraser' ? '#ffffff' : (activeTool.value === 'brush' ? '#fb923c' : '#facc15'),
      width: activeTool.value === 'brush' ? 8 : 4
    };

    strokes.value = [...strokes.value, newStroke];
    canvas.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDrawing.value || !currentStrokeId.value) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = viewerScale.value;
    
    const point: Point = {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale
    };

    strokes.value = strokes.value.map(s => 
      s.id === currentStrokeId.value 
        ? { ...s, points: [...s.points, point] }
        : s
    );
  };

  const handlePointerUp = () => {
    isDrawing.value = false;
    currentStrokeId.value = null;
    persistAnnotations(url);
  };

  return (
    <canvas
      ref={canvasRef}
      className={`ink-canvas ${isPenTool ? 'active' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
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
  );
};
