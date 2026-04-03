import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SpaceTab, UUID } from '../../lib/types';
import { X, Globe, GripVertical } from 'lucide-preact';
import { memo } from 'preact/compat';

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
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isOverlay ? 0.3 : 1,
    zIndex: isDragging ? 999 : 1,
    position: 'relative' as const,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`tab-row flex-row items-center justify-between ${isOverlay ? 'overlay' : ''}`}
    >
      <div className="flex-row items-center gap-8 overflow-hidden flex-1">
        <div 
          className="drag-handle text-dim clickable-icon" 
          {...(attributes as any)} 
          {...listeners}
          style={{ cursor: 'grab', padding: '4px 0' }}
        >
          <GripVertical size={14} />
        </div>

        {tab.favicon ? (
          <img 
            src={tab.favicon} 
            className="tab-icon-small" 
            style={{ width: '16px', height: '16px', borderRadius: '2px', flexShrink: 0 }} 
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        ) : (
          <div data-testid="fallback-icon" style={{ flexShrink: 0, display: 'flex' }}>
            <Globe size={16} className="text-dim" />
          </div>
        )}
        <span 
          className="tab-title small text-truncate" 
          title={tab.title}
          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: isOverlay ? '0' : '24px' }}
        >
          {tab.title}
        </span>
      </div>
      
      {!isOverlay && (
        <div className="tab-remove-overlay">
          <button 
            className="btn-ghost-small danger"
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
