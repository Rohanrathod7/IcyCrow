import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SpaceTab, UUID } from '../../lib/types';
import { X, Globe, GripVertical } from 'lucide-preact';
import { memo } from 'preact/compat';
import { searchQuery } from '../store';

const highlightMatch = (text: string, query: string) => {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? <span key={i} className="search-match-highlight">{part}</span> : part
      )}
    </>
  );
};

interface TabItemProps {
  tab: SpaceTab;
  containerId: UUID;
  onRemove: (tabId: UUID) => void;
  isOverlay?: boolean;
}

export const TabItem = memo(({ tab, containerId, onRemove, isOverlay = false }: TabItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ 
    id: tab.id,
    data: {
      type: 'tab',
      containerId
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 9999 : 1,
    position: 'relative' as const,
  };


  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`tab-row ${isOverlay ? 'overlay' : ''} ${isDragging ? 'is-dragging' : ''}`}
    >
      <div className="tab-info-group">
        <div 
          className="drag-handle" 
          {...(attributes as any)} 
          {...listeners}
        >
          <GripVertical size={12} />
        </div>

        {tab.favicon ? (
          <img 
            src={tab.favicon} 
            className="tab-icon-small" 
            onError={(e) => (e.currentTarget.style.display = 'none')}
            alt=""
          />
        ) : (
          <div className="tab-icon-small flex center" data-testid="fallback-icon">
            <Globe size={12} className="text-dim" />
          </div>
        )}
        <span 
          className="tab-title" 
          title={tab.title}
        >
          {highlightMatch(tab.title, searchQuery.value)}
        </span>
      </div>
      
      {!isOverlay && (
        <div className="tab-actions">
          <button 
            className="tab-btn-remove"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(tab.id);
            }}
            data-testid="remove-tab-btn"
            title="Remove Tab"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
});
