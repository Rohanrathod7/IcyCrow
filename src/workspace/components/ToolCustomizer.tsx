import { activeCustomizationTool, toolSettings } from '../store/viewer-state';

export const ToolCustomizer = () => {
  const toolId = activeCustomizationTool.value;
  if (!toolId) return null;

  // Resolve base type for settings fallback (e.g., 'draw-red' -> 'draw')
  const baseType = toolId.split('-')[0];
  const settings = toolSettings.value[toolId] || toolSettings.value[baseType];
  
  if (!settings) return null;

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

  const isEraser = baseType === 'eraser';
  const isSticky = baseType === 'sticky';
  const isCallout = baseType === 'callout';

  return (
    <div 
      className="tool-customizer-modal"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '650px',
        height: '420px', // slightly taller for extra slider
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
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <div style={{ 
          position: 'absolute', 
          top: '20px', 
          left: '20px', 
          color: '#ccc', 
          fontSize: '12px', 
          fontWeight: 600,
          border: '1px dashed #eee',
          padding: '4px 8px',
          borderRadius: '4px'
        }}>
          Preview Area
        </div>
        
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
          justifyContent: 'center'
        }}>
           {isEraser && <div style={{ width: '4px', height: '4px', background: '#333', borderRadius: '50%' }} />}
        </div>

        <div style={{ marginTop: '20px', color: '#666', fontSize: '14px', fontWeight: 500 }}>
           {isEraser ? 'Eraser Impact Zone' : (isSticky ? 'Note Icon Size' : 'Stroke Thickness')}
        </div>
      </div>

      {/* Right Pane: Controls */}
      <div style={{
        flex: 1.2,
        padding: '32px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               🎨
            </div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Edit {baseType}</h2>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 600 }}>
            <span>{isSticky ? 'Icon Size' : (isEraser ? 'Eraser Size' : 'Thickness')}</span>
            <span style={{ color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>{settings.size}pt</span>
          </div>
          <div className="custom-slider-container">
            <input 
              type="range" 
              min={isSticky ? "12" : "1"} 
              max={isSticky ? "64" : "100"} 
              value={settings.size}
              onInput={handleSizeChange}
              className="premium-slider"
            />
          </div>
        </div>

        {/* Transparency Slider */}
        {!isEraser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 600 }}>
              <span>Transparency</span>
              <span style={{ color: '#fff', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>{Math.round((settings.opacity ?? 1) * 100)}%</span>
            </div>
            <div className="custom-slider-container">
              <input 
                type="range" 
                min="0.1" 
                max="1.0" 
                step="0.01"
                value={settings.opacity ?? 1}
                onInput={handleOpacityChange}
                className="premium-slider"
              />
            </div>
          </div>
        )}

        {/* Color Palette */}
        {!isEraser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', fontWeight: 600 }}>Colour</div>
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff', '#000000'].map(c => (
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
                      boxShadow: settings.color === c ? '0 0 10px rgba(255,255,255,0.3)' : 'none'
                    }}
                  />
                ))}
             </div>
          </div>
        )}

        {/* Footer info */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', opacity: 0.3, fontSize: '11px' }}>
           <span>ID: {crypto.randomUUID().slice(0, 8)}</span>
           <span>Antigravity Render Engine v2.0</span>
        </div>
      </div>
    </div>
  );
};
