import { useState, useRef, useEffect } from 'preact/hooks';
import { Callout, updateCalloutText, deleteCallout, activeCalloutId, persistAnnotations, updateCalloutBoxPosition } from '../store/annotation-state';
import { viewerScale, activeTool } from '../store/viewer-state';

interface CalloutBoxProps {
  callout: Callout;
  url: string;
}

export function CalloutBox({ callout, url }: CalloutBoxProps) {
  const scale = viewerScale.value;
  const isActive = activeCalloutId.value === callout.id;
  const isEraser = activeTool.value === 'eraser';
  
  const [tempText, setTempText] = useState(callout.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Drag State
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isActive && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isActive]);

  const handleBlur = () => {
    updateCalloutText(callout.id, tempText);
    persistAnnotations(url);
    activeCalloutId.value = null;
  };

  const handlePointerEnter = () => {
    if (isEraser) {
      deleteCallout(callout.id, url);
    }
  };

  // Drag Handlers
  const handlePointerDown = (e: PointerEvent) => {
    if (activeTool.value !== 'select') return;
    
    e.stopPropagation();
    setIsDragging(true);
    setStartPoint({ x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging) return;
    setDragOffset({
      x: e.clientX - startPoint.x,
      y: e.clientY - startPoint.y
    });
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (!isDragging) return;
    
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    setIsDragging(false);

    const finalX = callout.box.x + (dragOffset.x / scale);
    const finalY = callout.box.y + (dragOffset.y / scale);
    
    updateCalloutBoxPosition(callout.id, finalX, finalY);
    persistAnnotations(url);
    setDragOffset({ x: 0, y: 0 });
  };

  // Calculate dominant side based on anchor-to-box vector
  const getDynamicTransform = () => {
    const dx = callout.box.x - callout.anchor.x;
    const dy = callout.box.y - callout.anchor.y;
    const gap = 12; // px gap from tip to box edge

    // Horizontal is dominant
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx >= 0) {
        // Box is to the right of anchor -> Point to Left side
        return `translate(${gap}px, -50%)`;
      } else {
        // Box is to the left of anchor -> Point to Right side
        return `translate(calc(-100% - ${gap}px), -50%)`;
      }
    } else {
      // Vertical is dominant
      if (dy >= 0) {
        // Box is below anchor -> Point to Top side
        return `translate(-50%, ${gap}px)`;
      } else {
        // Box is above anchor -> Point to Bottom side
        return `translate(-50%, calc(-100% - ${gap}px))`;
      }
    }
  };

  // Position at the box coordinates (arrow tip)
  const positionStyle = {
    position: 'absolute' as const,
    left: '0',
    top: '0',
    transform: `translate(${callout.box.x * scale + dragOffset.x}px, ${callout.box.y * scale + dragOffset.y}px) ${getDynamicTransform()}`,
    zIndex: isActive || isDragging ? 2000 : 1000,
    cursor: isEraser ? 'cell' : (activeTool.value === 'select' ? 'grab' : 'default'),
    fontSize: `${14 * scale}px`,
    transition: isDragging ? 'none' : 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
  };

  return (
    <div 
      className={`callout-container ${isActive ? 'active' : ''}`}
      style={positionStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerEnter={handlePointerEnter}
    >
      {isActive ? (
        <textarea
          ref={textareaRef}
          className="callout-textarea"
          value={tempText}
          onInput={(e) => setTempText((e.target as HTMLTextAreaElement).value)}
          onBlur={handleBlur}
          placeholder="Type note..."
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag while typing
          autoFocus
        />
      ) : (
        <div 
          className="callout-text-display"
          onClick={() => {
            if (isDragging) return;
            activeCalloutId.value = callout.id;
          }}
          style={{ cursor: 'text', minHeight: '24px', whiteSpace: 'pre-wrap' }}
        >
          {callout.text || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Add a note...</span>}
        </div>
      )}
    </div>
  );
}
