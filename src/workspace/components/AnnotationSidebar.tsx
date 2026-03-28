import { useMemo } from 'preact/hooks';
import { highlights, stickyNotes, callouts, deleteHighlight, deleteSticky, deleteCallout } from '../store/annotation-state';
import { isSidebarOpen } from '../store/ui-state';
import { pdfUrl } from '../store/viewer-state';
import { X, StickyNote as StickyIcon, MessageSquare, Trash2, Search, Info } from 'lucide-preact';

export const AnnotationSidebar = () => {
  const isOpen = isSidebarOpen.value;
  const url = pdfUrl.value;

  // Aggregate and Group Logic
  const groupedAnnotations = useMemo(() => {
    const all = [
      ...highlights.value.map(h => ({ ...h, type: 'highlight' as const })),
      ...stickyNotes.value.map(s => ({ ...s, type: 'sticky' as const })),
      ...callouts.value.map(c => ({ ...c, type: 'callout' as const }))
    ];

    const groups: Record<number, typeof all> = {};
    all.forEach(item => {
      if (!groups[item.pageNumber]) groups[item.pageNumber] = [];
      groups[item.pageNumber].push(item);
    });

    return Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b)
      .map(page => ({
        pageNumber: page,
        items: groups[page]
      }));
  }, [highlights.value, stickyNotes.value, callouts.value]);

  const handleNavigate = (pageNumber: number) => {
    const pageEl = document.querySelector(`[data-page-number="${pageNumber}"]`);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleDelete = (e: MouseEvent, item: any) => {
    e.stopPropagation();
    if (!url) return;
    
    if (item.type === 'highlight') deleteHighlight(item.id, url);
    else if (item.type === 'sticky') deleteSticky(item.id, url);
    else if (item.type === 'callout') deleteCallout(item.id, url);
  };

  const truncate = (str: string, len: number) => {
    if (!str) return '...';
    return str.length > len ? str.substring(0, len) + '...' : str;
  };

  return (
    <div 
      className={`annotation-sidebar ${isOpen ? 'open' : ''}`}
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: '320px',
        height: '100vh',
        background: 'rgba(20, 20, 22, 0.9)',
        backdropFilter: 'blur(20px)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 10001,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        display: 'flex',
        flexDirection: 'column',
        color: '#fff',
        boxShadow: isOpen ? '-10px 0 30px rgba(0,0,0,0.5)' : 'none',
        pointerEvents: 'auto'
      }}
    >
      {/* Header */}
      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={18} opacity={0.6} />
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Knowledge Hub</h2>
        </div>
        <button 
          onClick={() => isSidebarOpen.value = false}
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.6 }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {groupedAnnotations.length === 0 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.4, textAlign: 'center', padding: '20px' }}>
            <Info size={40} strokeWidth={1.5} style={{ marginBottom: '16px' }} />
            <p style={{ margin: 0, fontSize: '14px' }}>No annotations yet.</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Start highlighting or adding notes to see them here.</p>
          </div>
        ) : (
          groupedAnnotations.map((group: any) => (
            <div key={group.pageNumber} style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.4, letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '8px' }}>
                Page {group.pageNumber}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {group.items.map((item: any) => (
                  <div 
                    key={item.id}
                    onClick={() => handleNavigate(group.pageNumber)}
                    className="sidebar-item"
                    style={{
                      padding: '10px 12px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: item.type === 'highlight' ? item.color : 'rgba(255,255,255,0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {item.type === 'sticky' && <StickyIcon size={14} color="#3b82f6" />}
                      {item.type === 'callout' && <MessageSquare size={14} color="#8b5cf6" />}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.type === 'highlight' ? 'Highlight' : truncate(item.text, 25)}
                      </div>
                      <div style={{ fontSize: '11px', opacity: 0.4 }}>
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </div>
                    </div>

                    <button 
                      onClick={(e: any) => handleDelete(e, item)}
                      className="sidebar-delete-btn"
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: '#ef4444', 
                        opacity: 0, 
                        cursor: 'pointer',
                        padding: '8px',
                        transition: 'opacity 0.2s'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
