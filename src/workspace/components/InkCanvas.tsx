import { useRef, useEffect } from 'preact/hooks';
import { getStroke } from 'perfect-freehand';
import { signal } from '@preact/signals';
import { simplifyPath } from '../../lib/spatial-engine/path-simplifier';
import { normalizePath, denormalizePath } from '../../lib/spatial-engine/coordinates';
import { saveSpatialAnnotation, getSpatialAnnotationsByPage } from '../../lib/storage';

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

interface InkCanvasProps {
  width: number;
  height: number;
  fileUrl: string | null;
  pageNumber: number;
}

const currentStroke = signal<Point[]>([]);
const savedAnnotations = signal<any[]>([]);

export function InkCanvas({ width, height, fileUrl, pageNumber }: InkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  // Load existing annotations
  useEffect(() => {
    if (!fileUrl) return;
    const loadAnnotations = async () => {
      const annotations = await getSpatialAnnotationsByPage(fileUrl, pageNumber);
      savedAnnotations.value = annotations;
      drawAll();
    };
    loadAnnotations();
  }, [fileUrl, pageNumber, width, height]);

  const drawAll = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // Draw saved annotations
    savedAnnotations.value.forEach(ann => {
      const points = denormalizePath(ann.data.normalizedPoints, width, height);
      renderStroke(ctx, points, ann.data.color, ann.data.strokeWidth);
    });

    // Draw active stroke
    if (currentStroke.value.length > 0) {
      renderStroke(ctx, currentStroke.value, '#90CAF9', 4);
    }
  };

  const renderStroke = (ctx: CanvasRenderingContext2D, points: Point[], color: string, size: number) => {
    const stroke = getStroke(points, {
      size,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
    });
    if (stroke.length === 0) return;

    ctx.fillStyle = color;
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
    drawAll();
  };

  const handlePointerUp = async () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (currentStroke.value.length > 0 && fileUrl) {
      const simplified = simplifyPath(currentStroke.value, 0.5);
      const normalized = normalizePath(simplified, width, height);

      await saveSpatialAnnotation(fileUrl, {
        kind: 'spatial',
        pageNumber,
        normalizedPoints: normalized,
        strokeWidth: 4,
        color: '#90CAF9'
      });

      // Refresh local state (in a reactive app, we might use a store)
      const annotations = await getSpatialAnnotationsByPage(fileUrl, pageNumber);
      savedAnnotations.value = annotations;
    }
    
    currentStroke.value = [];
    drawAll();
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
