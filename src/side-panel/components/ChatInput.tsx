import { useState, useRef, useEffect } from 'preact/hooks';
import { chatEngine } from '../store';

interface Props {
  onSubmit: (prompt: string) => void;
  disabled?: boolean;
}

export const ChatInput = ({ onSubmit, disabled }: Props) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (value.trim() && !disabled) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const engineLabel = chatEngine.value === 'window.ai' ? 'Gemini Nano (Local)' : 'Gemini 1.5 Pro';

  return (
    <div className="chat-input-container glass-card" style={{ 
      margin: '0 16px 16px 16px', 
      borderRadius: '12px',
      flexDirection: 'column',
      padding: '12px'
    }}>
      <div className="engine-status text-dim" style={{ fontSize: '0.75rem', marginBottom: '8px' }}>
        ✨ {engineLabel} is active
      </div>
      <div style={{ display: 'flex', gap: '10px', width: '100%', alignItems: 'flex-end' }}>
        <textarea
          ref={textareaRef}
          value={value}
          onInput={(e) => setValue((e.target as HTMLTextAreaElement).value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Select a Space to start chatting..." : "Ask anything about these tabs..."}
          disabled={disabled}
          rows={1}
          className="chat-textarea"
          style={{ background: 'transparent', border: 'none', padding: '0px' }}
        />
      <button 
        onClick={handleSubmit} 
        disabled={disabled || !value.trim()}
        className="send-btn"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
      </div>
    </div>
  );
};
