import { 
  toolbarPosition, 
  isToolbarSettingsOpen, 
  toolsOrder, 
  removeToolInstance, 
  resetToolbarLayout,
  toolMetadata,
  ToolbarPosition
} from '../store/toolbar-state';
import { pdfUrl } from '../store/viewer-state';
import { 
  Trash2, 
  RefreshCcw, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  MousePointer2,
  PenTool,
  Brush,
  Highlighter,
  Type,
  Eraser,
  Download,
  Upload
} from 'lucide-preact';
import { exportWorkspace, importWorkspace } from '../services/StateSyncService';

const ICONS: Record<string, any> = {
  draw: PenTool,
  brush: Brush,
  highlight: Highlighter,
  text: Type,
  eraser: Eraser,
  pan: MousePointer2,
  select: MousePointer2
};

export const ToolbarSettingsModal = () => {
  if (!isToolbarSettingsOpen.value) return null;

  const positions: { id: ToolbarPosition; label: string; Icon: any }[] = [
    { id: 'top', label: 'Top', Icon: ArrowUp },
    { id: 'bottom', label: 'Bottom', Icon: ArrowDown },
    { id: 'left', label: 'Left', Icon: ArrowLeft },
    { id: 'right', label: 'Right', Icon: ArrowRight },
  ];

  return (
    <div 
      className="tool-customizer-modal"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '450px',
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
      <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Toolbar Settings</h2>
        <button 
          onClick={() => isToolbarSettingsOpen.value = false}
          style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px 16px', borderRadius: '12px', fontSize: '13px' }}
        >
          Done
        </button>
      </div>

      <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Position Section */}
        <section>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.4, letterSpacing: '1px', marginBottom: '16px' }}>Dock Position</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {positions.map((pos) => (
              <button
                key={pos.id}
                onClick={() => toolbarPosition.value = pos.id}
                style={{
                  background: toolbarPosition.value === pos.id ? '#fff' : 'rgba(255,255,255,0.03)',
                  color: toolbarPosition.value === pos.id ? '#000' : '#fff',
                  border: 'none',
                  padding: '16px 8px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
              >
                <pos.Icon size={18} />
                <span style={{ fontSize: '11px', fontWeight: 600 }}>{pos.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Active Tools Section */}
        <section>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.4, letterSpacing: '1px', marginBottom: '16px' }}>Manage Toolkit</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {toolsOrder.value.map((id) => {
              const baseType = id.split('-')[0];
              const Icon = ICONS[baseType] || MousePointer2;
              const isDynamic = id.includes('-');
              const meta = toolMetadata.value[id];

              return (
                <div 
                  key={id}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: meta?.color || '#fff', opacity: 0.8 }}>
                       <Icon size={16} />
                    </div>
                    <span style={{ fontSize: '13px', opacity: 0.8 }}>{id}</span>
                  </div>
                  
                  {isDynamic && (
                    <button 
                      onClick={() => removeToolInstance(id)}
                      style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Workspace Backup Section */}
        <section>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.4, letterSpacing: '1px', marginBottom: '16px' }}>Workspace Backup</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={() => exportWorkspace('icycrow_notes')}
              style={{
                background: 'rgba(255,255,255,0.03)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: '16px 8px',
                borderRadius: '16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <Download size={18} />
              <span style={{ fontSize: '11px', fontWeight: 600 }}>Save (.json)</span>
            </button>

            <button
              onClick={() => document.getElementById('workspace-import-input')?.click()}
              style={{
                background: 'rgba(255,255,255,0.03)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: '16px 8px',
                borderRadius: '16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <Upload size={18} />
              <span style={{ fontSize: '11px', fontWeight: 600 }}>Load Workspace</span>
            </button>
            <input 
              id="workspace-import-input"
              type="file" 
              accept=".json"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  const url = pdfUrl.value || window.location.href; 
                  await importWorkspace(file, url);
                  (e.target as HTMLInputElement).value = ''; // Reset
                }
              }}
            />
          </div>
        </section>

        {/* Global Actions */}
        <section style={{ marginTop: '16px' }}>
           <button 
             onClick={resetToolbarLayout}
             style={{
               width: '100%',
               background: 'rgba(248, 113, 113, 0.1)',
               color: '#f87171',
               border: '1px solid rgba(248, 113, 113, 0.2)',
               padding: '14px',
               borderRadius: '16px',
               cursor: 'pointer',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               gap: '8px',
               fontSize: '13px',
               fontWeight: 600
             }}
           >
             <RefreshCcw size={14} />
             Reset Workspace to Defaults
           </button>
        </section>
      </div>
    </div>
  );
};
