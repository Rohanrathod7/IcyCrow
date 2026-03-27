import { TOOL_LIBRARY, addToolToToolbar, isToolPickerOpen } from '../store/toolbar-state';
import { MousePointer2, PenTool, Brush, Highlighter, Type } from 'lucide-preact';

const ICONS: Record<string, any> = {
  draw: PenTool,
  brush: Brush,
  highlight: Highlighter,
  text: Type,
  select: MousePointer2
};

export const ToolLibraryPicker = () => {
  if (!isToolPickerOpen.value) return null;

  return (
    <div 
      className="tool-customizer-modal"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '500px',
        maxHeight: '80vh',
        background: '#121214',
        borderRadius: '24px',
        zIndex: 10010,
        color: '#fff',
        boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Tool Library</h2>
        <button 
          onClick={() => isToolPickerOpen.value = false}
          style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%' }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '24px', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {TOOL_LIBRARY.map((tool) => {
          const Icon = ICONS[tool.type] || PenTool;
          return (
            <div 
              key={tool.id}
              onClick={() => addToolToToolbar(tool)}
              style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '16px',
                borderRadius: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: '1px solid rgba(255,255,255,0.05)',
                transition: 'all 0.2s'
              }}
              className="library-item"
            >
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '10px', 
                background: 'rgba(255,255,255,0.05)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <Icon size={20} color={tool.color} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{tool.label}</span>
                <span style={{ fontSize: '11px', opacity: 0.5 }}>{tool.type} • {tool.size || 0}pt</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', opacity: 0.4 }}>
         Select a tool to add it to your toolbar.
      </div>
    </div>
  );
};
