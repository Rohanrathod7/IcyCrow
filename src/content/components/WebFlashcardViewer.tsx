import { useState, useEffect } from 'preact/hooks';
import { X, Check, XCircle } from 'lucide-preact';

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export const WebFlashcardViewer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const handleToggle = async () => {
      setIsOpen(prev => !prev);
      if (!isOpen) {
        // Fetch flashcards when opening
        try {
          const res = await chrome.runtime.sendMessage({ type: 'FLASHCARDS_FETCH_ALL' });
          if (res && res.ok && res.data.flashcards) {
            // In a real scenario, filter by current URL hash
            setCards(res.data.flashcards);
          }
        } catch (e) {
          console.error("Failed to fetch flashcards", e);
        }
      }
    };
    
    document.addEventListener('icycrow-toggle-flashcards', handleToggle);
    return () => document.removeEventListener('icycrow-toggle-flashcards', handleToggle);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = () => {
    // Ideally send a review event to the background script here
    // chrome.runtime.sendMessage({ type: 'FLASHCARD_REVIEW', payload: { flashcardId: cards[currentIndex].id, quality } });
    
    setIsFlipped(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsOpen(false);
      setCurrentIndex(0);
      alert("Review complete!");
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      zIndex: 2147483647,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: '#1c1c1e',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        width: '400px',
        maxWidth: '90%',
        minHeight: '300px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        position: 'relative'
      }}>
        <button 
          onClick={() => setIsOpen(false)}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>

        <h2 style={{ color: 'white', margin: '0 0 24px 0', fontSize: '18px', fontWeight: 600 }}>Active Recall Review</h2>

        {cards.length === 0 ? (
          <div style={{ color: '#a1a1aa', textAlign: 'center', margin: 'auto' }}>
            No flashcards found for this page. Highlight text to create one!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '8px' }}>
              Card {currentIndex + 1} of {cards.length}
            </div>
            
            <div style={{
              flex: 1,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '8px',
              padding: '20px',
              color: 'white',
              fontSize: '16px',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              cursor: 'pointer',
              marginBottom: '20px'
            }} onClick={() => setIsFlipped(true)}>
              {isFlipped ? cards[currentIndex].back : cards[currentIndex].front}
            </div>

            {isFlipped ? (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => handleNext()} style={{ flex: 1, padding: '12px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <XCircle size={16} /> Hard
                </button>
                <button onClick={() => handleNext()} style={{ flex: 1, padding: '12px', background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Check size={16} /> Easy
                </button>
              </div>
            ) : (
              <button onClick={() => setIsFlipped(true)} style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>
                Show Answer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
