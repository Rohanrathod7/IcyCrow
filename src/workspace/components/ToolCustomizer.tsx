import { useRef, useEffect, useState } from 'preact/hooks';
import { activeTool, activeCustomizationTool, toolSettings } from '../store/viewer-state';
import { removeToolInstance } from '../store/toolbar-state';

function hexToRgba(hex: string, alpha: number): string {
  if (!hex.startsWith('#')) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const PipetteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="m2 22 1-1c.6-.6.6-1.5 0-2.1L12.5 9.4 14.6 11.5 5.1 21c-.6.6-1.5.6-2.1 0L2 22Z"/>
    <path d="M11.5 5.5 13 4c.6-.6 1.5-.6 2.1 0l3.9 3.9c.6.6.6 1.5 0 2.1l-1.5 1.5"/>
    <path d="M19 11 13 5"/>
    <path d="M9 17 7 15"/>
  </svg>
);

export const ToolCustomizer = () => {
  const toolId = activeCustomizationTool.value;
  if (!toolId) return null;

  // Resolve base type for settings fallback (e.g., 'draw-red' -> 'draw')
  const baseType = toolId.split('-')[0];
  const settings = toolSettings.value[toolId] || toolSettings.value[baseType];
  
  if (!settings) return null;

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const path = e.composedPath() as HTMLElement[];
      if (modalRef.current && !path.includes(modalRef.current)) {
        // Also ignore if clicking on a tool button
        const isToolButton = path.some(el => 
          el?.classList?.contains('tool-item') || 
          el?.classList?.contains('dial-tool-button') ||
          el?.closest?.('.tool-item') ||
          el?.closest?.('.dial-tool-button')
        );
        if (isToolButton) {
          return;
        }
        activeCustomizationTool.value = null;
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSizeChange = (e: any) => {
    const newSize = parseInt(e.target.value, 10);
    toolSettings.value = {
      ...toolSettings.value,
      [toolId]: { ...settings, size: newSize }
    };
  };

  const handleOpacityChange = (e: any) => {
    const newOpacity = parseFloat(e.target.value);
    toolSettings.value = {
      ...toolSettings.value,
      [toolId]: { ...settings, opacity: newOpacity }
    };
  };

  const handleClose = () => {
    activeCustomizationTool.value = null;
  };

  const [isPreviewDark, setIsPreviewDark] = useState(false);

  const isEraser = baseType === 'eraser';
  const isSticky = baseType === 'sticky';
  const isCallout = baseType === 'callout';

  return (
    <div 
      ref={modalRef}
      className="tool-customizer-modal"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '650px',
        height: '480px', // slightly taller for extra slider
        background: '#121214',
        borderRadius: '24px',
        zIndex: 10005,
        color: '#fff',
        boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
        display: 'flex',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      {/* Left Pane: Preview */}
      <div style={{
        flex: 1,
        background: isPreviewDark ? '#1a1a1e' : '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        transition: 'background-color 0.3s ease',
        padding: '24px',
        boxSizing: 'border-box'
      }}>
        <div style={{ 
          position: 'absolute', 
          top: '20px', 
          left: '20px', 
          color: isPreviewDark ? '#888' : '#ccc', 
          fontSize: '12px', 
          fontWeight: 600,
          border: `1px dashed ${isPreviewDark ? '#444' : '#eee'}`,
          padding: '4px 8px',
          borderRadius: '4px'
        }}>
          Preview Area
        </div>

        {/* Light/Dark Toggle */}
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          gap: '4px',
          background: isPreviewDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          padding: '2px',
          borderRadius: '8px'
        }}>
          <button 
            onClick={() => setIsPreviewDark(false)}
            style={{
              border: 'none',
              background: !isPreviewDark ? (isPreviewDark ? 'rgba(255,255,255,0.1)' : '#fff') : 'transparent',
              color: isPreviewDark ? '#ccc' : '#333',
              fontSize: '10px',
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: !isPreviewDark ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Light
          </button>
          <button 
            onClick={() => setIsPreviewDark(true)}
            style={{
              border: 'none',
              background: isPreviewDark ? '#333' : 'transparent',
              color: isPreviewDark ? '#fff' : '#666',
              fontSize: '10px',
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: isPreviewDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
            }}
          >
            Dark
          </button>
        </div>
        
        {baseType === 'highlight' ? (
          <div style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '15px',
            color: isPreviewDark ? '#e2e8f0' : '#1e293b',
            lineHeight: '1.6',
            textAlign: 'left',
            padding: '16px',
            borderRadius: '12px',
            border: `1px solid ${isPreviewDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`,
            background: isPreviewDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
            maxWidth: '100%',
            wordBreak: 'break-word'
          }}>
            IcyCrow empowers your research by letting you <mark style={{
              backgroundColor: hexToRgba(settings.color || '#eab308', settings.opacity ?? 0.4),
              color: 'inherit',
              padding: '2px 4px',
              borderRadius: '4px',
              transition: 'background-color 0.2s ease'
            }}>highlight important details</mark> and sync annotations natively.
          </div>
        ) : (
          <div style={{
            width: `${settings.size * 2}px`,
            height: `${settings.size * 2}px`,
            backgroundColor: isEraser ? 'transparent' : (settings.color || '#3b82f6'),
            border: isEraser ? '2px solid #333' : 'none',
            borderRadius: '50%',
            opacity: settings.opacity ?? 1,
            boxShadow: isEraser ? 'none' : '0 10px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}>
            {isEraser && <div style={{ width: '4px', height: '4px', background: '#333', borderRadius: '50%' }} />}
          </div>
        )}
      </div>

      {/* Right Pane: Controls */}
      <div style={{
        flex: 1.2,
        padding: '24px 32px 32px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        position: 'relative',
        overflowY: 'auto',
        maxHeight: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '32px', 
              height: '32px', 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              position: 'relative'
            }}>
               🎨
               {baseType === 'highlight' && (
                 <span style={{
                   position: 'absolute',
                   bottom: '2px',
                   right: '2px',
                   width: '8px',
                   height: '8px',
                   borderRadius: '50%',
                   background: settings.color || '#eab308',
                   border: '1.5px solid #121214'
                 }} />
               )}
            </div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
              {baseType === 'highlight' && toolId.startsWith('highlight-') 
                ? `Edit Highlight (${toolId.split('-')[1].charAt(0).toUpperCase() + toolId.split('-')[1].slice(1)})`
                : `Edit ${baseType.charAt(0).toUpperCase() + baseType.slice(1)}`}
            </h2>
          </div>
          <button 
            onClick={handleClose}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: 'none', 
              color: '#fff', 
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Thickness Slider */}
        {baseType !== 'highlight' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600 }}>
              <span>{isSticky ? 'Icon Size' : (isEraser ? 'Eraser Size' : (isCallout ? 'Arrow Thickness' : 'Thickness'))}</span>
              <span style={{ color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{settings.size}pt</span>
            </div>
            <div className="custom-slider-container">
              <input 
                type="range" 
                min={isSticky ? "12" : "1"} 
                max={isSticky ? "64" : "100"} 
                value={settings.size}
                onInput={handleSizeChange}
                className="premium-slider"
                style={{
                  background: `linear-gradient(to right, #3a76f0 0%, #3a76f0 ${((settings.size - (isSticky ? 12 : 1)) / ((isSticky ? 64 : 100) - (isSticky ? 12 : 1))) * 100}%, rgba(255, 255, 255, 0.15) ${((settings.size - (isSticky ? 12 : 1)) / ((isSticky ? 64 : 100) - (isSticky ? 12 : 1))) * 100}%, rgba(255, 255, 255, 0.15) 100%)`
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '-6px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                <span>{isSticky ? '12px' : '1px'}</span>
                <span>{isSticky ? '64px' : '100px'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Opacity Slider */}
        {!isEraser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600 }}>
              <span>Opacity</span>
              <span style={{ color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>{Math.round((settings.opacity ?? (baseType === 'highlight' ? 0.4 : 1)) * 100)}%</span>
            </div>
            <div className="custom-slider-container">
              <input 
                type="range" 
                min="0.1" 
                max="1.0" 
                step="0.01"
                value={settings.opacity ?? (baseType === 'highlight' ? 0.4 : 1)}
                onInput={handleOpacityChange}
                className="premium-slider"
                style={{
                  background: `linear-gradient(to right, ${hexToRgba(settings.color || '#3b82f6', 0.15)} 0%, ${settings.color || '#3b82f6'} 100%)`
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '-6px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                <span>10% (Transparent)</span>
                <span>100% (Solid)</span>
              </div>
            </div>
          </div>
        )}

        {/* Highlight Mode Toggle */}
        {baseType === 'highlight' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 600 }}>Highlight Mode</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  toolSettings.value = {
                    ...toolSettings.value,
                    highlight: { ...settings, mode: 'text' }
                  };
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: (settings.mode || 'text') === 'text' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: (settings.mode || 'text') === 'text' ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Text Selection
              </button>
              <button
                onClick={() => {
                  toolSettings.value = {
                    ...toolSettings.value,
                    highlight: { ...settings, mode: 'freehand' }
                  };
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: settings.mode === 'freehand' ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: settings.mode === 'freehand' ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Freehand (Page)
              </button>
            </div>
          </div>
        )}

        {/* Color Palette */}
        {!isEraser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Colour</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
                {['#eab308', '#22c55e', '#3b82f6', '#ef4444', '#ec4899', '#f97316', '#a855f7', '#ffffff', '#000000'].map(c => (
                  <div 
                    key={c}
                    onClick={() => {
                        toolSettings.value = { ...toolSettings.value, [toolId]: { ...settings, color: c } };
                    }}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: c,
                      cursor: 'pointer',
                      border: settings.color === c ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)',
                      boxShadow: settings.color === c ? '0 0 10px rgba(255,255,255,0.3)' : 'none',
                      transition: 'transform 0.15s ease'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                ))}

                {/* EyeDropper Button */}
                {typeof window !== 'undefined' && 'EyeDropper' in window && (
                  <button
                    onClick={async () => {
                      try {
                        const eyeDropper = new (window as any).EyeDropper();
                        const result = await eyeDropper.open();
                        toolSettings.value = { 
                          ...toolSettings.value, 
                          [toolId]: { ...settings, color: result.sRGBHex } 
                        };
                      } catch (err) {
                        console.log('Eye dropper closed or failed:', err);
                      }
                    }}
                    title="Select color from screen"
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      transition: 'all 0.15s ease',
                      outline: 'none'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.transform = 'scale(1.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    <PipetteIcon />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Remove from Toolbar Button */}
        <div style={{ marginTop: 'auto', marginBottom: '16px' }}>
          <button
            onClick={() => {
              removeToolInstance(toolId);
              if (activeTool.value === toolId) activeTool.value = 'select';
              handleClose();
            }}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as any).style.background = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as any).style.background = 'rgba(239, 68, 68, 0.1)';
            }}
          >
            Remove from Toolbar
          </button>
        </div>

        {/* Footer info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.3, fontSize: '11px' }}>
           <span>ID: {crypto.randomUUID().slice(0, 8)}</span>
           <span>Antigravity Render Engine v2.0</span>
        </div>
      </div>
    </div>
  );
};
