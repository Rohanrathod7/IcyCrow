import { useState, useRef, useEffect } from 'preact/hooks';
import { Minimize2, Image as ImageIcon, Trash2, GripHorizontal, MessageSquare, StickyNote, Brain } from 'lucide-preact';
import { triggerAutoSave } from '../store/web-annotation-state';

export type NoteType = 'sticky' | 'callout' | 'flashcard';

export interface DraggableNoteProps {
  id: string;
  type: NoteType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  isExpanded?: boolean;
  color: string;
  
  // Content
  text?: string;
  frontText?: string;
  backText?: string;
  imageUrl?: string;
  frontImageUrl?: string;
  backImageUrl?: string;
  imageSize?: number;
  frontImageSize?: number;
  backImageSize?: number;
  splitRatio?: number;
  
  // Callbacks
  onUpdate: (updates: any) => void;
  onDelete: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onViewFullscreen?: (url: string) => void;
  
  isActive?: boolean;
}

export const DraggableNoteWindow = (props: DraggableNoteProps) => {
  const { 
    id, 
    type, 
    x, 
    y, 
    width = 240, 
    height = 200, 
    isExpanded = true, 
    color, 
    text, 
    frontText, 
    backText, 
    imageUrl, 
    frontImageUrl,
    backImageUrl,
    imageSize = 100,
    frontImageSize = 100,
    backImageSize = 100,
    splitRatio = 0.5, 
    onUpdate, 
    onDelete, 
    onFocus, 
    onBlur, 
    onViewFullscreen,
    isActive 
  } = props;
  
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const [localSplitRatio, setLocalSplitRatio] = useState(splitRatio);
  const isResizingSplit = useRef(false);

  // Sync prop changes if updated externally
  useEffect(() => {
    setLocalSplitRatio(splitRatio);
  }, [splitRatio]);

  const handleSplitPointerDown = (e: PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isResizingSplit.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleSplitPointerMove = (e: PointerEvent) => {
    if (!isResizingSplit.current) return;
    if (!containerRef.current) return;
    const bodyEl = containerRef.current.querySelector('.flashcard-body-container') as HTMLElement;
    if (bodyEl) {
      const rect = bodyEl.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      const newRatio = Math.max(0.15, Math.min(0.85, relativeY / rect.height));
      setLocalSplitRatio(newRatio);
    }
  };

  const handleSplitPointerUp = (e: PointerEvent) => {
    if (isResizingSplit.current) {
      isResizingSplit.current = false;
      (e.target as Element).releasePointerCapture(e.pointerId);
      onUpdate({ splitRatio: localSplitRatio });
      triggerAutoSave();
    }
  };

  // Compress expanded note window automatically on click outside
  useEffect(() => {
    if (!isExpanded) return;
    const handleDocumentClick = (e: MouseEvent) => {
      const path = e.composedPath() as HTMLElement[];
      if (containerRef.current && !path.includes(containerRef.current)) {
        onUpdate({ isExpanded: false });
      }
    };
    
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleDocumentClick);
    }, 100);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, [isExpanded, id, onUpdate]);
  
  const handlePointerDown = (e: PointerEvent) => {
    e.stopPropagation();
    onFocus?.();
    const target = e.target as HTMLElement;
    if (target.closest('.drag-handle') || target.closest('.collapsed-icon')) {
      setIsDragging(true);
      setHasDragged(false);
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
      (e.target as Element).setPointerCapture(e.pointerId);
    }
  };
  
  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging) return;
    setHasDragged(true);
    
    // In content scripts, scroll position affects absolute coordinates relative to document
    const docX = e.clientX + window.scrollX;
    const docY = e.clientY + window.scrollY;
    
    // Center it on the pointer or use offset
    // Since we are absolutely positioned to document root, we need to subtract the offset
    // wait, our offset was based on clientX, so we can just say:
    const newX = docX - dragOffset.x + (isExpanded ? width / 2 : 20); // Center offset
    const newY = docY - dragOffset.y + (isExpanded ? height / 2 : 20);
    
    onUpdate({ x: newX, y: newY });
  };
  
  const handlePointerUp = (e: PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as Element).releasePointerCapture(e.pointerId);
      triggerAutoSave();
    }
  };
  
  const handleImageUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      onUpdate({ imageUrl: event.target?.result });
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: ClipboardEvent, field: 'text' | 'frontText' | 'backText') => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (type === 'flashcard') {
              if (field === 'frontText') {
                onUpdate({ frontImageUrl: dataUrl });
              } else {
                onUpdate({ backImageUrl: dataUrl });
              }
            } else {
              onUpdate({ imageUrl: dataUrl });
            }
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  const renderImageContainer = (
    url: string, 
    sizePercent = 100, 
    onSizeChange: (s: number) => void, 
    onDelete: () => void
  ) => {
    const [isHovered, setIsHovered] = useState(false);
    return (
      <div 
        style={{ 
          position: 'relative', 
          width: '100%', 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          margin: '4px 0',
          borderRadius: '6px',
          overflow: 'hidden'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div style={{ width: `${sizePercent}%`, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src={url} 
            style={{ 
              width: '100%', 
              maxHeight: '180px', 
              objectFit: 'contain', 
              borderRadius: '4px',
              border: type === 'sticky' ? '1px solid rgba(0,0,0,0.1)' : '1px solid rgba(255,255,255,0.15)',
              cursor: 'zoom-in'
            }} 
            onClick={() => onViewFullscreen?.(url)}
          />
          
          {/* Overlay controls on hover */}
          {isHovered && (
            <div 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '6px',
                boxSizing: 'border-box',
                borderRadius: '4px',
                backdropFilter: 'blur(2px)'
              }}
            >
              {/* Top controls: Zoom + Delete */}
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onViewFullscreen?.(url); }}
                  style={{
                    background: 'rgba(0,0,0,0.6)',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    padding: '4px 6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Full screen"
                >
                  🔍 Full screen
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.8)',
                    border: 'none',
                    borderRadius: '4px',
                    color: '#fff',
                    padding: '4px 6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Delete image"
                >
                  🗑️ Delete
                </button>
              </div>

              {/* Bottom controls: Resize Slider */}
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: 'rgba(0,0,0,0.75)', 
                  padding: '4px 8px', 
                  borderRadius: '4px',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <span style={{ fontSize: '10px', color: '#ccc', whiteSpace: 'nowrap' }}>Size: {sizePercent}%</span>
                <input 
                  type="range" 
                  min="20" 
                  max="100" 
                  value={sizePercent} 
                  onInput={(e) => onSizeChange(parseInt((e.target as HTMLInputElement).value))}
                  style={{ flex: 1, height: '4px', cursor: 'pointer', accentColor: color }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Icon for collapsed state
  const Icon = type === 'callout' ? MessageSquare : (type === 'flashcard' ? Brain : StickyNote);
  
  if (!isExpanded) {
    return (
      <div
        ref={containerRef}
        className="collapsed-icon"
        style={{
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isDragging ? 'grabbing' : 'grab',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          transform: 'translate(-50%, -50%)',
          zIndex: isActive ? 100 : 10,
          pointerEvents: 'auto',
          border: '2px solid rgba(255,255,255,0.2)'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={(e) => { 
          e.stopPropagation(); 
          if (!hasDragged) {
            onUpdate({ isExpanded: true }); 
            onFocus?.(); 
          }
        }}
        title={`Expand ${type}`}
      >
        <Icon size={20} color={type === 'sticky' ? '#000' : '#fff'} style={{ pointerEvents: 'none' }} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        minWidth: '200px',
        minHeight: '150px',
        backgroundColor: type === 'sticky' ? (color.length === 7 ? color + 'EE' : color) : 'rgba(28, 28, 30, 0.85)',
        backdropFilter: type === 'sticky' ? 'none' : 'blur(10px)',
        border: type === 'sticky' ? '1px solid rgba(0,0,0,0.1)' : `2px solid ${color}`,
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset',
        transform: 'translate(-50%, -50%)',
        zIndex: isActive ? 100 : 10,
        pointerEvents: 'auto',
        overflow: 'hidden',
        resize: 'both', // Allows native resizing!
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseUp={() => {
        // Handle native resize event by checking if dimensions changed
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          if (rect.width !== width || rect.height !== height) {
            onUpdate({ width: rect.width, height: rect.height });
          }
        }
      }}
    >
      {/* Header / Drag Handle */}
      <div 
        className="drag-handle"
        style={{
          height: '32px',
          background: type === 'sticky' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          cursor: 'grab',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.5 }}>
            <GripHorizontal size={14} color={type === 'sticky' ? '#000' : '#fff'} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: type === 'sticky' ? '#000' : '#fff', textTransform: 'uppercase' }}>
              {type}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '5px', marginLeft: '6px', alignItems: 'center' }}>
            {['#fbbf24', '#4ade80', '#3b82f6', '#f87171', '#c084fc'].map(c => (
              <button
                key={c}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate({ color: c });
                }}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: c,
                  border: color === c ? (type === 'sticky' ? '1px solid #000' : '1px solid #fff') : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  padding: 0,
                  outline: 'none',
                  boxShadow: color === c ? '0 0 4px rgba(255,255,255,0.5)' : 'none',
                  transition: 'transform 0.1s ease'
                }}
                onMouseEnter={(el) => el.currentTarget.style.transform = 'scale(1.2)'}
                onMouseLeave={(el) => el.currentTarget.style.transform = 'scale(1)'}
                title="Change color"
              />
            ))}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '4px' }}>
          <label style={{ cursor: 'pointer', display: 'flex', padding: '4px', opacity: 0.7 }}>
            <ImageIcon size={14} color={type === 'sticky' ? '#000' : '#fff'} />
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </label>
          <button 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', opacity: 0.7 }}
            onClick={(e) => { e.stopPropagation(); onUpdate({ isExpanded: false }); }}
            title="Compress to icon"
          >
            <Minimize2 size={14} color={type === 'sticky' ? '#000' : '#fff'} />
          </button>
          <button 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', opacity: 0.7 }}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete"
          >
            <Trash2 size={14} color={type === 'sticky' ? '#000' : '#fff'} />
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px', gap: '8px', overflowY: 'auto' }}>
        {type === 'flashcard' ? (
          <div className="flashcard-body-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            <div 
              style={{ 
                height: `calc(${localSplitRatio * 100}% - 6px)`, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px',
                overflowY: 'auto' 
              }}
            >
              {(frontImageUrl || imageUrl) && renderImageContainer(
                (frontImageUrl || imageUrl) as string, 
                frontImageSize, 
                (s) => onUpdate({ frontImageSize: s, imageUrl: undefined, frontImageUrl: frontImageUrl || imageUrl }), 
                () => onUpdate({ imageUrl: undefined, frontImageUrl: undefined })
              )}
              <textarea
                value={frontText}
                onInput={(e) => onUpdate({ frontText: (e.target as HTMLTextAreaElement).value })}
                onPaste={(e) => handlePaste(e, 'frontText')}
                placeholder="Front (Question)..."
                style={{ flex: 1, minHeight: '30px', background: 'transparent', border: 'none', resize: 'none', color: '#fff', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
            
            <div 
              onPointerDown={handleSplitPointerDown}
              onPointerMove={handleSplitPointerMove}
              onPointerUp={handleSplitPointerUp}
              onPointerCancel={handleSplitPointerUp}
              style={{ 
                height: '12px', 
                margin: '2px 0', 
                cursor: 'row-resize', 
                position: 'relative', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                userSelect: 'none',
                touchAction: 'none'
              }}
            >
              <div style={{ 
                width: '100%', 
                height: '1px', 
                background: isResizingSplit.current ? '#3a76f0' : 'rgba(255,255,255,0.15)',
                boxShadow: isResizingSplit.current ? '0 0 4px #3a76f0' : 'none',
                transition: 'background 0.15s'
              }} />
            </div>

            <div 
              style={{ 
                height: `calc(${(1 - localSplitRatio) * 100}% - 6px)`, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '4px',
                overflowY: 'auto'
              }}
            >
              {backImageUrl && renderImageContainer(
                backImageUrl as string, 
                backImageSize, 
                (s) => onUpdate({ backImageSize: s }), 
                () => onUpdate({ backImageUrl: undefined })
              )}
              <textarea
                value={backText}
                onInput={(e) => onUpdate({ backText: (e.target as HTMLTextAreaElement).value })}
                onPaste={(e) => handlePaste(e, 'backText')}
                placeholder="Back (Answer)..."
                style={{ flex: 1, minHeight: '30px', background: 'transparent', border: 'none', resize: 'none', color: '#fff', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', height: '100%' }}>
            {imageUrl && renderImageContainer(
              imageUrl as string, 
              imageSize, 
              (s) => onUpdate({ imageSize: s }), 
              () => onUpdate({ imageUrl: undefined })
            )}
            <textarea
              value={text}
              onInput={(e) => onUpdate({ text: (e.target as HTMLTextAreaElement).value })}
              onPaste={(e) => handlePaste(e, 'text')}
              placeholder={`Type ${type} text...`}
              style={{ flex: 1, background: 'transparent', border: 'none', resize: 'none', color: type === 'sticky' ? '#000' : '#fff', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
        )}
      </div>
    </div>
  );
};
