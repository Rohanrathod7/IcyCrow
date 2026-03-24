import { tooltipVisible, tooltipPos, selectedColor } from '../state';
import { HighlightColor } from '../../lib/types';
import { captureAnchor } from '../anchoring';
import { wrapRange } from '../highlighter';

/**
 * Floating Tooltip for text selection
 * Following preact-ui SKILL and LLD §5
 */
export const HighlightTooltip = () => {
  if (!tooltipVisible.value) return null;

  const onHighlight = () => {
    const selection = window.getSelection();
    if (!selection) return;
    
    const anchor = captureAnchor(selection);
    if (anchor) {
      const range = selection.getRangeAt(0);
      wrapRange(range, crypto.randomUUID(), selectedColor.value);
      
      // Clear selection and hide tooltip
      selection.removeAllRanges();
      tooltipVisible.value = false;
    }
  };

  const colors: HighlightColor[] = ['yellow', 'green', 'blue', 'pink', 'orange'];

  return (
    <div 
      id="icycrow-tooltip"
      style={{
        position: 'absolute',
        top: `${tooltipPos.value.y}px`,
        left: `${tooltipPos.value.x}px`,
        transform: 'translate(-50%, -100%) translateY(-12px)',
        zIndex: 2147483647,
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        boxShadow: '0 10px 30px -10px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '16px',
        padding: '6px 10px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        pointerEvents: 'auto',
        animation: 'icycrow-pop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      {/* Inline Styles for Animation */}
      <style>{`
        @keyframes icycrow-pop {
          0% { transform: translate(-50%, -100%) translateY(0) scale(0.9); opacity: 0; }
          100% { transform: translate(-50%, -100%) translateY(-12px) scale(1); opacity: 1; }
        }
      `}</style>

      <div style={{ display: 'flex', gap: '6px' }}>
        {colors.map(color => (
          <button
            key={color}
            onClick={() => selectedColor.value = color}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: getColorValue(color),
              border: selectedColor.value === color ? '2px solid #3a76f0' : '1px solid rgba(0,0,0,0.1)',
              cursor: 'pointer',
              padding: 0,
              transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s',
              boxShadow: selectedColor.value === color ? '0 0 10px rgba(58, 118, 240, 0.4)' : 'none',
              transform: selectedColor.value === color ? 'scale(1.1)' : 'scale(1)',
            }}
            onMouseEnter={(e) => (e.currentTarget as any).style.transform = 'scale(1.15)'}
            onMouseLeave={(e) => (e.currentTarget as any).style.transform = selectedColor.value === color ? 'scale(1.1)' : 'scale(1)'}
            title={color}
          />
        ))}
      </div>
      
      <div style={{ width: '1px', height: '24px', background: 'rgba(0,0,0,0.06)' }} />
      
      <button
        onClick={onHighlight}
        style={{
          border: 'none',
          background: 'linear-gradient(135deg, #3a76f0 0%, #6366f1 100%)',
          color: 'white',
          padding: '6px 16px',
          borderRadius: '12px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '13px',
          fontFamily: 'inherit',
          boxShadow: '0 4px 12px rgba(58, 118, 240, 0.3)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget as any).style.filter = 'brightness(1.1)'}
        onMouseLeave={(e) => (e.currentTarget as any).style.filter = 'brightness(1)'}
      >
        Highlight
      </button>
    </div>
  );
};

function getColorValue(color: HighlightColor): string {
  const map: Record<HighlightColor, string> = {
    yellow: '#fff3bf',
    green: '#d3f9d8',
    blue: '#d0ebff',
    pink: '#ffdeeb',
    orange: '#ffe8cc'
  };
  return map[color];
}
