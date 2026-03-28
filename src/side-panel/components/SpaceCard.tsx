import { useState } from 'preact/hooks';
import { Space, UUID } from '../../lib/types';
import { expandedSpaceId, updateSpaceName, deleteSpace } from '../store';
import { ChevronDown, ChevronUp, Play, Edit2, Trash2 } from 'lucide-preact';

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
          <div className="flex-row items-center gap-12 flex-1">
            <div className="chevron-icon">
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
            
            <div className="space-info flex-1">
              {isEditing ? (
                <input 
                  autoFocus
                  className="input-glass small"
                  value={editedName}
                  onInput={(e) => setEditedName((e.target as HTMLInputElement).value)}
                  onBlur={handleSaveName}
                  onKeyDown={handleKeyDown}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <h4 className="text-truncate" style={{ margin: 0, fontSize: '1rem' }}>{space.name}</h4>
              )}
              <span className="text-dim small">{tabCount} tabs</span>
            </div>
          </div>
          
          <div className="flex-row gap-8 action-group">
            <button 
              className="btn-icon-premium"
              onClick={handleRestoreClick}
              title="Restore Space"
            >
              <Play size={16} fill="currentColor" />
            </button>
            <button 
              className="btn-icon-premium"
              onClick={handleRename}
              title="Rename Space"
            >
              <Edit2 size={16} />
            </button>
            <button 
              className="btn-icon-premium danger"
              onClick={handleDeleteClick}
              title="Delete Space"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Phase 3: Accordion Body will go here */}
      </div>
    </div>
  );
};
