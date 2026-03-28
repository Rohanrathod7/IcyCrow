import { StickyNote as StickyNoteType, activeStickyId, updateStickyText, deleteSticky, persistAnnotations, updateStickyPosition, updateStickySize } from '../store/annotation-state';
import { viewerScale, activeTool, toolSettings } from '../store/viewer-state';
import { MessageSquare } from 'lucide-preact';
import { useRef, useEffect, useState } from 'preact/hooks';

interface StickyNoteProps {
  note: StickyNoteType;
  url: string;
}

export const StickyNote = ({ note, url }: StickyNoteProps) => {
  const isExpanded = activeStickyId.value === note.id;
  const scale = viewerScale.value;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Drag State
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });

  // Resize State
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartPoint, setResizeStartPoint] = useState({ x: 0, y: 0 });
  const [currentSize, setCurrentSize] = useState({ 
    width: note.width || 220, 
    height: note.height || 140 
  });

  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    // Sync currentSize with note state if it changes externally
    // But DON'T overwrite during an active resize gesture
    if (isResizing) return;
    
    setCurrentSize({ 
      width: note.width || 220, 
      height: note.height || 140 
    });
  }, [note.width, note.height, isResizing]);

  const handleBlur = () => {
    activeStickyId.value = null;
    persistAnnotations(url);
  };

  const handleTextChange = (e: any) => {
    updateStickyText(note.id, e.target.value);
  };

  const handleEraserHover = () => {
    if (activeTool.value === 'eraser') {
      deleteSticky(note.id, url);
    }
  };

  // Drag Handlers
  const handlePointerDown = (e: PointerEvent) => {
    if (activeTool.value !== 'select' || isResizing) return;
    
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

    const finalX = note.x + (dragOffset.x / scale);
    const finalY = note.y + (dragOffset.y / scale);
    
    updateStickyPosition(note.id, finalX, finalY);
    persistAnnotations(url);
    setDragOffset({ x: 0, y: 0 });
  };

  // Resize Handlers
  const handleResizePointerDown = (e: PointerEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStartPoint({ x: e.clientX, y: e.clientY });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e: PointerEvent) => {
    if (!isResizing) return;
    e.stopPropagation();

    const dx = (e.clientX - resizeStartPoint.x) / scale;
    const dy = (e.clientY - resizeStartPoint.y) / scale;

    setCurrentSize({
      width: Math.max(120, (note.width || 220) + dx),
      height: Math.max(60, (note.height || 140) + dy)
    });
  };

  const handleResizePointerUp = (e: PointerEvent) => {
    if (!isResizing) return;
    e.stopPropagation();

    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    setIsResizing(false);

    updateStickySize(note.id, currentSize.width, currentSize.height);
    persistAnnotations(url);
  };

  const getIconSize = () => {
     const settings = toolSettings.value[activeTool.value] || toolSettings.value['sticky'];
     return (settings?.size || 24) * scale;
  };

  const currentIconSize = getIconSize();

  const baseStyles: any = {
    position: 'absolute',
    left: '0',
    top: '0',
    zIndex: isExpanded || isDragging || isResizing ? 2000 : 1000,
    transform: `translate(${note.x * scale + dragOffset.x}px, ${note.y * scale + dragOffset.y}px) ${isExpanded ? 'translate(-12px, -12px)' : 'translate(-50%, -50%)'}`,
    transition: isDragging || isResizing ? 'none' : 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    pointerEvents: 'auto'
  };

  if (!isExpanded) {
    return (
      <div 
        style={baseStyles}
        onClick={(e) => { 
          if (isDragging) return;
          e.stopPropagation(); 
          activeStickyId.value = note.id; 
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerEnter={handleEraserHover}
        className="sticky-note-collapsed"
      >
        <div style={{
          width: `${currentIconSize}px`,
          height: `${currentIconSize}px`,
          borderRadius: '6px',
          background: note.color || '#fbbf24',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isDragging ? '0 8px 20px rgba(0,0,0,0.4)' : '0 4px 10px rgba(0,0,0,0.3)',
          cursor: activeTool.value === 'select' ? 'grab' : 'pointer',
          transform: isDragging ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.1s'
        }}
        >
          <MessageSquare size={currentIconSize * 0.6} color="#000" />
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{
        ...baseStyles,
        width: `${currentSize.width * scale}px`,
        height: `${currentSize.height * scale}px`,
        background: 'rgba(28, 28, 30, 0.9)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        borderRadius: '16px',
        padding: '12px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        position: 'relative',
        overflow: 'hidden'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => e.stopPropagation()}
    >
      <textarea
        ref={textareaRef}
        value={note.text}
        onInput={handleTextChange}
        onBlur={handleBlur}
        placeholder="Type a note..."
        onPointerDown={(e) => e.stopPropagation()} // Prevent drag while typing
        style={{
          width: '100%',
          flex: 1, // Fill available space
          background: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: `${14 * scale}px`,
          lineHeight: '1.5',
          resize: 'none',
          outline: 'none',
          fontFamily: 'inherit'
        }}
      />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', pointerEvents: 'none' }}>
         <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: note.color, opacity: 0.8 }} />
         
         {/* Resize Handle Container */}
         <div 
            onPointerDown={handleResizePointerDown}
            onPointerMove={handleResizePointerMove}
            onPointerUp={handleResizePointerUp}
            style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '32px', // Larger hit zone
              height: '32px',
              cursor: 'nwse-resize',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'flex-end',
              padding: '8px',
              opacity: 0.4,
              transition: 'opacity 0.2s',
              zIndex: 100,
              pointerEvents: 'auto'
            }}
            onMouseEnter={(e: any) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e: any) => e.currentTarget.style.opacity = '0.4'}
         >
            <div style={{ 
              width: '10px', 
              height: '10px', 
              borderRight: '2px solid #fff', 
              borderBottom: '2px solid #fff',
              borderBottomRightRadius: '2px'
            }} />
         </div>
      </div>
    </div>
  );
};
