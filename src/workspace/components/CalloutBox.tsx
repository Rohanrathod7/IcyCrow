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
    transform: 'translate(10px, -50%)', // Offset from arrow tip
    zIndex: 10,
    minWidth: '120px'
  };

  return (
    <div 
      className={`glass-panel callout-box-container ${isActive ? 'active' : ''}`}
      style={style}
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
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            width: '100%',
            height: 'auto',
            minHeight: '40px',
            resize: 'none' as const,
            outline: 'none',
            fontSize: `${14 * scale}px`,
            padding: '8px'
          }}
        />
      ) : (
        <div 
          className="callout-text-display"
          onClick={() => activeCalloutId.value = callout.id}
          style={{
            padding: '8px',
            fontSize: `${14 * scale}px`,
            color: 'white',
            cursor: 'text',
            minHeight: '20px',
            whiteSpace: 'pre-wrap' as const
          }}
        >
          {callout.text || <span style={{ opacity: 0.5 }}>Empty callout</span>}
        </div>
      )}
      
      {/* Visual border based on tool color */}
      <div style={{
        position: 'absolute',
        inset: 0,
        border: `1px solid ${callout.color}`,
        borderRadius: '8px',
        opacity: 0.3,
        pointerEvents: 'none'
      }} />
    </div>
  );
}
