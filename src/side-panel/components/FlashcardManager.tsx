import { useEffect, useState } from 'preact/hooks';
import { allFlashcards, loadFlashcards, removeFlashcard, updateFlashcardContent } from '../store';
import type { UUID } from '../../lib/types';

/**
 * FlashcardManager — CRUD list of all flashcards with inline edit/delete.
 */
export function FlashcardManager() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');

  useEffect(() => {
    loadFlashcards();
  }, []);

  const cards = allFlashcards.value;

  const startEdit = (card: any) => {
    setEditingId(card.id);
    setEditFront(card.front);
    setEditBack(card.back);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateFlashcardContent(editingId as UUID, {
      front: editFront,
      back: editBack,
    });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFront('');
    setEditBack('');
  };

  const getEaseBadge = (ef: number) => {
    if (ef >= 2.5) return { label: 'Easy', color: '#22c55e' };
    if (ef >= 2.0) return { label: 'Medium', color: '#f59e0b' };
    return { label: 'Hard', color: '#ef4444' };
  };

  if (cards.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🧠</div>
        <p style={{ margin: 0, fontWeight: 600, opacity: 0.7 }}>No flashcards yet</p>
        <span style={{ fontSize: '12px', opacity: 0.4, marginTop: '4px', display: 'block' }}>
          Highlight text on any page and click 🧠 to create a flashcard.
        </span>
      </div>
    );
  }

  return (
    <div style={{ padding: '12px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700 }}>📚 All Flashcards</h2>
          <span style={{ fontSize: '12px', opacity: 0.5 }}>{cards.length} total</span>
        </div>
      </div>

      {cards.map((card: any) => {
        const ease = getEaseBadge(card.easeFactor);
        const nextReview = new Date(card.nextReviewAt);
        const isOverdue = nextReview <= new Date();
        const isEditing = editingId === card.id;

        return (
          <div
            key={card.id}
            className="glass-card card"
            style={{
              padding: '14px',
              marginBottom: '10px',
              borderRadius: '14px',
              transition: 'all 0.2s',
            }}
          >
            {isEditing ? (
              /* Inline Editor */
              <div>
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, opacity: 0.5, display: 'block', marginBottom: '4px' }}>Front</label>
                  <textarea
                    value={editFront}
                    onInput={(e) => setEditFront((e.target as HTMLTextAreaElement).value)}
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid var(--card-border, rgba(255,255,255,0.1))',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      background: 'transparent',
                      color: 'inherit',
                      resize: 'vertical',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, opacity: 0.5, display: 'block', marginBottom: '4px' }}>Back</label>
                  <textarea
                    value={editBack}
                    onInput={(e) => setEditBack((e.target as HTMLTextAreaElement).value)}
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid var(--card-border, rgba(255,255,255,0.1))',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      background: 'transparent',
                      color: 'inherit',
                      resize: 'vertical',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={saveEdit}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: 'none',
                      borderRadius: '8px',
                      background: '#6366f1',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid var(--card-border, rgba(255,255,255,0.1))',
                      borderRadius: '8px',
                      background: 'transparent',
                      color: 'inherit',
                      fontWeight: 600,
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Card Display */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.4 }}>
                      {card.front.length > 80 ? card.front.slice(0, 80) + '...' : card.front}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.5, marginTop: '4px', lineHeight: 1.4 }}>
                      {card.back.length > 60 ? card.back.slice(0, 60) + '...' : card.back}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
                    <button
                      onClick={() => startEdit(card)}
                      title="Edit"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        opacity: 0.5,
                        transition: 'opacity 0.15s',
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this flashcard?')) {
                          removeFlashcard(card.id as UUID);
                        }
                      }}
                      title="Delete"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        opacity: 0.5,
                        transition: 'opacity 0.15s',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Meta row */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: `${ease.color}18`,
                      color: ease.color,
                      fontWeight: 700,
                    }}
                  >
                    {ease.label}
                  </span>
                  <span style={{ opacity: 0.4 }}>
                    {isOverdue ? '⏰ Overdue' : `Next: ${nextReview.toLocaleDateString()}`}
                  </span>
                  <span style={{ opacity: 0.3 }}>
                    ×{card.repetition}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
