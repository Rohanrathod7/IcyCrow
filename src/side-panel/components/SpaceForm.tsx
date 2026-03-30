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
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex-row items-center justify-between" style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>New Space</h2>
          <button 
            className="btn-ghost-small" 
            onClick={onCancel}
            title="Close"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-col gap-16">
          <div className="form-group">
            <label>Name</label>
            <input 
              type="text" 
              name="name"
              value={name}
              onInput={e => {
                setName((e.target as HTMLInputElement).value);
                if (error) setError(null);
              }}
              placeholder="e.g. Research Project"
              autoFocus
            />
            {error && <span className="error-text small" style={{ color: 'var(--danger-color)', display: 'block', marginTop: '4px' }}>{error}</span>}
          </div>

          <div className="form-group">
            <label>Color Badge</label>
            <div className="color-picker flex-row gap-8">
              {PRESET_COLORS.map(c => (
                <div 
                  key={c}
                  className={`color-swatch ${color === c ? 'active' : ''}`}
                  style={{ 
                    backgroundColor: c,
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    border: 'none',
                    boxShadow: color === c ? '0 0 0 2px #121212, 0 0 0 4px white' : 'none',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="form-group flex-col gap-8">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={captureCurrentTabs}
                onChange={e => setCaptureCurrentTabs((e.target as HTMLInputElement).checked)}
              />
              <span>Capture currently open tabs</span>
            </label>
            
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={createTabGroup}
                onChange={e => setCreateTabGroup((e.target as HTMLInputElement).checked)}
              />
              <span>Create native Tab Group on restore</span>
            </label>
          </div>

          <div className="flex-row items-center gap-8" style={{ marginTop: '24px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn-ghost-premium" onClick={onCancel}>Cancel</button>
            <button type="submit" className="btn-primary" style={{ minWidth: '120px' }}>Create Space</button>
          </div>
        </form>
      </div>
    </div>
  );
};
