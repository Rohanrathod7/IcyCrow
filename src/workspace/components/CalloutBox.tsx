import { useState, useRef, useEffect } from 'preact/hooks';
import { Callout, updateCalloutText, deleteCallout, activeCalloutId, persistAnnotations } from '../store/annotation-state';
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
      deleteCallout(callout.id);
      persistAnnotations(url);
    }
  };

  // Position at the box coordinates (arrow tip)
  const style = {
    position: 'absolute' as const,
    left: `${callout.box.x * scale}px`,
    top: `${callout.box.y * scale}px`,
    transform: 'translate(14px, -50%)', // Slightly more offset
    zIndex: 10,
    minWidth: '160px',
    maxWidth: '300px',
    padding: '4px',
    borderRadius: '12px',
    background: 'rgba(28, 28, 30, 0.4)',
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    border: `1px solid ${isActive ? callout.color : 'rgba(255,255,255,0.1)'}`,
    boxShadow: `0 12px 24px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)`,
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    cursor: isEraser ? 'cell' : 'default'
  };

  return (
    <div 
      className={`callout-box-container ${isActive ? 'active' : ''}`}
      style={style}
      onPointerEnter={handlePointerEnter}
    >
      <div style={{ position: 'relative', width: '100%' }}>
        {isActive ? (
          <textarea
            ref={textareaRef}
            className="callout-textarea"
            value={tempText}
            onInput={(e) => setTempText((e.target as HTMLTextAreaElement).value)}
            onBlur={handleBlur}
            placeholder="Type note..."
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              width: '100%',
              height: 'auto',
              minHeight: '60px',
              resize: 'none' as const,
              outline: 'none',
              fontSize: `${14 * scale}px`,
              padding: '12px',
              lineHeight: 1.5
            }}
          />
        ) : (
          <div 
            className="callout-text-display"
            onClick={() => activeCalloutId.value = callout.id}
            style={{
              padding: '12px',
              fontSize: `${14 * scale}px`,
              color: 'rgba(255,255,255,0.9)',
              cursor: 'text',
              minHeight: '24px',
              whiteSpace: 'pre-wrap' as const,
              lineHeight: 1.5,
              fontWeight: 500
            }}
          >
            {callout.text || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Add a note...</span>}
          </div>
        )}

        {/* Status Indicator / Accent */}
        <div style={{
          position: 'absolute',
          left: '0',
          top: '12px',
          bottom: '12px',
          width: '3px',
          background: callout.color,
          borderRadius: '2px',
          opacity: 0.8
        }} />
      </div>
    </div>
  );
}
