import { currentAppStatus } from '../store';

interface SplitButtonProps {
  onMainClick: () => void;
  onChevronClick: () => void;
  disabled?: boolean;
  mainText?: string;
  savingText?: string;
  successText?: string;
}

export const SplitButton = ({ 
  onMainClick, 
  onChevronClick, 
  disabled,
  mainText = 'Save Session',
  savingText = 'Saving...',
  successText = 'Saved ✓'
}: SplitButtonProps) => {
  const isSaving = currentAppStatus.value === 'saving';
  const isSuccess = currentAppStatus.value === 'success';

  return (
    <div className="split-button-container" style={{ 
      display: 'flex', 
      alignItems: 'stretch', 
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))',
      border: '1px solid var(--glass-border)',
      borderRadius: '8px',
      overflow: 'hidden',
      color: '#fff',
      cursor: disabled || isSaving ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      transition: 'all 0.2s',
      marginBottom: '16px',
      width: '100%'
    }}>
      <button 
        className="split-main"
        onClick={onMainClick}
        disabled={disabled || isSaving}
        style={{ 
          flex: 1, 
          padding: '12px 16px', 
          fontWeight: 600,
          color: 'inherit',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          background: 'transparent',
          border: 'none',
          cursor: 'inherit',
          outline: 'none',
          transition: 'background-color 0.2s'
        }}
      >
        {isSaving ? savingText : isSuccess ? successText : mainText}
      </button>
      <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)' }} />
      <button 
        className="split-chevron"
        onClick={onChevronClick}
        disabled={disabled || isSaving}
        style={{ 
          padding: '0 12px', 
          color: 'inherit',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'transparent',
          border: 'none',
          cursor: 'inherit',
          outline: 'none',
          transition: 'background-color 0.2s'
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
    </div>
  );
};
