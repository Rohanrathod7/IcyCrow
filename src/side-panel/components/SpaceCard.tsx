import { useState } from 'preact/hooks';
import { Space, UUID } from '../../lib/types';
import { expandedSpaceId, updateSpaceName, removeTabFromSpace } from '../store';
import { ChevronDown, ChevronUp, ArrowUpRight, Edit2, Trash2 } from 'lucide-preact';
import { TabRow } from './TabRow';

interface SpaceCardProps {
  space: Space;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

export const SpaceCard = ({ space, onRestore, onDelete }: SpaceCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(space.name);
  
  const isExpanded = expandedSpaceId.value === space.id;
  const tabCount = space.tabs?.length || 0;

  const handleToggleExpand = (e: MouseEvent) => {
    e.stopPropagation();
    expandedSpaceId.value = isExpanded ? null : space.id;
  };

  const handleRename = (e: MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSaveName = async () => {
    if (editedName.trim() && editedName !== space.name) {
      await updateSpaceName(space.id, editedName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleSaveName();
    if (e.key === 'Escape') {
      setEditedName(space.name);
      setIsEditing(false);
    }
  };

  const handleDeleteClick = (e: MouseEvent) => {
    e.stopPropagation();
    onDelete(space.id);
  };

  const handleRestoreClick = (e: MouseEvent) => {
    e.stopPropagation();
    onRestore(space.id);
  };

  const handleRemoveTab = async (tabId: UUID) => {
    await removeTabFromSpace(space.id, tabId);
  };

  return (
    <div 
      className={`bento-item ${isExpanded ? 'expanded' : ''}`}
      data-testid={`space-card-${space.id}`}
      style={{ borderLeft: `6px solid ${space.color || 'var(--accent-primary)'}` }}
    >
      <div className="flex-col gap-12">
        <div 
          className="flex-row items-center header-row clickable" 
          onClick={handleToggleExpand}
          style={{ cursor: 'pointer' }}
        >
          <div className="flex-row items-center gap-3 flex-1">
            <div className="chevron-icon">
              {isExpanded ? <ChevronUp size={18} className="text-gray-400 mt-0.5" /> : <ChevronDown size={18} className="text-gray-400 mt-0.5" />}
            </div>
            
            <div className="flex-col items-start leading-tight flex-1 overflow-hidden">
              {isEditing ? (
                <input 
                  autoFocus
                  className="input-glass small"
                  value={editedName}
                  onInput={(e) => setEditedName((e.target as HTMLInputElement).value)}
                  onBlur={handleSaveName}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: '100%' }}
                />
              ) : (
                <span className="font-semibold text-white text-truncate" style={{ fontSize: '1rem' }}>{space.name}</span>
              )}
              <span className="text-xs text-gray-400 font-medium">{tabCount} tabs</span>
            </div>
          </div>
          
          <div className="flex-row gap-4 action-group">
            <button 
              className="btn-ghost-premium"
              onClick={handleRestoreClick}
              title="Restore Space to Tabs"
            >
              <ArrowUpRight size={18} />
            </button>
            <button 
              className="btn-ghost-premium"
              onClick={handleRename}
              title="Rename Space"
            >
              <Edit2 size={16} />
            </button>
            <button 
              className="btn-ghost-premium danger"
              onClick={handleDeleteClick}
              title="Delete Space"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {isExpanded && space.tabs && space.tabs.length > 0 && (
          <div className="accordion-body flex-col gap-8" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            {space.tabs.map(tab => (
              <TabRow key={tab.id} tab={tab} onRemove={handleRemoveTab} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
