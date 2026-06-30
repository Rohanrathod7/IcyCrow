import { useState, useRef } from 'preact/hooks';
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
  
  // Callbacks
  onUpdate: (updates: any) => void;
  onDelete: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  
  isActive?: boolean;
}

export const DraggableNoteWindow = (props: DraggableNoteProps) => {
  const { type, x, y, width = 240, height = 200, isExpanded = true, color, text, frontText, backText, imageUrl, onUpdate, onDelete, onFocus, onBlur, isActive } = props;
  
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.5 }}>
          <GripHorizontal size={14} color={type === 'sticky' ? '#000' : '#fff'} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: type === 'sticky' ? '#000' : '#fff', textTransform: 'uppercase' }}>
            {type}
          </span>
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
      
      {/* Image Preview */}
      {imageUrl && (
        <div style={{ position: 'relative', width: '100%', maxHeight: '120px', backgroundColor: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          <button 
            style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => onUpdate({ imageUrl: undefined })}
          >
            &times;
          </button>
        </div>
      )}

      {/* Content Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px', gap: '8px', overflowY: 'auto' }}>
        {type === 'flashcard' ? (
          <>
            <textarea
              value={frontText}
              onInput={(e) => onUpdate({ frontText: (e.target as HTMLTextAreaElement).value })}
              placeholder="Front (Question)..."
              style={{ flex: 1, minHeight: '60px', background: 'transparent', border: 'none', resize: 'none', color: '#fff', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
            <textarea
              value={backText}
              onInput={(e) => onUpdate({ backText: (e.target as HTMLTextAreaElement).value })}
              placeholder="Back (Answer)..."
              style={{ flex: 1, minHeight: '60px', background: 'transparent', border: 'none', resize: 'none', color: '#fff', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </>
        ) : (
          <textarea
            value={text}
            onInput={(e) => onUpdate({ text: (e.target as HTMLTextAreaElement).value })}
            placeholder={`Type ${type} text...`}
            style={{ flex: 1, background: 'transparent', border: 'none', resize: 'none', color: type === 'sticky' ? '#000' : '#fff', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        )}
      </div>
    </div>
  );
};
