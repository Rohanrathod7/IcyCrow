import { webStickyNotes, webCallouts, webFlashcardNotes, webActiveStickyId, webActiveCalloutId, webActiveFlashcardId, triggerAutoSave, deleteWebSticky, deleteWebCallout, deleteWebFlashcard } from '../store/web-annotation-state';
import { DraggableNoteWindow } from './DraggableNoteWindow';

export const WebHtmlAnnotations = () => {
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

  // We only render this layer. Moving notes can be complex due to absolute positioning on scrollable websites. 
  // For now, they are pinned to the text via fixed pixel offset from top of document.

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
          onUpdate={(updates) => handleStickyUpdate(note.id, updates)}
          onDelete={() => handleStickyDelete(note.id)}
          onFocus={() => webActiveStickyId.value = note.id}
          onBlur={() => webActiveStickyId.value = null}
          isActive={webActiveStickyId.value === note.id}
        />
      ))}

      {webCallouts.value.map(callout => {
        const isActive = webActiveCalloutId.value === callout.id;
        return (
          <div key={callout.id} style={{ pointerEvents: 'none', zIndex: isActive ? 100 : 10 }}>
            <svg 
              style={{ position: 'absolute', top: 0, left: 0, width: '1px', height: '1px', overflow: 'visible', pointerEvents: 'none' }}
              // SVG size is 1x1 with visible overflow so it doesn't get clipped by scroll or height calculations
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
              onUpdate={(updates) => {
                // If DraggableNoteWindow updates x/y, we need to map that back to callout.box
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
          splitRatio={flashcard.splitRatio}
          onUpdate={(updates) => handleFlashcardUpdate(flashcard.id, updates)}
          onDelete={() => handleFlashcardDelete(flashcard.id)}
          onFocus={() => webActiveFlashcardId.value = flashcard.id}
          onBlur={() => webActiveFlashcardId.value = null}
          isActive={webActiveFlashcardId.value === flashcard.id}
        />
      ))}
    </div>
  );
};
