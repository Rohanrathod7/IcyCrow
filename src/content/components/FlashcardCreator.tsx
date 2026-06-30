import { useState } from 'preact/hooks';
import {
  flashcardCreatorVisible,
  flashcardCreatorPos,
  activeHighlightIdForFlashcard,
  activeHighlightTextForFlashcard,
} from '../state';
import { sha256Hash, canonicalUrl } from '../../lib/url-utils';

/**
 * Floating Flashcard Creator — rendered in Shadow DOM
 * Resizable via CSS resize + drag corner.
 */
export const FlashcardCreator = () => {
  if (!flashcardCreatorVisible.value) return null;

  const [front, setFront] = useState(activeHighlightTextForFlashcard.value || '');
  const [back, setBack] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) return;
    setSaving(true);

    try {
      const urlHash = await sha256Hash(canonicalUrl(window.location.href));
      await chrome.runtime.sendMessage({
        type: 'FLASHCARD_CREATE',
        payload: {
          highlightId: activeHighlightIdForFlashcard.value || crypto.randomUUID(),
          urlHash,
          front: front.trim(),
          back: back.trim(),
        }
      });
      setSaved(true);
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (e) {
      console.error('[IcyCrow] Flashcard creation failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    flashcardCreatorVisible.value = false;
    activeHighlightIdForFlashcard.value = null;
    activeHighlightTextForFlashcard.value = '';
    setFront('');
    setBack('');
    setSaved(false);
  };

  return (
    <div
      id="icycrow-flashcard-creator"
      style={{
        position: 'absolute',
        top: `${flashcardCreatorPos.value.y}px`,
        left: `${flashcardCreatorPos.value.x}px`,
        transform: 'translate(-50%, 0)',
        zIndex: 2147483647,
        pointerEvents: 'auto',
        animation: 'icycrow-fc-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <style>{`
        @keyframes icycrow-fc-in {
          0% { opacity: 0; transform: translate(-50%, 8px) scale(0.95); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        #icycrow-fc-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(16px) saturate(180%);
          -webkit-backdrop-filter: blur(16px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 16px;
          box-shadow: 0 16px 48px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.04);
          padding: 16px;
          width: 340px;
          min-width: 260px;
          min-height: 200px;
          resize: both;
          overflow: auto;
          font-family: system-ui, -apple-system, sans-serif;
          color: #1a1a1a;
        }
        #icycrow-fc-card .fc-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        #icycrow-fc-card .fc-title {
          font-weight: 700;
          font-size: 14px;
          color: #333;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        #icycrow-fc-card .fc-close {
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 18px;
          color: #999;
          padding: 2px 6px;
          border-radius: 8px;
          transition: background 0.15s;
          line-height: 1;
        }
        #icycrow-fc-card .fc-close:hover {
          background: rgba(0,0,0,0.06);
          color: #333;
        }
        #icycrow-fc-card label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #888;
          margin-bottom: 4px;
        }
        #icycrow-fc-card textarea {
          width: 100%;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          font-family: inherit;
          resize: vertical;
          background: rgba(255,255,255,0.6);
          color: #1a1a1a;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
          box-sizing: border-box;
        }
        #icycrow-fc-card textarea:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
        }
        #icycrow-fc-card .fc-save-btn {
          width: 100%;
          margin-top: 12px;
          padding: 10px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          font-weight: 700;
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(99,102,241,0.3);
        }
        #icycrow-fc-card .fc-save-btn:hover {
          filter: brightness(1.1);
          box-shadow: 0 6px 16px rgba(99,102,241,0.4);
        }
        #icycrow-fc-card .fc-save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          filter: none;
        }
        #icycrow-fc-card .fc-saved {
          text-align: center;
          padding: 24px;
          font-size: 20px;
        }
      `}</style>

      <div id="icycrow-fc-card">
        <div class="fc-header">
          <span class="fc-title">🧠 Create Flashcard</span>
          <button class="fc-close" onClick={handleClose} title="Close">×</button>
        </div>

        {saved ? (
          <div class="fc-saved">✅ Flashcard Saved!</div>
        ) : (
          <div>
            <div style={{ marginBottom: '10px' }}>
              <label>Front (Question)</label>
              <textarea
                rows={3}
                value={front}
                onInput={(e) => setFront((e.target as HTMLTextAreaElement).value)}
                placeholder="What is the key concept?"
              />
            </div>

            <div>
              <label>Back (Answer)</label>
              <textarea
                rows={3}
                value={back}
                onInput={(e) => setBack((e.target as HTMLTextAreaElement).value)}
                placeholder="The answer or explanation..."
                autofocus
              />
            </div>

            <button
              class="fc-save-btn"
              onClick={handleSave}
              disabled={saving || !front.trim() || !back.trim()}
            >
              {saving ? 'Saving...' : 'Save Flashcard'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
