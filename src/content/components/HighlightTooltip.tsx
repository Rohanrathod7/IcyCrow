import { h } from 'preact';
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
        transform: 'translate(-50%, -100%) translateY(-10px)',
        zIndex: 2147483647,
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        borderRadius: '8px',
        padding: '8px',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        pointerEvents: 'auto',
        border: '1px solid #e0e0e0',
      }}
    >
      <div style={{ display: 'flex', gap: '4px' }}>
        {colors.map(color => (
          <button
            key={color}
            onClick={() => selectedColor.value = color}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: getColorValue(color),
              border: selectedColor.value === color ? '2px solid #000' : '1px solid #ccc',
              cursor: 'pointer',
              padding: 0,
            }}
            title={color}
          />
        ))}
      </div>
      
      <div style={{ width: '1px', height: '20px', backgroundColor: '#eee' }} />
      
      <button
        onClick={onHighlight}
        style={{
          border: 'none',
          backgroundColor: '#007bff',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '12px',
        }}
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
