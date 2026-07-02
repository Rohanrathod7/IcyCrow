import { useState, useRef, useEffect } from 'preact/hooks';
import { Minimize2, Image as ImageIcon, Trash2, GripHorizontal, MessageSquare, StickyNote, Brain } from 'lucide-preact';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
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

const isColorDark = (hex: string) => {
  if (!hex) return false;
  const cleanHex = hex.toLowerCase().trim();
  if (cleanHex.startsWith('#ffffff')) return false;
  if (cleanHex.startsWith('#000000')) return true;
  if (cleanHex.startsWith('#3b82f6')) return true;
  if (cleanHex === '#000' || cleanHex.startsWith('#0000')) return true;
  return false;
};

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

  const isDarkBg = isColorDark(color);
  const textColor = type === 'sticky' ? (isDarkBg ? '#fff' : '#000') : '#fff';
  const headerColor = type === 'sticky' ? (isDarkBg ? '#fff' : '#000') : '#fff';
  
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const [localSplitRatio, setLocalSplitRatio] = useState(splitRatio);
  const isResizingSplit = useRef(false);
  const isResizingImage = useRef(false);
  const resizeStartPointerX = useRef(0);
  const resizeStartWidthPercent = useRef(100);

  const [isEditing, setIsEditing] = useState(isExpanded && !text);
  const [activeHoveredImg, setActiveHoveredImg] = useState<{ element: HTMLImageElement; field: 'text' | 'frontText' | 'backText' } | null>(null);
  const [isEditingFront, setIsEditingFront] = useState(isExpanded && !frontText);
  const [isEditingBack, setIsEditingBack] = useState(isExpanded && !backText);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const frontTextareaRef = useRef<HTMLTextAreaElement>(null);
  const backTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditingFront) {
      frontTextareaRef.current?.focus();
    }
  }, [isEditingFront]);

  useEffect(() => {
    if (isEditingBack) {
      backTextareaRef.current?.focus();
    }
  }, [isEditingBack]);

  useEffect(() => {
    if (isExpanded) {
      if (!text) setIsEditing(true);
    } else {
      setIsEditing(false);
    }
  }, [isExpanded, text]);

  useEffect(() => {
    if (isExpanded) {
      if (!frontText) setIsEditingFront(true);
      if (!backText) setIsEditingBack(true);
    } else {
      setIsEditingFront(false);
      setIsEditingBack(false);
    }
  }, [isExpanded, frontText, backText]);

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
            const textarea = e.target as HTMLTextAreaElement;
            const start = textarea.selectionStart ?? 0;
            const end = textarea.selectionEnd ?? 0;
            
            let currentText = '';
            if (field === 'text') currentText = text || '';
            else if (field === 'frontText') currentText = frontText || '';
            else if (field === 'backText') currentText = backText || '';
            
            const imageMarkdown = `\n<img src="${dataUrl}" width="100%" />\n`;
            const updatedText = currentText.substring(0, start) + imageMarkdown + currentText.substring(end);
            
            onUpdate({ [field]: updatedText });
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

    const handleResizePointerDown = (e: PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      isResizingImage.current = true;
      resizeStartPointerX.current = e.clientX;
      resizeStartWidthPercent.current = sizePercent;
      
      const target = e.target as HTMLElement;
      if (typeof target.setPointerCapture === 'function') {
        target.setPointerCapture(e.pointerId);
      }
    };

    const handleResizePointerMove = (e: PointerEvent) => {
      if (!isResizingImage.current) return;
      e.stopPropagation();
      
      const target = e.target as HTMLElement;
      const container = target.closest('.image-wrapper-container') as HTMLElement;
      if (!container) return;
      
      const parent = container.parentElement;
      if (!parent) return;
      
      const parentRect = parent.getBoundingClientRect();
      if (parentRect.width === 0) return;
      
      const deltaX = e.clientX - resizeStartPointerX.current;
      const deltaPercent = (deltaX / parentRect.width) * 100;
      const newPercent = Math.max(20, Math.min(100, Math.round(resizeStartWidthPercent.current + deltaPercent)));
      
      onSizeChange(newPercent);
    };

    const handleResizePointerUp = (e: PointerEvent) => {
      if (isResizingImage.current) {
        isResizingImage.current = false;
        const target = e.target as HTMLElement;
        if (typeof target.releasePointerCapture === 'function') {
          target.releasePointerCapture(e.pointerId);
        }
        triggerAutoSave();
      }
    };

    return (
      <div 
        className="image-wrapper-container"
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
            onDblClick={() => onViewFullscreen?.(url)}
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
                backdropFilter: 'blur(2px)',
                pointerEvents: 'none'
              }}
            >
              {/* Top controls: Delete */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', pointerEvents: 'auto' }}>
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

              {/* Grab handle at bottom right corner */}
              <div 
                onPointerDown={handleResizePointerDown}
                onPointerMove={handleResizePointerMove}
                onPointerUp={handleResizePointerUp}
                onPointerCancel={handleResizePointerUp}
                style={{ 
                  position: 'absolute',
                  right: '4px',
                  bottom: '4px',
                  width: '14px',
                  height: '14px',
                  cursor: 'se-resize',
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '3px',
                  border: '1px solid rgba(0,0,0,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'auto',
                  userSelect: 'none',
                  touchAction: 'none'
                }}
                title="Drag to resize"
              >
                <span style={{ fontSize: '8px', color: '#666', lineHeight: 1, pointerEvents: 'none' }}>⤱</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const updateInlineImageSize = (src: string, newWidth: number, field: 'text' | 'frontText' | 'backText') => {
    let currentText = '';
    if (field === 'text') currentText = text || '';
    else if (field === 'frontText') currentText = frontText || '';
    else if (field === 'backText') currentText = backText || '';

    const srcIndex = currentText.indexOf(src);
    if (srcIndex === -1) return;

    const tagStartIndex = currentText.lastIndexOf('<img', srcIndex);
    const tagEndIndex = currentText.indexOf('>', srcIndex);
    if (tagStartIndex !== -1 && tagEndIndex !== -1 && tagStartIndex < srcIndex) {
      const imageTag = currentText.substring(tagStartIndex, tagEndIndex + 1);
      let updatedTag = imageTag;
      const widthMatch = imageTag.match(/width=["'][^"']*["']/);
      if (widthMatch) {
        updatedTag = imageTag.replace(widthMatch[0], `width="${newWidth}%"`);
      } else {
        if (imageTag.endsWith('/>')) {
          updatedTag = imageTag.substring(0, imageTag.length - 2) + ` width="${newWidth}%" />`;
        } else {
          updatedTag = imageTag.substring(0, imageTag.length - 1) + ` width="${newWidth}%">`;
        }
      }
      const newText = currentText.substring(0, tagStartIndex) + updatedTag + currentText.substring(tagEndIndex + 1);
      onUpdate({ [field]: newText });
    }
  };

  const deleteInlineImage = (src: string, field: 'text' | 'frontText' | 'backText') => {
    let currentText = '';
    if (field === 'text') currentText = text || '';
    else if (field === 'frontText') currentText = frontText || '';
    else if (field === 'backText') currentText = backText || '';

    const srcIndex = currentText.indexOf(src);
    if (srcIndex === -1) return;

    const tagStartIndex = currentText.lastIndexOf('<img', srcIndex);
    const tagEndIndex = currentText.indexOf('>', srcIndex);
    if (tagStartIndex !== -1 && tagEndIndex !== -1 && tagStartIndex < srcIndex) {
      const newText = currentText.substring(0, tagStartIndex) + currentText.substring(tagEndIndex + 1);
      onUpdate({ [field]: newText.trim() });
      setActiveHoveredImg(null);
    }
  };

  const handlePreviewDoubleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'img') {
      const src = target.getAttribute('src');
      if (src) {
        onViewFullscreen?.(src);
      }
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizingImage.current) return;
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'img' && target.closest('.markdown-preview')) {
      let field: 'text' | 'frontText' | 'backText' = 'text';
      if (type === 'flashcard') {
        const isBack = !!target.closest('.flashcard-body-container > div:last-child');
        field = isBack ? 'backText' : 'frontText';
      }
      setActiveHoveredImg({ element: target as HTMLImageElement, field });
    }
  };

  const handleMouseLeave = (e: MouseEvent) => {
    if (isResizingImage.current) return;
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && (relatedTarget.closest('.image-floating-overlay') || relatedTarget.tagName.toLowerCase() === 'img')) {
      return;
    }
    setActiveHoveredImg(null);
  };

  const getMarkdownHtml = (content: string) => {
    const rawHtml = marked.parse(content || '') as string;
    return DOMPurify.sanitize(rawHtml);
  };

  const renderMarkdownPreview = (content: string, placeholder: string, onClick: () => void) => {
    if (!content) {
      return (
        <div 
          onClick={onClick}
          style={{ 
            flex: 1, 
            color: type === 'sticky' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)', 
            fontStyle: 'italic', 
            fontSize: '14px', 
            cursor: 'text',
            userSelect: 'none',
            minHeight: '30px'
          }}
        >
          {placeholder}
        </div>
      );
    }
    
    return (
      <div 
        onClick={onClick}
        onDblClick={handlePreviewDoubleClick}
        className="markdown-preview"
        style={{ 
          flex: 1, 
          color: textColor, 
          fontSize: '14px', 
          cursor: 'text',
          wordBreak: 'break-word',
          overflowY: 'auto',
          minHeight: '30px'
        }}
        dangerouslySetInnerHTML={{ __html: getMarkdownHtml(content) }}
      />
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
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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
            <GripHorizontal size={14} color={headerColor} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: headerColor, textTransform: 'uppercase' }}>
              {type}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '5px', marginLeft: '6px', alignItems: 'center' }}>
            {['#fbbf24', '#4ade80', '#3b82f6', '#f87171', '#c084fc', '#ffffff', '#000000'].map(c => (
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
                  border: color === c ? (type === 'sticky' ? (isColorDark(c) ? '1px solid #fff' : '1px solid #000') : '1px solid #fff') : '1px solid rgba(255,255,255,0.1)',
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
        
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (type === 'flashcard') {
                const newEdit = !(isEditingFront || isEditingBack);
                setIsEditingFront(newEdit);
                setIsEditingBack(newEdit);
              } else {
                setIsEditing(!isEditing);
              }
            }}
            style={{
              background: type === 'sticky' ? (isColorDark(color) ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)') : 'rgba(255, 255, 255, 0.15)',
              border: 'none',
              borderRadius: '4px',
              color: headerColor,
              padding: '2px 6px',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              marginRight: '6px',
              opacity: 0.8,
              transition: 'opacity 0.15s'
            }}
            title="Toggle Edit/Preview"
          >
            {(() => {
              if (type === 'flashcard') {
                return (isEditingFront || isEditingBack) ? 'Preview' : 'Edit';
              }
              return isEditing ? 'Preview' : 'Edit';
            })()}
          </button>

          <label style={{ cursor: 'pointer', display: 'flex', padding: '4px', opacity: 0.7 }}>
            <ImageIcon size={14} color={headerColor} />
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </label>
          <button 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', opacity: 0.7 }}
            onClick={(e) => { e.stopPropagation(); onUpdate({ isExpanded: false }); }}
            title="Compress to icon"
          >
            <Minimize2 size={14} color={headerColor} />
          </button>
          <button 
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', opacity: 0.7 }}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Delete"
          >
            <Trash2 size={14} color={headerColor} />
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '12px', gap: '8px', overflowY: 'auto' }}>
        <style>{`
          .markdown-preview p { margin: 0 0 8px 0; }
          .markdown-preview p:last-child { margin: 0; }
          .markdown-preview ul, .markdown-preview ol { margin: 4px 0; padding-left: 20px; }
          .markdown-preview h1, .markdown-preview h2, .markdown-preview h3 { font-size: 15px; margin: 8px 0 4px 0; font-weight: 600; }
          .markdown-preview code { font-family: monospace; background: ${type === 'sticky' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)'}; padding: 2px 4px; border-radius: 4px; font-size: 90%; }
        `}</style>

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
              {isEditingFront ? (
                <textarea
                  ref={frontTextareaRef}
                  value={frontText}
                  onInput={(e) => onUpdate({ frontText: (e.target as HTMLTextAreaElement).value })}
                  onPaste={(e) => handlePaste(e, 'frontText')}
                  onBlur={onBlur}
                  placeholder="Front (Question)..."
                  style={{ flex: 1, minHeight: '30px', background: 'transparent', border: 'none', resize: 'none', color: '#fff', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
                />
              ) : (
                renderMarkdownPreview(frontText || '', 'Front (Question)... (Click to edit)', () => {
                  setIsEditingFront(true);
                  onFocus?.();
                })
              )}
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
              {isEditingBack ? (
                <textarea
                  ref={backTextareaRef}
                  value={backText}
                  onInput={(e) => onUpdate({ backText: (e.target as HTMLTextAreaElement).value })}
                  onPaste={(e) => handlePaste(e, 'backText')}
                  onBlur={onBlur}
                  placeholder="Back (Answer)..."
                  style={{ flex: 1, minHeight: '30px', background: 'transparent', border: 'none', resize: 'none', color: '#fff', fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
                />
              ) : (
                renderMarkdownPreview(backText || '', 'Back (Answer)... (Click to edit)', () => {
                  setIsEditingBack(true);
                  onFocus?.();
                })
              )}
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
            {isEditing ? (
              <textarea
                ref={textareaRef}
                value={text}
                onInput={(e) => onUpdate({ text: (e.target as HTMLTextAreaElement).value })}
                onPaste={(e) => handlePaste(e, 'text')}
                onBlur={onBlur}
                placeholder={`Type ${type} text...`}
                style={{ flex: 1, background: 'transparent', border: 'none', resize: 'none', color: textColor, fontFamily: 'inherit', fontSize: '14px', outline: 'none' }}
              />
            ) : (
              renderMarkdownPreview(text || '', `Type ${type} text... (Click to edit)`, () => {
                setIsEditing(true);
                onFocus?.();
              })
            )}
          </div>
        )}
      </div>

      {activeHoveredImg && containerRef.current && (() => {
        const currentSrc = activeHoveredImg.element.getAttribute('src') || '';
        let currentImgElement = activeHoveredImg.element;
        if (!currentImgElement.isConnected) {
          const allImgs = containerRef.current.querySelectorAll('img');
          for (let i = 0; i < allImgs.length; i++) {
            if (allImgs[i].getAttribute('src') === currentSrc) {
              currentImgElement = allImgs[i];
              break;
            }
          }
        }
        
        if (!activeHoveredImg.element.isConnected && currentImgElement.isConnected) {
          activeHoveredImg.element = currentImgElement;
        }

        const imgRect = currentImgElement.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const top = imgRect.top - containerRect.top;
        const left = imgRect.left - containerRect.left;
        const width = imgRect.width;
        const height = imgRect.height;

        return (
          <div 
            className="image-floating-overlay"
            style={{
              position: 'absolute',
              top: `${top}px`,
              left: `${left}px`,
              width: `${width}px`,
              height: `${height}px`,
              border: '1.5px dashed #3a76f0',
              boxSizing: 'border-box',
              pointerEvents: 'none',
              zIndex: 50,
              borderRadius: '4px'
            }}
            onMouseLeave={handleMouseLeave}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                const src = activeHoveredImg.element.getAttribute('src') || '';
                deleteInlineImage(src, activeHoveredImg.field);
              }}
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                background: 'rgba(239, 68, 68, 0.9)',
                border: 'none',
                borderRadius: '4px',
                color: '#fff',
                padding: '2px 6px',
                cursor: 'pointer',
                fontSize: '10px',
                pointerEvents: 'auto',
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
              }}
              title="Delete image"
            >
              🗑️ Delete
            </button>

            <div 
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                isResizingImage.current = true;
                resizeStartPointerX.current = e.clientX;
                
                const widthAttr = activeHoveredImg.element.getAttribute('width');
                let parsedWidth = 100;
                if (widthAttr && widthAttr.endsWith('%')) {
                  parsedWidth = parseInt(widthAttr);
                } else if (widthAttr) {
                  parsedWidth = parseInt(widthAttr);
                }
                resizeStartWidthPercent.current = parsedWidth;
                
                const target = e.target as HTMLElement;
                if (typeof target.setPointerCapture === 'function') {
                  target.setPointerCapture(e.pointerId);
                }
              }}
              onPointerMove={(e) => {
                if (!isResizingImage.current) return;
                e.stopPropagation();
                
                const parent = activeHoveredImg.element.parentElement;
                if (!parent) return;
                
                const parentRect = parent.getBoundingClientRect();
                if (parentRect.width === 0) return;
                
                const deltaX = e.clientX - resizeStartPointerX.current;
                const deltaPercent = (deltaX / parentRect.width) * 100;
                const newPercent = Math.max(20, Math.min(100, Math.round(resizeStartWidthPercent.current + deltaPercent)));
                
                const src = activeHoveredImg.element.getAttribute('src') || '';
                updateInlineImageSize(src, newPercent, activeHoveredImg.field);
              }}
              onPointerUp={(e) => {
                if (isResizingImage.current) {
                  isResizingImage.current = false;
                  const target = e.target as HTMLElement;
                  if (typeof target.releasePointerCapture === 'function') {
                    target.releasePointerCapture(e.pointerId);
                  }
                  triggerAutoSave();
                  setActiveHoveredImg(null);
                }
              }}
              style={{ 
                position: 'absolute',
                right: '4px',
                bottom: '4px',
                width: '14px',
                height: '14px',
                cursor: 'se-resize',
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '3px',
                border: '1px solid rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'auto',
                userSelect: 'none',
                touchAction: 'none',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
              title="Drag to resize"
            >
              <span style={{ fontSize: '8px', color: '#333', fontWeight: 'bold', lineHeight: 1, pointerEvents: 'none' }}>⤱</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
