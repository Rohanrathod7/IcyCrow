import { useState } from 'preact/hooks';
import { webStickyNotes, webCallouts, webFlashcardNotes, webActiveStickyId, webActiveCalloutId, webActiveFlashcardId, triggerAutoSave, deleteWebSticky, deleteWebCallout, deleteWebFlashcard } from '../store/web-annotation-state';
import { DraggableNoteWindow } from './DraggableNoteWindow';

export const WebHtmlAnnotations = () => {
  const [fullscreenImgUrl, setFullscreenImgUrl] = useState<string | null>(null);

  const handleStickyUpdate = (id: string, updates: any) => {
    webStickyNotes.value = webStickyNotes.value.map(s => s.id === id ? { ...s, ...updates } : s);
    triggerAutoSave();
  };

  const handleCalloutUpdate = (id: string, updates: any) => {
    webCallouts.value = webCallouts.value.map(c => c.id === id ? { ...c, ...updates } : c);
    triggerAutoSave();
  };

  const handleFlashcardUpdate = (id: string, updates: any) => {
    webFlashcardNotes.value = webFlashcardNotes.value.map(f => f.id === id ? { ...f, ...updates } : f);
    triggerAutoSave();
  };

  const handleStickyDelete = (id: string) => {
    deleteWebSticky(id);
  };

  const handleCalloutDelete = (id: string) => {
    deleteWebCallout(id);
  };

  const handleFlashcardDelete = (id: string) => {
    deleteWebFlashcard(id);
  };

  return (
    <div 
      className="web-html-annotations-layer"
      style={{
        position: 'absolute', // Absolute to the document root
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // Let clicks pass through to the page unless over a note
        zIndex: 2147483646, // Below toolbar, above ink
      }}
    >
      {webStickyNotes.value.map(note => (
        <DraggableNoteWindow
          key={note.id}
          id={note.id}
          type="sticky"
          x={note.x}
          y={note.y}
          width={note.width}
          height={note.height}
          isExpanded={note.isExpanded !== false} // default true
          color={note.color || '#fbbf24'}
          text={note.text}
          imageUrl={note.imageUrl}
          imageSize={note.imageSize}
          onUpdate={(updates) => handleStickyUpdate(note.id, updates)}
          onDelete={() => handleStickyDelete(note.id)}
          onFocus={() => webActiveStickyId.value = note.id}
          onBlur={() => webActiveStickyId.value = null}
          onViewFullscreen={(url) => setFullscreenImgUrl(url)}
          isActive={webActiveStickyId.value === note.id}
        />
      ))}

      {webCallouts.value.map(callout => {
        const isActive = webActiveCalloutId.value === callout.id;
        return (
          <div key={callout.id} style={{ pointerEvents: 'none', zIndex: isActive ? 100 : 10 }}>
            <svg 
              style={{ position: 'absolute', top: 0, left: 0, width: '1px', height: '1px', overflow: 'visible', pointerEvents: 'none' }}
            >
              <line 
                x1={callout.anchor.x} 
                y1={callout.anchor.y} 
                x2={callout.box.x} 
                y2={callout.box.y} 
                stroke={callout.color || '#ef4444'} 
                strokeWidth={2} 
                strokeDasharray="4 4"
              />
              <circle cx={callout.anchor.x} cy={callout.anchor.y} r={4} fill={callout.color || '#ef4444'} />
            </svg>
            
            <DraggableNoteWindow
              id={callout.id}
              type="callout"
              x={callout.box.x}
              y={callout.box.y}
              width={callout.width}
              height={callout.height}
              isExpanded={callout.isExpanded !== false}
              color={callout.color || '#ef4444'}
              text={callout.text}
              imageUrl={callout.imageUrl}
              imageSize={callout.imageSize}
              onUpdate={(updates) => {
                const mappedUpdates = { ...updates };
                if (updates.x !== undefined) {
                  mappedUpdates.box = { ...callout.box, x: updates.x, y: updates.y };
                  delete mappedUpdates.x;
                  delete mappedUpdates.y;
                }
                handleCalloutUpdate(callout.id, mappedUpdates);
              }}
              onDelete={() => handleCalloutDelete(callout.id)}
              onFocus={() => webActiveCalloutId.value = callout.id}
              onBlur={() => webActiveCalloutId.value = null}
              onViewFullscreen={(url) => setFullscreenImgUrl(url)}
              isActive={isActive}
            />
          </div>
        );
      })}

      {webFlashcardNotes.value.map(flashcard => (
        <DraggableNoteWindow
          key={flashcard.id}
          id={flashcard.id}
          type="flashcard"
          x={flashcard.x}
          y={flashcard.y}
          width={flashcard.width}
          height={flashcard.height}
          isExpanded={flashcard.isExpanded !== false}
          color={flashcard.color || '#a855f7'}
          frontText={flashcard.frontText}
          backText={flashcard.backText}
          imageUrl={flashcard.imageUrl}
          frontImageUrl={flashcard.frontImageUrl}
          backImageUrl={flashcard.backImageUrl}
          frontImageSize={flashcard.frontImageSize}
          backImageSize={flashcard.backImageSize}
          splitRatio={flashcard.splitRatio}
          onUpdate={(updates) => handleFlashcardUpdate(flashcard.id, updates)}
          onDelete={() => handleFlashcardDelete(flashcard.id)}
          onFocus={() => webActiveFlashcardId.value = flashcard.id}
          onBlur={() => webActiveFlashcardId.value = null}
          onViewFullscreen={(url) => setFullscreenImgUrl(url)}
          isActive={webActiveFlashcardId.value === flashcard.id}
        />
      ))}

      {/* Fullscreen Image Overlay */}
      {fullscreenImgUrl && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2147483647,
            pointerEvents: 'auto',
            cursor: 'zoom-out'
          }}
          onClick={() => setFullscreenImgUrl(null)}
        >
          <img 
            src={fullscreenImgUrl} 
            style={{ 
              maxWidth: '90%', 
              maxHeight: '90%', 
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              transition: 'transform 0.2s ease-out'
            }} 
          />
          <button
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#fff',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              fontSize: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(5px)',
              transition: 'background 0.2s'
            }}
            onClick={(e) => { e.stopPropagation(); setFullscreenImgUrl(null); }}
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
};
