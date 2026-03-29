import { SpaceTab, UUID } from '../../lib/types';
import { X, Globe } from 'lucide-preact';

interface TabRowProps {
  tab: SpaceTab;
  onRemove: (tabId: UUID) => void;
}

export const TabRow = ({ tab, onRemove }: TabRowProps) => {
  return (
    <div className="tab-row flex-row items-center justify-between">
      <div className="flex-row items-center gap-12 overflow-hidden flex-1">
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
          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {tab.title}
        </span>
      </div>
      
      <button 
        className="btn-ghost-small remove-btn hidden-action"
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
  );
};
