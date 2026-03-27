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
  const positionStyle = {
    position: 'absolute' as const,
    left: `${callout.box.x * scale}px`,
    top: `${callout.box.y * scale}px`,
    transform: 'translate(14px, -50%)',
    zIndex: 10,
    cursor: isEraser ? 'cell' : 'default',
    fontSize: `${14 * scale}px`,
  };

  return (
    <div 
      className={`callout-container ${isActive ? 'active' : ''}`}
      style={positionStyle}
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
          autoFocus
        />
      ) : (
        <div 
          className="callout-text-display"
          onClick={() => activeCalloutId.value = callout.id}
          style={{ cursor: 'text', minHeight: '24px', whiteSpace: 'pre-wrap' }}
        >
          {callout.text || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Add a note...</span>}
        </div>
      )}
    </div>
  );
}
