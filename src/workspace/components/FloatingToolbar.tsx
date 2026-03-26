import { viewerScale, activeTool, ToolType } from '../store/viewer-state';

export default function FloatingToolbar() {
  const tools: { id: ToolType; label: string; icon: string }[] = [
    { id: 'pan', label: 'Pan', icon: '✋' },
    { id: 'select', label: 'Select', icon: '🔍' },
    { id: 'highlight', label: 'Highlight', icon: '🖊️' },
    { id: 'draw', label: 'Draw', icon: '🎨' },
  ];

  const adjustScale = (delta: number) => {
    viewerScale.value = Math.min(Math.max(viewerScale.value + delta, 0.5), 3.0);
  };

  const resetScale = () => {
    viewerScale.value = 1.0;
  };

  return (
    <div className="floating-toolbar">
      {/* Zoom Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '12px' }}>
        <button onClick={() => adjustScale(-0.1)} style={buttonStyle}>−</button>
        <span onClick={resetScale} style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600, minWidth: '40px', textAlign: 'center', cursor: 'pointer' }}>
          {Math.round(viewerScale.value * 100)}%
        </span>
        <button onClick={() => adjustScale(0.1)} style={buttonStyle}>+</button>
      </div>

      {/* Tool Controls */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => activeTool.value = tool.id}
            title={tool.label}
            style={{
              ...buttonStyle,
              backgroundColor: activeTool.value === tool.id ? 'rgba(129, 140, 248, 0.2)' : 'transparent',
              color: activeTool.value === tool.id ? '#818cf8' : 'white',
              fontSize: '1rem'
            }}
          >
            {tool.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

const buttonStyle: any = {
  background: 'transparent',
  border: 'none',
  color: 'white',
  padding: '6px 10px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '1.1rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
};
