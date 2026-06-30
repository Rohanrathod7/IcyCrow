import { useState, useEffect, useMemo } from 'preact/hooks';
import { X, StickyNote, ArrowUpRight, Brain, Highlighter, PenTool, Trash2, Layers, Filter } from 'lucide-preact';
import { 
  isWebSidebarOpen, 
  webStickyNotes, 
  webCallouts, 
  webFlashcardNotes, 
  webStrokes,
  webActiveStickyId,
  webActiveCalloutId,
  webActiveFlashcardId,
  deleteWebHighlight,
  triggerAutoSave
} from '../store/web-annotation-state';
import { unwrapHighlight } from '../highlighter';

export const WebAnnotationsSidebar = () => {
  if (!isWebSidebarOpen.value) return null;

  const [domHighlights, setDomHighlights] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Poll for DOM highlights while sidebar is open
  useEffect(() => {
    if (!isWebSidebarOpen.value) return;
    const updateHighlights = () => {
      const marks = Array.from(document.querySelectorAll('mark.icycrow-highlight'));
      const highlightsMap = new Map();
      marks.forEach(el => {
        const id = el.getAttribute('data-id') || '';
        if (!highlightsMap.has(id)) {
          const rect = el.getBoundingClientRect();
          highlightsMap.set(id, {
            type: 'highlight',
            id,
            text: el.textContent || '(Empty Highlight)',
            color: el.getAttribute('data-color') || '#eab308',
            icon: Highlighter,
            y: rect.top + window.scrollY
          });
        } else {
          // append text if multi-line
          highlightsMap.get(id).text += ' ' + el.textContent;
        }
      });
      setDomHighlights(Array.from(highlightsMap.values()));
    };

    updateHighlights();
    const interval = setInterval(updateHighlights, 2000);
    return () => clearInterval(interval);
  }, [isWebSidebarOpen.value]);

  const handleDelete = (type: string, id: string) => {
    switch (type) {
      case 'sticky':
        webStickyNotes.value = webStickyNotes.value.filter(n => n.id !== id);
        if (webActiveStickyId.value === id) webActiveStickyId.value = null;
        break;
      case 'callout':
        webCallouts.value = webCallouts.value.filter(n => n.id !== id);
        if (webActiveCalloutId.value === id) webActiveCalloutId.value = null;
        break;
      case 'flashcard':
        webFlashcardNotes.value = webFlashcardNotes.value.filter(n => n.id !== id);
        if (webActiveFlashcardId.value === id) webActiveFlashcardId.value = null;
        break;
      case 'highlight':
        unwrapHighlight(id);
        deleteWebHighlight(id);
        setDomHighlights(prev => prev.filter(h => h.id !== id));
        break;
      case 'stroke':
        webStrokes.value = webStrokes.value.filter(s => s.id !== id);
        break;
    }
    triggerAutoSave();
  };

  const handleFocus = (type: string, id: string, y?: number) => {
    if (y !== undefined) {
      window.scrollTo({ top: Math.max(0, y - window.innerHeight / 2), behavior: 'smooth' });
    }
    
    if (type === 'highlight') {
      const el = document.querySelector(`mark.icycrow-highlight[data-id="${id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Visual flash effect
        el.animate([
          { backgroundColor: '#ffffff', color: '#000' },
          { backgroundColor: (el as HTMLElement).style.backgroundColor || 'yellow', color: 'inherit' }
        ], { duration: 800, easing: 'ease-out' });
      }
    } else {
      // Visual flash effect for floating notes
      setTimeout(() => {
        let el = null;
        if (type === 'sticky') el = document.querySelector(`.icycrow-sticky[data-id="${id}"]`);
        if (type === 'callout') el = document.querySelector(`.icycrow-callout[data-id="${id}"]`);
        if (type === 'flashcard') el = document.querySelector(`.icycrow-flashcard[data-id="${id}"]`);
        
        if (el) {
          el.animate([
            { transform: 'scale(1.05)', filter: 'brightness(1.5)' },
            { transform: 'scale(1)', filter: 'brightness(1)' }
          ], { duration: 600, easing: 'ease-out' });
        }
      }, 300);
    }
    
    // Activate the note so it pops open
    if (type === 'sticky') {
      webActiveStickyId.value = id;
      webStickyNotes.value = webStickyNotes.value.map(s => s.id === id ? { ...s, isExpanded: true } : s);
    }
    if (type === 'callout') {
      webActiveCalloutId.value = id;
      webCallouts.value = webCallouts.value.map(c => c.id === id ? { ...c, isExpanded: true } : c);
    }
    if (type === 'flashcard') {
      webActiveFlashcardId.value = id;
      webFlashcardNotes.value = webFlashcardNotes.value.map(f => f.id === id ? { ...f, isExpanded: true } : f);
    }
  };

  const allItems = useMemo(() => {
    return [
      ...domHighlights,
      ...webStickyNotes.value.map(s => ({
        type: 'sticky', id: s.id, text: s.text || '(Empty Note)', color: s.color, icon: StickyNote, y: s.y
      })),
      ...webCallouts.value.map(c => ({
        type: 'callout', id: c.id, text: c.text || '(Empty Callout)', color: c.color, icon: ArrowUpRight, y: c.anchor.y
      })),
      ...webFlashcardNotes.value.map(f => ({
        type: 'flashcard', id: f.id, text: f.frontText || '(Empty Flashcard)', color: f.color, icon: Brain, y: f.y
      })),
      ...webStrokes.value.map(s => ({
        type: 'stroke', id: s.id, text: s.isHighlight ? 'Freehand Highlight' : 'Drawing', color: s.color, icon: PenTool, y: s.points[0]?.y || 0
      }))
    ].sort((a, b) => (a.y || 0) - (b.y || 0));
  }, [domHighlights, webStickyNotes.value, webCallouts.value, webFlashcardNotes.value, webStrokes.value]);

  const availableTypes = Array.from(new Set(allItems.map(i => i.type)));
  
  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return allItems;
    return allItems.filter(i => i.type === activeFilter);
  }, [allItems, activeFilter]);

  return (
    <div
      style={{
        position: 'fixed',
        top: '24px',
        right: '80px',
        width: '340px',
        maxHeight: 'calc(100vh - 48px)',
        backgroundColor: 'rgba(28, 28, 30, 0.75)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderRadius: '20px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 24px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
        zIndex: 2147483647,
        display: 'flex',
        flexDirection: 'column',
        color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
        animation: 'icycrow-sidebar-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <style>{`
        @keyframes icycrow-sidebar-in {
          0% { opacity: 0; transform: translateX(20px) scale(0.98); }
          100% { opacity: 1; transform: translateX(0) scale(1); }
        }
        .icycrow-sidebar-item {
          display: flex;
          align-items: flex-start;
          padding: 14px 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          transition: background 0.2s;
          cursor: pointer;
        }
        .icycrow-sidebar-item:hover {
          background: rgba(255,255,255,0.06);
        }
        .icycrow-sidebar-action {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #d1d5db;
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .icycrow-sidebar-action:hover {
          background: rgba(255,255,255,0.15);
          color: #fff;
          transform: scale(1.05);
        }
        .icycrow-sidebar-action.delete:hover {
          background: rgba(239,68,68,0.2);
          border-color: rgba(239,68,68,0.3);
          color: #f87171;
        }
        .icycrow-sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .icycrow-sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .icycrow-sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
        }
        .icycrow-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }
        .icycrow-filter-btn {
          background: transparent;
          border: 1px solid transparent;
          color: #9ca3af;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: capitalize;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .icycrow-filter-btn:hover {
          background: rgba(255,255,255,0.05);
          color: #e5e7eb;
        }
        .icycrow-filter-btn.active {
          background: rgba(168, 85, 247, 0.2);
          border-color: rgba(168, 85, 247, 0.4);
          color: #c084fc;
        }
      `}</style>
      
      {/* Header */}
      <div style={{ padding: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: availableTypes.length > 0 ? '12px' : '0' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#a855f7" />
            Annotations Navigator
          </h3>
          <button 
            onClick={() => isWebSidebarOpen.value = false}
            style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Filters */}
        {availableTypes.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }} className="icycrow-sidebar-scroll">
            <button 
              className={`icycrow-filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All
            </button>
            {availableTypes.map(type => (
              <button 
                key={type}
                className={`icycrow-filter-btn ${activeFilter === type ? 'active' : ''}`}
                onClick={() => setActiveFilter(type)}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="icycrow-sidebar-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        {filteredItems.length === 0 ? (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: '#6b7280', fontSize: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Filter size={32} color="#4b5563" />
            <span>No annotations found.</span>
          </div>
        ) : (
          filteredItems.map(item => (
            <div 
              key={item.id} 
              className="icycrow-sidebar-item"
              onClick={(e) => {
                // Prevent focusing if they clicked a button
                if ((e.target as HTMLElement).closest('.icycrow-sidebar-action')) return;
                handleFocus(item.type, item.id, item.y);
              }}
            >
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: item.color, marginRight: '14px', flexShrink: 0, marginTop: '4px', boxShadow: `0 0 8px ${item.color}80` }} />
              
              <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
                <div style={{ fontSize: '13px', color: '#f3f4f6', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {item.text}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                  <item.icon size={12} color="#9ca3af" />
                  <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                    {item.type}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button 
                  className="icycrow-sidebar-action delete" 
                  onClick={(e) => { e.stopPropagation(); handleDelete(item.type, item.id); }}
                  title="Delete Annotation"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

