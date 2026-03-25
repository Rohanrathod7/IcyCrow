import { useRef, useEffect } from 'preact/hooks';
import { getStroke } from 'perfect-freehand';
import { signal } from '@preact/signals';
import { simplifyPath } from '../../lib/spatial-engine/path-simplifier';

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

interface InkCanvasProps {
  width: number;
  height: number;
}

const currentStroke = signal<Point[]>([]);

export function InkCanvas({ width, height }: InkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || currentStroke.value.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // We only clear if we want to redraw the whole frame, 
    // but for active drawing, we just append or redraw current stroke.
    // For simplicity here, we clear and redraw the current stroke.
    ctx.clearRect(0, 0, width, height);

    const stroke = getStroke(currentStroke.value, {
      size: 4,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    });

    if (stroke.length === 0) return;

    ctx.fillStyle = '#90CAF9';
    ctx.beginPath();
    const [first, ...rest] = stroke;
    ctx.moveTo(first[0], first[1]);
    for (const [x, y] of rest) {
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  };

  const handlePointerDown = (e: PointerEvent) => {
    isDrawing.current = true;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    currentStroke.value = [{
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure
    }];
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDrawing.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const newPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure
    };

    currentStroke.value = [...currentStroke.value, newPoint];
    draw();
  };

  const handlePointerUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    const rawCount = currentStroke.value.length;
    const simplified = simplifyPath(currentStroke.value, 0.5);
    console.log(`[IcyCrow] Stroke Complete. Compressed ${rawCount} points to ${simplified.length}. Ratio: ${((simplified.length / rawCount) * 100).toFixed(1)}%`);
    
    // In a real app, we'd save 'simplified' to the store here.
    currentStroke.value = [];
  };

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        touchAction: 'none',
        cursor: 'crosshair'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
}
