import { StickyNote as StickyNoteType, activeStickyId, updateStickyText, deleteSticky, persistAnnotations } from '../store/annotation-state';
import { viewerScale, activeTool, toolSettings } from '../store/viewer-state';
import { MessageSquare } from 'lucide-preact';
import { useRef, useEffect } from 'preact/hooks';

interface StickyNoteProps {
  note: StickyNoteType;
  url: string;
}

export const StickyNote = ({ note, url }: StickyNoteProps) => {
  const isExpanded = activeStickyId.value === note.id;
  const scale = viewerScale.value;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

  const handleBlur = () => {
    activeStickyId.value = null;
    persistAnnotations(url);
  };

  const handleTextChange = (e: any) => {
    updateStickyText(note.id, e.target.value);
  };

  const handleEraserHover = () => {
    if (activeTool.value === 'eraser') {
      deleteSticky(note.id);
      persistAnnotations(url);
    }
  };

  const getIconSize = () => {
     // Check if there's global settings for this specific instance type
     const baseType = activeTool.value as string;
     const settings = toolSettings.value[baseType] || toolSettings.value['sticky'];
     return (settings?.size || 24) * scale;
  };

  const currentIconSize = getIconSize();

  const baseStyles: any = {
    position: 'absolute',
    left: `${note.x * scale}px`,
    top: `${note.y * scale}px`,
    zIndex: isExpanded ? 2000 : 1000,
    transform: 'translate(-50%, -50%)',
    transition: 'all 0.2s',
    pointerEvents: 'auto'
  };

  if (!isExpanded) {
    return (
      <div 
        style={baseStyles}
        onClick={(e) => { e.stopPropagation(); activeStickyId.value = note.id; }}
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
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          transform: 'scale(1)',
          transition: 'transform 0.1s'
        }}
        onMouseEnter={(e: any) => e.target.style.transform = 'scale(1.2)'}
        onMouseLeave={(e: any) => e.target.style.transform = 'scale(1)'}
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
        width: '200px',
        background: 'rgba(28, 28, 30, 0.8)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRadius: '16px',
        padding: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <textarea
        ref={textareaRef}
        value={note.text}
        onInput={handleTextChange}
        onBlur={handleBlur}
        placeholder="Type a note..."
        style={{
          width: '100%',
          minHeight: '80px',
          background: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: '13px',
          lineHeight: '1.5',
          resize: 'none',
          outline: 'none',
          fontFamily: 'inherit'
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
         <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: note.color }} />
      </div>
    </div>
  );
};
