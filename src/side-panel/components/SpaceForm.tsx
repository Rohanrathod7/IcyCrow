import { useState, useEffect, useRef } from 'preact/hooks';
import { X, Sparkles, Loader2 } from 'lucide-preact';

interface SpaceFormProps {
  onSubmit: (name: string, color: string, options: { captureCurrentTabs: boolean; createTabGroup: boolean }) => void;
  onCancel: () => void;
}

const PRESET_COLORS = [
  '#3a76f0', // Blue
  '#2dd4bf', // Teal
  '#fbbf24', // Amber
  '#dc2626', // Red
  '#9333ea', // Purple
  '#4d7c0f', // Lime
];

export const SpaceForm = ({ onSubmit, onCancel }: SpaceFormProps) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [captureCurrentTabs, setCaptureCurrentTabs] = useState(true);
  const [createTabGroup, setCreateTabGroup] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  
  const currentTaskId = useRef<string | null>(null);
  const nameBuffer = useRef<string>('');

  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === 'AI_RESPONSE_STREAM' && message.payload.taskId === currentTaskId.current) {
        if (message.payload.error) {
          setError(`AI Error: ${message.payload.error}`);
          setIsGeneratingName(false);
          return;
        }

        if (message.payload.done) {
          // [RUTHLESS SANITIZATION]: Clean the buffered name
          let finalName = nameBuffer.current
            .replace(/["'“”‘’]/g, '') // Strip quotes
            .replace(/\*\*/g, '')     // Remove markdown bold
            .replace(/^Workspace Name: /i, '') // Remove prefixes
            .replace(/[#.!?]$/, '')   // Remove trailing punctuation
            .trim();

          if (finalName) setName(finalName);
          setIsGeneratingName(false);
          currentTaskId.current = null;
        } else {
          nameBuffer.current += message.payload.chunk;
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const handleAutoName = async (e: MouseEvent) => {
    e.preventDefault();
    if (isGeneratingName) return;

    try {
      setIsGeneratingName(true);
      setError(null);
      nameBuffer.current = '';
      const taskId = crypto.randomUUID();
      currentTaskId.current = taskId;

      // 1. Context Grabber
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const tabTitles = tabs
        .map(t => t.title)
        .filter(Boolean)
        .slice(0, 15) // Limit to 15 tabs for context efficiency
        .join('\n');

      if (!tabTitles) {
        setName('New Workspace');
        setIsGeneratingName(false);
        return;
      }

      // 2. Neural Link (Gemini API)
      const prompt = `You are an AI assistant helping a developer organize their browser tabs. Review the following tab titles and suggest a concise, 2-3 word name for a workspace containing them. 
      
      You must return ONLY the 2-3 word name. Do not include any conversational text, prefixes, or punctuation.
      
      Tabs:
      ${tabTitles}`;

      const response = await chrome.runtime.sendMessage({
        type: 'AI_QUERY',
        payload: { taskId, prompt }
      });

      if (response && response.ok === false) {
        throw new Error(response.error?.message || 'AI Engine connection failed');
      }

    } catch (err: any) {
      setError(`AI Error: ${err.message || 'Failed to contact AI Engine'}`);
      setIsGeneratingName(false);
      currentTaskId.current = null;
    }
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a name for the Space');
      return;
    }
    onSubmit(name.trim(), color, { captureCurrentTabs, createTabGroup });
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
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type="text" 
                name="name"
                className="input-saas"
                style={{ paddingRight: '40px' }}
                value={name}
                onInput={e => {
                  setName((e.target as HTMLInputElement).value);
                  if (error) setError(null);
                }}
                placeholder="e.g. Research Project"
                autoFocus
              />
              <button 
                type="button"
                className={`btn-auto-name ${isGeneratingName ? 'generating' : ''}`}
                onClick={handleAutoName}
                title="Auto-name with Gemini"
                disabled={isGeneratingName}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: isGeneratingName ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.4)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  transition: 'all 0.2s ease'
                }}
              >
                {isGeneratingName ? (
                  <Loader2 size={18} className="animate-spin" data-testid="icon-loader" />
                ) : (
                  <Sparkles size={18} data-testid="icon-sparkles" />
                )}
              </button>
            </div>
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
