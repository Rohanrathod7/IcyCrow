import { useEffect, useState } from 'preact/hooks';
import { dueFlashcards, loadDueFlashcards, reviewFlashcard } from '../store';
import type { UUID } from '../../lib/types';

/**
 * FlashcardReviewPanel — Study mode with card-flip animation and SM-2 rating.
 */
export function FlashcardReviewPanel() {
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    loadDueFlashcards();
  }, []);

  const cards = dueFlashcards.value;
  const currentCard = cards.length > 0 ? cards[0] : null; // Always review the first due card

  const handleFlip = () => {
    if (!isAnimating) {
      setFlipped(!flipped);
    }
  };

  const handleRate = async (quality: number) => {
    if (!currentCard || isAnimating) return;
    setIsAnimating(true);

    await reviewFlashcard(currentCard.id as UUID, quality);
    setReviewed(prev => prev + 1);
    setFlipped(false);

    // Small delay for visual feedback
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  // All done state
  if (cards.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
        <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700 }}>
          {reviewed > 0 ? 'All caught up!' : 'No cards due'}
        </h2>
        <p style={{ margin: 0, fontSize: '13px', opacity: 0.5 }}>
          {reviewed > 0
            ? `You reviewed ${reviewed} card${reviewed === 1 ? '' : 's'} today. Great work!`
            : 'Create flashcards by highlighting text and clicking 🧠 on any webpage.'
          }
        </p>
      </div>
    );
  }

  const ratingButtons = [
    { quality: 0, label: 'Again', color: '#ef4444', emoji: '❌' },
    { quality: 2, label: 'Hard', color: '#f59e0b', emoji: '🤔' },
    { quality: 3, label: 'Good', color: '#22c55e', emoji: '✅' },
    { quality: 4, label: 'Easy', color: '#3b82f6', emoji: '🚀' },
    { quality: 5, label: 'Perfect', color: '#8b5cf6', emoji: '💎' },
  ];

  return (
    <div style={{ padding: '16px' }}>
      {/* Header */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700 }}>🧠 Study Mode</h2>
          <span style={{ fontSize: '12px', opacity: 0.5 }}>
            {cards.length} card{cards.length === 1 ? '' : 's'} due • {reviewed} reviewed
          </span>
        </div>
      </div>

      {/* Card with flip animation */}
      <div
        onClick={handleFlip}
        style={{
          perspective: '1000px',
          cursor: 'pointer',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            minHeight: '200px',
            transformStyle: 'preserve-3d' as const,
            transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)',
          }}
        >
          {/* Front */}
          <div
            className="glass-card"
            style={{
              position: 'absolute',
              width: '100%',
              minHeight: '200px',
              backfaceVisibility: 'hidden' as const,
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              background: 'var(--card-bg, rgba(255,255,255,0.06))',
              border: '1px solid var(--card-border, rgba(255,255,255,0.08))',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, opacity: 0.3, marginBottom: '12px', letterSpacing: '0.1em' }}>
              Question
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, lineHeight: 1.5 }}>
              {currentCard.front}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.3, marginTop: '16px' }}>
              Click to flip →
            </div>
          </div>

          {/* Back */}
          <div
            className="glass-card"
            style={{
              position: 'absolute',
              width: '100%',
              minHeight: '200px',
              backfaceVisibility: 'hidden' as const,
              transform: 'rotateY(180deg)',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.08) 100%)',
              border: '1px solid rgba(99,102,241,0.15)',
              boxShadow: '0 8px 32px rgba(99,102,241,0.1)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, opacity: 0.3, marginBottom: '12px', letterSpacing: '0.1em' }}>
              Answer
            </div>
            <div style={{ fontSize: '15px', fontWeight: 500, lineHeight: 1.5 }}>
              {currentCard.back}
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for absolute-positioned card */}
      <div style={{ height: '200px' }} />

      {/* Rating Buttons — only show when flipped */}
      {flipped && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' as const, opacity: 0.4, marginBottom: '10px', textAlign: 'center', letterSpacing: '0.05em' }}>
            How well did you know it?
          </div>
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
            {ratingButtons.map(btn => (
              <button
                key={btn.quality}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRate(btn.quality);
                }}
                disabled={isAnimating}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  border: 'none',
                  borderRadius: '12px',
                  background: `${btn.color}18`,
                  color: btn.color,
                  cursor: isAnimating ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '11px',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: isAnimating ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: '18px' }}>{btn.emoji}</span>
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
