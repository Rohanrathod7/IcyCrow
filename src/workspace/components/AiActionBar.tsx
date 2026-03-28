import { selectedPdfText, aiMenuPosition, isAiLoading } from '../store/ai-state';
import { askAI } from '../services/AiService';
import { Sparkles, FileText, X, Loader2 } from 'lucide-preact';

export const AiActionBar = () => {
  const pos = aiMenuPosition.value;
  const loading = isAiLoading.value;

  if (!pos) return null;

  const handleAction = async (type: 'explain' | 'summarize') => {
    isAiLoading.value = true;
    try {
      const response = await askAI(type, selectedPdfText.value);
      // V1: Show response via alert/toast
      alert(response);
    } catch (err) {
      console.error("AI Action failed:", err);
    } finally {
      isAiLoading.value = false;
      // Clear selection after action
      aiMenuPosition.value = null;
      selectedPdfText.value = '';
    }
  };

  return (
    <div 
      className="ai-action-bar"
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        transform: 'translate(-50%, -100%)',
        background: 'rgba(28, 28, 30, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '16px',
        padding: '6px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        zIndex: 50,
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        animation: 'popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        pointerEvents: 'auto'
      }}
    >
      <button 
        className="ai-action-btn"
        disabled={loading}
        onClick={() => handleAction('explain')}
        style={btnStyle}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} color="#8b5cf6" />}
        ✨ Explain
      </button>

      <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

      <button 
        className="ai-action-btn"
        disabled={loading}
        onClick={() => handleAction('summarize')}
        style={btnStyle}
      >
        <FileText size={16} color="#3b82f6" />
        📝 Summarize
      </button>

      <button 
        onClick={() => {
          aiMenuPosition.value = null;
          selectedPdfText.value = '';
        }}
        style={{ 
          background: 'transparent', 
          border: 'none', 
          color: '#fff', 
          opacity: 0.3, 
          cursor: 'pointer', 
          padding: '8px', 
          display: 'flex', 
          alignItems: 'center' 
        }}
      >
        <X size={14} />
      </button>

      <style>{`
        @keyframes popIn {
          from { transform: translate(-50%, -90%) scale(0.95); opacity: 0; }
          to { transform: translate(-50%, -100%) scale(1); opacity: 1; }
        }
        .ai-action-btn {
          background: transparent;
          border: none;
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          padding: 8px 12px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.2s;
        }
        .ai-action-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
        }
        .ai-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const btnStyle = {
  // Base styles are in the <style> tag above
};
