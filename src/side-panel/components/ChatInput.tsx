import { useState, useRef, useEffect } from 'preact/hooks';

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

  return (
    <div className="chat-input-container">
      <textarea
        ref={textareaRef}
        value={value}
        onInput={(e) => setValue((e.target as HTMLTextAreaElement).value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything about these tabs..."
        disabled={disabled}
        rows={1}
        className="chat-textarea"
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
  );
};
