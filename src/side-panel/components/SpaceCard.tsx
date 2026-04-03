import { useState } from 'preact/hooks';
import { memo } from 'preact/compat';
import { Space, UUID } from '../../lib/types';
import { expandedSpaceId, updateSpaceName, removeTabFromSpace } from '../store';
import { ChevronDown, ChevronUp, ArrowUpRight, Edit2, Trash2 } from 'lucide-preact';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { TabItem } from './TabItem';

interface SpaceCardProps {
  space: Space;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

export const SpaceCard = memo(({ space, onRestore, onDelete }: SpaceCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(space.name);
  
  const isExpanded = expandedSpaceId.value === space.id;
  const tabCount = space.tabs?.length || 0;

  const { setNodeRef } = useDroppable({
    id: space.id,
    data: {
      type: 'space',
      spaceId: space.id
    }
  });

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
      ref={setNodeRef}
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
                <div className="flex-row items-center gap-2">
                  <span className="font-semibold text-white text-truncate" style={{ fontSize: '1rem' }}>{space.name}</span>
                  <span className="space-tab-badge">{tabCount} tabs</span>
                </div>
              )}
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

        {isExpanded && space.tabs && (
          <div className="accordion-body flex-col gap-8" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', minHeight: space.tabs.length === 0 ? '40px' : 'auto' }}>
            <SortableContext items={space.tabs.map(t => t.id)} strategy={verticalListSortingStrategy}>
              {space.tabs.map(tab => (
                <TabItem key={tab.id} tab={tab} containerId={space.id} onRemove={handleRemoveTab} />
              ))}
              {space.tabs.length === 0 && (
                <div className="empty-drop-zone text-dim small center" style={{ padding: '8px', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                  Drop tabs here
                </div>
              )}
            </SortableContext>
          </div>
        )}
      </div>
    </div>
  );
});
