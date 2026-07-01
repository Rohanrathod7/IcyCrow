import { useEffect, useRef } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { 
  webStrokes, 
  webStickyNotes,
  webCallouts,
  webFlashcardNotes,
  webDraftCallout,
  triggerAutoSave,
  deleteWebHighlight,
  deleteWebStroke,
  deleteWebSticky,
  deleteWebCallout,
  deleteWebFlashcard,
  startWebEraseTransaction,
  endWebEraseTransaction
} from '../store/web-annotation-state';
import { activeTool, toolSettings } from '../../workspace/store/viewer-state';
import type { WebStroke } from '../../lib/types';
import { unwrapHighlight } from '../highlighter';

export function getHighlighterCursor(color: string, mode: 'text' | 'freehand') {
  if (mode === 'freehand') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M0 0 L6 6 L2 10 L0 8 Z" fill="${color}" stroke="black" stroke-width="1" stroke-linejoin="round"/><path d="M6 6 L12 12 L8 16 L2 10 Z" fill="#e2e8f0" stroke="black" stroke-width="1" stroke-linejoin="round"/><path d="M12 12 L15 15 L11 19 L8 16 Z" fill="${color}" stroke="black" stroke-width="1" stroke-linejoin="round"/><path d="M15 15 L24 24 L20 28 L11 19 Z" fill="#475569" stroke="black" stroke-width="1" stroke-linejoin="round"/></svg>`;
    const base64 = btoa(svg);
    return `url("data:image/svg+xml;base64,${base64}") 0 0, auto`;
  } else {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="13" y="8" width="6" height="16" rx="1" fill="none" stroke="white" stroke-width="2" stroke-dasharray="2,2" /><rect x="13" y="8" width="6" height="16" rx="1" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="2,2" /></svg>`;
    const base64 = btoa(svg);
    return `url("data:image/svg+xml;base64,${base64}") 16 16, auto`;
  }
}

export const WebInkCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useSignal(false);
  const currentStrokeId = useSignal<string | null>(null);
  const baseType = ((activeTool.value as string) || '').split('-')[0];
  const isHighlightTool = baseType === 'highlight';
  const highlightMode = (toolSettings.value['highlight'] as any)?.mode || 'text';
  
  const isPenTool = ['draw', 'eraser', 'sticky', 'callout', 'flashcard'].includes(baseType) || 
                    (isHighlightTool && highlightMode === 'freehand');
  const isEraser = baseType === 'eraser';

  // Global Cursor Injection for Text Mode Highlighter
  useEffect(() => {
    let styleEl = document.getElementById('icycrow-cursor-override');
    if (isHighlightTool && highlightMode === 'text') {
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'icycrow-cursor-override';
        document.head.appendChild(styleEl);
      }
      const settings = toolSettings.value['highlight'] as any || { color: '#fef08a' };
      const cssCursor = getHighlighterCursor(settings.color, 'text');
      styleEl.textContent = `body, body * { cursor: ${cssCursor} !important; }`;
    } else {
      if (styleEl) {
        styleEl.remove();
      }
    }
  }, [isHighlightTool, highlightMode, toolSettings.value]);

  // Listen for text selection if highlight tool is in text mode
  useEffect(() => {
    const handleDocumentPointerUp = () => {
      const currentBaseType = ((activeTool.value as string) || '').split('-')[0];
      const currentHighlightMode = (toolSettings.value['highlight'] as any)?.mode || 'text';
      
      if (currentBaseType === 'highlight' && currentHighlightMode === 'text') {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
          const hSettings = toolSettings.value['highlight'] as any;
          const hex = hSettings?.color || '#fef08a';
          const opacity = hSettings?.opacity ?? 0.4;
          
          let color = hex;
          if (hex.startsWith('#')) {
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            color = `rgba(${r}, ${g}, ${b}, ${opacity})`;
          }
          
          window.dispatchEvent(new CustomEvent('icycrow-highlight-command', { detail: { color } }));
        }
      }
    };
    
    document.addEventListener('pointerup', handleDocumentPointerUp);
    return () => document.removeEventListener('pointerup', handleDocumentPointerUp);
  }, []);

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
      
      const scrollY = window.scrollY;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      webStrokes.value.forEach(stroke => {
        if (stroke.points.length < 2) return;
        
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.globalCompositeOperation = (stroke.opacity && stroke.opacity < 1.0) ? 'multiply' : 'source-over';
        ctx.globalAlpha = stroke.opacity ?? 1.0;
        ctx.lineWidth = stroke.width;
        
        ctx.lineCap = stroke.isHighlight ? 'square' : 'round';
        ctx.lineJoin = stroke.isHighlight ? 'bevel' : 'round';

        // Draw points, offset by current scroll position
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y - scrollY);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y - scrollY);
        }
        ctx.stroke();
      });

      if (webDraftCallout.value) {
        ctx.beginPath();
        const settings = toolSettings.value['callout'] as any;
        ctx.strokeStyle = settings?.color || '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.moveTo(webDraftCallout.value.anchor.x, webDraftCallout.value.anchor.y - scrollY);
        ctx.lineTo(webDraftCallout.value.current.x, webDraftCallout.value.current.y - scrollY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Listen to scroll to ensure immediate sync, although rAF usually covers it
    const onScroll = () => {
      // The rAF loop will automatically pick up the new window.scrollY
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('scroll', onScroll);
    };
  }, []); // Empty deps, relies on signals inside the render loop

  // Erase logic
  const checkErase = (x: number, y: number) => {
    // Basic eraser width fallback if not set
    const eraserSettings = toolSettings.value['eraser'] as any;
    const eraseRadius = eraserSettings?.size || 20;

    // 1. Erase text highlights under pointer using robust circle-rectangle intersection
    if (canvasRef.current) {
      const marks = document.querySelectorAll('mark.icycrow-highlight');
      const viewportX = x;
      const viewportY = y - window.scrollY;
      
      marks.forEach(el => {
        const rect = el.getBoundingClientRect();
        // Find closest point on rect to the circle center
        const closestX = Math.max(rect.left, Math.min(viewportX, rect.right));
        const closestY = Math.max(rect.top, Math.min(viewportY, rect.bottom));
        
        const dx = viewportX - closestX;
        const dy = viewportY - closestY;
        
        if (Math.sqrt(dx * dx + dy * dy) <= eraseRadius) {
          const id = el.getAttribute('data-id');
          if (id) {
            unwrapHighlight(id);
            deleteWebHighlight(id);
          }
        }
      });
    }

    // 2. Erase drawings (strokes)
    for (const stroke of webStrokes.value) {
      for (const p of stroke.points) {
        const dx = p.x - x;
        const dy = p.y - y;
        if (Math.sqrt(dx * dx + dy * dy) <= eraseRadius) {
          deleteWebStroke(stroke.id);
          break;
        }
      }
    }

    // 3. Erase sticky notes
    for (const note of webStickyNotes.value) {
      const dx = note.x - x;
      const dy = note.y - y;
      if (Math.sqrt(dx*dx + dy*dy) < eraseRadius + 60) {
        deleteWebSticky(note.id);
      }
    }

    // 4. Erase callouts
    for (const c of webCallouts.value) {
       const dx = c.box.x - x;
       const dy = c.box.y - y;
       let shouldDelete = Math.sqrt(dx*dx + dy*dy) < eraseRadius + 60;
       if (!shouldDelete && c.anchor) {
         const adx = c.anchor.x - x;
         const ady = c.anchor.y - y;
         shouldDelete = Math.sqrt(adx*adx + ady*ady) < eraseRadius + 20;
       }
       if (shouldDelete) {
         deleteWebCallout(c.id);
       }
    }

    // 5. Erase flashcards
    for (const f of webFlashcardNotes.value) {
       const dx = f.x - x;
       const dy = f.y - y;
       if (Math.sqrt(dx*dx + dy*dy) < eraseRadius + 60) {
         deleteWebFlashcard(f.id);
       }
    }
  };

  // Pointer Handlers
  const handlePointerDown = (e: PointerEvent) => {
    if (!isPenTool) return;
    // Don't draw if they are clicking a UI element (like the toolbar)
    if ((e.target as HTMLElement).closest('.icycrow-ui-element')) return;

    e.preventDefault();
    isDrawing.value = true;
    (e.target as Element).setPointerCapture(e.pointerId);

    const docX = e.clientX;
    const docY = e.clientY + window.scrollY;

    if (isEraser) {
      startWebEraseTransaction();
      checkErase(docX, docY);
    } else if (baseType === 'sticky') {
      const id = crypto.randomUUID();
      const settings = toolSettings.value[activeTool.value as string] || toolSettings.value['sticky'];
      const color = settings?.color || '#fef3c7';
      webStickyNotes.value = [...webStickyNotes.value, { id, x: docX, y: docY, text: '', color }];
      triggerAutoSave();
      activeTool.value = 'select' as any; // Revert to cursor
    } else if (baseType === 'flashcard') {
      const id = crypto.randomUUID();
      const settings = toolSettings.value[activeTool.value as string] || toolSettings.value['flashcard'];
      const color = settings?.color || '#a855f7';
      webFlashcardNotes.value = [...webFlashcardNotes.value, { id, x: docX, y: docY, frontText: '', backText: '', color }];
      triggerAutoSave();
      activeTool.value = 'select' as any; // Revert to cursor
    } else if (baseType === 'callout') {
      webDraftCallout.value = { anchor: { x: docX, y: docY }, current: { x: docX, y: docY } };
    } else {
      const id = crypto.randomUUID();
      currentStrokeId.value = id;
      
      const isHighlight = baseType === 'highlight';
      const settings = toolSettings.value[activeTool.value as string] || toolSettings.value[baseType];
      const color = settings?.color || '#ef4444';
      const width = settings?.size || (isHighlight ? 16 : 3);
      const opacity = settings?.opacity || (isHighlight ? 0.4 : 1.0);

      const newStroke: WebStroke = {
        id,
        points: [{ x: docX, y: docY }],
        color,
        width,
        opacity,
        isHighlight
      };
      
      webStrokes.value = [...webStrokes.value, newStroke];
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDrawing.value) return;
    
    const docX = e.clientX;
    const docY = e.clientY + window.scrollY;

    if (isEraser) {
      checkErase(docX, docY);
    } else if (webDraftCallout.value) {
      webDraftCallout.value = { ...webDraftCallout.value, current: { x: docX, y: docY } };
    } else if (currentStrokeId.value) {
      webStrokes.value = webStrokes.value.map(s => {
        if (s.id === currentStrokeId.value) {
          return { ...s, points: [...s.points, { x: docX, y: docY }] };
        }
        return s;
      });
    }
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (isDrawing.value) {
      (e.target as Element).releasePointerCapture(e.pointerId);
      const wasEraser = isEraser;
      isDrawing.value = false;
      
      if (webDraftCallout.value) {
        const id = crypto.randomUUID();
        const settings = toolSettings.value['callout'] as any;
        const color = settings?.color || '#ef4444';
        webCallouts.value = [...webCallouts.value, {
          id,
          anchor: webDraftCallout.value.anchor,
          box: webDraftCallout.value.current,
          text: '',
          color
        }];
        webDraftCallout.value = null;
        triggerAutoSave();
        activeTool.value = 'select' as any; // Revert to cursor
      }
      
      currentStrokeId.value = null;
      if (wasEraser) {
        endWebEraseTransaction();
      } else {
        triggerAutoSave();
      }
    }
  };

  // If cursor tool (pan or select), or highlight text mode, pass events through to the webpage
  const passThrough = ['pan', 'select'].includes(baseType) || (isHighlightTool && highlightMode === 'text');
  const pointerEvents = passThrough ? 'none' : 'auto';
  
  // Custom cursor for Eraser
  const eraserSettings = toolSettings.value['eraser'] as any;
  const eraseRadius = eraserSettings?.size || 20;
  const eraserSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${eraseRadius * 2}" height="${eraseRadius * 2}" viewBox="0 0 ${eraseRadius * 2} ${eraseRadius * 2}"><circle cx="${eraseRadius}" cy="${eraseRadius}" r="${eraseRadius - 1}" stroke="%23ef4444" stroke-width="2" fill="none"/></svg>`;
  
  const highlightSettings = toolSettings.value['highlight'] as any || { color: '#fef08a', mode: 'text' };
  
  let cursorCss = 'crosshair';
  if (isEraser) {
    cursorCss = `url('data:image/svg+xml;utf8,${eraserSvg}') ${eraseRadius} ${eraseRadius}, auto`;
  } else if (isHighlightTool) {
    cursorCss = getHighlighterCursor(highlightSettings.color, highlightMode);
  }

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents,
        zIndex: 2147483645, // High Z but behind tooltip/toolbars
        touchAction: pointerEvents === 'none' ? 'auto' : 'none',
        cursor: pointerEvents === 'none' ? 'auto' : cursorCss
      }}
    />
  );
};
