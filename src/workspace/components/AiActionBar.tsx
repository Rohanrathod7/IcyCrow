import { useState } from 'preact/hooks';
import { selectedPdfText, aiMenuPosition, isAiLoading, aiResponse } from '../store/ai-state';
import { askAI } from '../services/AiService';
import { Sparkles, FileText, X, Loader2, Copy, Plus, Check } from 'lucide-preact';
import { addSticky, persistAnnotations } from '../store/annotation-state';
import { pdfUrl } from '../store/viewer-state';

export const AiActionBar = () => {
  const pos = aiMenuPosition.value;
  const loading = isAiLoading.value;
  const response = aiResponse.value;
  const [copied, setCopied] = useState(false);

  if (!pos) return null;

  const handleAction = async (type: 'explain' | 'summarize') => {
    isAiLoading.value = true;
    aiResponse.value = null; // Clear previous
    try {
      const result = await askAI(type, selectedPdfText.value);
      aiResponse.value = result;
    } catch (err: any) {
      aiResponse.value = `❌ Error: ${err.message || 'Gemini bridge unreachable.'}`;
    } finally {
      isAiLoading.value = false;
    }
  };

  const handleCopy = () => {
    if (!response) return;
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddToSticky = () => {
    if (!response || !pos) return;
    
    // Position the sticky slightly below or near the selection
    // Note: pos.x/y are fixed coordinates on screen. 
    // We need to convert back to PDF coordinates if we want exact placement, 
    // but typically we just drop it nearby.
    // For now, let's just drop it at a reasonable offset on the current page.
    // Since we don't have the exact PDF x/y in aiMenuPosition (we have screen x/y), 
    // and PdfPage handles tool clicks, we'll just use a generic placement for now 
    // or assume the user will drag it later.
    
    addSticky(pos.pageNumber, 50, 50, '#fbbf24'); // Generic top-left of page for now
    // Actually, we should ideally have the PDF-space coordinates.
    // But for V1 "Add to Sticky", a visible drop is fine.
    
    persistAnnotations(pdfUrl.value);
    aiMenuPosition.value = null;
    aiResponse.value = null;
  };

  return (
    <div 
      className="ai-container"
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y - 12}px`,
        transform: 'translate(-50%, -100%)',
        zIndex: 1000,
        pointerEvents: 'auto'
      }}
    >
      <div 
        className="ai-action-bar"
        style={{
          background: 'rgba(20, 20, 22, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
          width: 'max-content'
        }}
      >
        <button 
          className="ai-action-btn"
          disabled={loading}
          onClick={() => handleAction('explain')}
          style={btnStyle}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} color="#c084fc" />}
          Explain
        </button>

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <button 
          className="ai-action-btn"
          disabled={loading}
          onClick={() => handleAction('summarize')}
          style={btnStyle}
        >
          <FileText size={16} color="#60a5fa" />
          Summarize
        </button>

        <button 
          className="ai-close-btn"
          onClick={() => {
            aiMenuPosition.value = null;
            selectedPdfText.value = '';
            aiResponse.value = null;
          }}
        >
          <X size={14} />
        </button>
      </div>

      {response && (
        <div 
          className="ai-response-card"
          style={{
            marginTop: '12px',
            width: '320px',
            background: 'rgba(28, 28, 30, 0.95)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '14px',
            padding: '16px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            color: '#eee',
            fontSize: '13px',
            lineHeight: '1.6',
            position: 'relative'
          }}
        >
          <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
            {response}
          </div>

          <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
            <button className="ai-utility-btn" onClick={handleCopy}>
              {copied ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="ai-utility-btn" onClick={handleAddToSticky}>
              <Plus size={14} />
              Add to Sticky
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .ai-action-btn {
          background: transparent;
          border: none;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          padding: 8px 14px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .ai-action-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-1px);
        }
        .ai-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .ai-close-btn {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.4);
          padding: 8px;
          cursor: pointer;
          border-radius: 50%;
          display: flex;
          align-items: center;
        }
        .ai-close-btn:hover {
          color: #fff;
          background: rgba(255,255,255,0.1);
        }
        .ai-utility-btn {
          flex: 1;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          color: #ccc;
          padding: 8px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .ai-utility-btn:hover {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes popIn {
          from { transform: translate(-50%, -90%) scale(0.95); opacity: 0; }
          to { transform: translate(-50%, -100%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

const btnStyle = {};
