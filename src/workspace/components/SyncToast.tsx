import { useEffect, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { CheckCircle2, AlertCircle, RefreshCw, X } from 'lucide-preact';

export const syncToastMessage = signal<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

export const SyncToast = () => {
  const [visible, setVisible] = useState(false);
  const message = syncToastMessage.value;

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => syncToastMessage.value = null, 400); // Wait for fade out
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!message && !visible) return null;

  const getIcon = () => {
    switch (message?.type) {
      case 'success': return <CheckCircle2 size={16} color="#4ade80" />;
      case 'error': return <AlertCircle size={16} color="#f87171" />;
      default: return <RefreshCw size={16} color="#3b82f6" className="animate-spin" />;
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? '0' : '-100px'})`,
        opacity: visible ? 1 : 0,
        background: 'rgba(18, 18, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '10px 16px',
        borderRadius: '14px',
        color: '#fff',
        zIndex: 10050,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'auto'
      }}
    >
      {getIcon()}
      <span style={{ fontSize: '13px', fontWeight: 500 }}>{message?.text}</span>
      <button 
        onClick={() => setVisible(false)}
        style={{ background: 'transparent', border: 'none', color: '#fff', opacity: 0.3, cursor: 'pointer', padding: '4px' }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const showSyncToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
  syncToastMessage.value = { text, type };
};
