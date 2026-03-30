import { useState } from 'preact/hooks';
import { X } from 'lucide-preact';

interface SpaceFormProps {
  onSubmit: (data: { name: string; color: string; captureCurrentTabs: boolean; createTabGroup: boolean }) => void;
  onCancel: () => void;
}

const PRESET_COLORS = ['#4a90e2', '#50e3c2', '#f5a623', '#d0021b', '#9013fe', '#417505'];

export const SpaceForm = ({ onSubmit, onCancel }: SpaceFormProps) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [captureCurrentTabs, setCaptureCurrentTabs] = useState(true);
  const [createTabGroup, setCreateTabGroup] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    onSubmit({ name, color, captureCurrentTabs, createTabGroup });
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content modal-glass" onClick={e => e.stopPropagation()}>
        <div className="flex-row items-center justify-between" style={{ marginBottom: '28px' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>New Space</h2>
          <button 
            className="btn-ghost-small" 
            onClick={onCancel}
            title="Close"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-col gap-20">
          <div className="form-group">
            <label className="label-saas">Space Name</label>
            <input 
              type="text" 
              name="name"
              className="input-saas"
              value={name}
              onInput={e => {
                setName((e.target as HTMLInputElement).value);
                if (error) setError(null);
              }}
              placeholder="e.g. Research Project"
              autoFocus
            />
            {error && <span className="error-text small" style={{ color: 'var(--danger)', display: 'block', marginTop: '6px', fontSize: '0.75rem', fontWeight: 500 }}>{error}</span>}
          </div>

          <div className="form-group">
            <label className="label-saas">Color Theme</label>
            <div className="color-picker flex-row items-center gap-12" style={{ marginTop: '4px' }}>
              {PRESET_COLORS.map(c => (
                <div 
                  key={c}
                  className={`color-swatch ${color === c ? 'active' : ''}`}
                  style={{ 
                    backgroundColor: c,
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    border: 'none',
                    boxShadow: color === c ? `0 0 0 2px rgba(18, 18, 18, 0.8), 0 0 0 4px ${c}` : 'none',
                    transform: color === c ? 'scale(1.1)' : 'scale(1)',
                    transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="flex-col gap-8" style={{ marginTop: '8px' }}>
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={captureCurrentTabs}
                onChange={e => setCaptureCurrentTabs((e.target as HTMLInputElement).checked)}
              />
              <span style={{ fontWeight: 500 }}>Capture currently open tabs</span>
            </label>
            
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={createTabGroup}
                onChange={e => setCreateTabGroup((e.target as HTMLInputElement).checked)}
              />
              <span style={{ fontWeight: 500 }}>Create native Tab Group on restore</span>
            </label>
          </div>

          <div className="flex-row items-center gap-12" style={{ marginTop: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-ghost-premium" onClick={onCancel} style={{ fontSize: '0.9rem', fontWeight: 600 }}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ minWidth: '130px', padding: '12px 24px' }}>Create Space</button>
          </div>
        </form>
      </div>
    </div>
  );
};
