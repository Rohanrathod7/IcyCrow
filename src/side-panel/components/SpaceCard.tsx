import { useState, useEffect, useRef } from 'preact/hooks';
import { memo } from 'preact/compat';
import { Space, UUID } from '../../lib/types';
import { expandedSpaceId, updateSpaceConfig, removeTabFromSpace, activeWorkspaces, triggerManualSync, addActiveTabToSpace, searchQuery, currentWindowId } from '../store';
import { ChevronDown, ChevronUp, ArrowUpRight, Edit2, Trash2, Save, MoreVertical, Plus, Check } from 'lucide-preact';
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
  const [showMenu, setShowMenu] = useState(false);
  const [isJustSaved, setIsJustSaved] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);
  
  const isExpanded = searchQuery.value.trim() !== '' || expandedSpaceId.value === space.id;
  const tabCount = space.tabs?.length || 0;
  // Live means it's mapped to ANY window (for pulse), but we could refine to "current window"
  const isLive = Object.values(activeWorkspaces.value).includes(space.id);
  const isActiveInCurrentWindow = currentWindowId.value !== null && activeWorkspaces.value[currentWindowId.value] === space.id;

  const { setNodeRef } = useDroppable({
    id: space.id,
    data: {
      type: 'space',
      spaceId: space.id
    }
  });

  const handleToggleExpand = (e: MouseEvent) => {
    e.stopPropagation();
    const expanding = !isExpanded;
    expandedSpaceId.value = expanding ? space.id : null;
    
    // Add a temporary animation class to the card if opening
    if (expanding && cardRef.current) {
        cardRef.current.classList.add('is-opening');
        setTimeout(() => {
            cardRef.current?.classList.remove('is-opening');
        }, 400); 
    }
  };

  const handleRename = (e: MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setShowMenu(false);
  };

  const handleSaveName = async () => {
    if (editedName.trim() && editedName !== space.name) {
      await updateSpaceConfig(space.id, { name: editedName });
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
    if (confirm(`Delete space "${space.name}"?`)) {
        onDelete(space.id);
    }
    setShowMenu(false);
  };

  const handleRestoreClick = (e: MouseEvent) => {
    e.stopPropagation();
    onRestore(space.id);
  };

  const handleSyncModeChange = async (mode: 'auto' | 'manual', e: MouseEvent) => {
    e.stopPropagation();
    await updateSpaceConfig(space.id, { syncMode: mode });
  };

  const handleManualSync = async (e: MouseEvent) => {
    e.stopPropagation();
    await triggerManualSync(space.id);
    setShowMenu(false);
  };

  const handleRemoveTab = async (tabId: UUID) => {
    await removeTabFromSpace(space.id, tabId);
  };

  const toggleMenu = (e: MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  const [saveResult, setSaveResult] = useState<'success' | 'duplicate' | 'restricted' | 'no_active_tab' | 'storage_error' | null>(null);

  const handleQuickAdd = async (e: MouseEvent) => {
    e.stopPropagation();
    if (isJustSaved || saveResult) return;

    try {
      const result = await addActiveTabToSpace(space.id);
      if (result.success) {
        setSaveResult(result.reason === 'duplicate' ? 'duplicate' : 'success');
        setIsJustSaved(true);
        setTimeout(() => {
          setIsJustSaved(false);
          setSaveResult(null);
        }, 1500);
      } else {
        const failureReason = result.reason as any;
        setSaveResult(failureReason);
        console.error(`[IcyCrow] Quick Add failed in UI: ${failureReason}`);
        setTimeout(() => setSaveResult(null), 3000); // Longer for errors
      }
    } catch (err) {
      setSaveResult('storage_error');
      setTimeout(() => setSaveResult(null), 3000);
    }
  };

  const getQuickAddTitle = () => {
    if (saveResult === 'success') return 'Added!';
    if (saveResult === 'duplicate') return 'Already Saved';
    if (saveResult === 'restricted') return 'Settings/System pages cannot be saved';
    if (saveResult === 'no_active_tab') return 'Error: No active tab found. Try focusing the browser window first.';
    if (saveResult === 'storage_error') return 'Storage Error: Could not save tab.';
    return 'Quick Add Active Tab';
  };

  return (
    <div 
      ref={(el) => {
        setNodeRef(el);
        (cardRef as any).current = el;
      }}
      className={`space-card ${isExpanded ? 'expanded' : ''} ${isLive ? 'live-border' : ''} ${isActiveInCurrentWindow ? 'current-window-card' : ''}`}
      data-testid={`space-card-${space.id}`}
      style={{ 
        borderLeftColor: space.color || 'var(--accent-primary)',
        zIndex: showMenu ? 100 : undefined 
      }}
    >
      <div className="flex-col gap-8">
        <div className="space-card-header">
          <div className="space-card-title-group" onClick={handleToggleExpand}>
            <div className="chevron-icon">
              {isExpanded ? <ChevronUp size={14} className="text-dim" /> : <ChevronDown size={14} className="text-dim" />}
            </div>
            
            <div className="flex-row items-center gap-2 min-width-0">
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
                <span className="font-semibold text-white text-truncate" style={{ fontSize: '0.875rem' }}>
                    {space.name}
                </span>
              )}
              {isActiveInCurrentWindow ? (
                <div className="badge-pill-current-window">
                  <div className="pulse-dot-mini" style={{ margin: 0 }} />
                  <span>Current</span>
                </div>
              ) : isLive ? (
                <div className="pulse-dot-mini" title="Active in another window" />
              ) : null}
              <div className="badge-pill-count">
                  {tabCount}
              </div>
            </div>
          </div>
          
          <div className="flex-row items-center gap-2 no-shrink">
            <button 
              className={`btn-ghost-small ${isJustSaved ? 'text-green-400 animate-scale-up' : ''} ${saveResult === 'restricted' ? 'text-red-400' : ''}`}
              onClick={handleQuickAdd}
              title={getQuickAddTitle()}
            >
              {isJustSaved ? <Check size={14} /> : <Plus size={14} />}
            </button>

            <button 
              className="btn-ghost-small"
              onClick={handleRestoreClick}
              title="Restore"
            >
              <ArrowUpRight size={14} />
            </button>
            
            <div className="relative">
              <button 
                className={`btn-ghost-small ${showMenu ? 'active' : ''}`}
                onClick={toggleMenu}
                title="Options"
              >
                <MoreVertical size={14} />
              </button>
              
              {showMenu && (
                <div className="dropdown-menu-glass glass-card">
                  <div className="menu-section">
                    <div className="menu-label">Sync Mode</div>
                    <div className="segmented-control tiny">
                        <div 
                            className="segment-slider" 
                            style={{ 
                                width: 'calc(50% - 2px)', 
                                transform: `translateX(${space.syncMode === 'auto' ? '0' : '100%'})` 
                            }} 
                        />
                        <div className={`segment-item ${space.syncMode === 'auto' ? 'active' : ''}`} onClick={(e) => handleSyncModeChange('auto', e)}>Auto</div>
                        <div className={`segment-item ${space.syncMode !== 'auto' ? 'active' : ''}`} onClick={(e) => handleSyncModeChange('manual', e)}>Man</div>
                    </div>
                    {space.syncMode !== 'auto' && isLive && (
                        <button className="menu-item-btn" onClick={handleManualSync}>
                            <Save size={12} /> Snapshot Now
                        </button>
                    )}
                  </div>
                  <div className="menu-divider" />
                  <button className="menu-item-btn" onClick={handleRename}>
                    <Edit2 size={12} /> Rename
                  </button>
                  <button className="menu-item-btn danger" onClick={handleDeleteClick}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {isExpanded && space.tabs && (() => {
          const query = searchQuery.value.toLowerCase().trim();
          const displayedTabs = space.tabs.filter(tab => {
            if (!query) return true;
            return tab.title.toLowerCase().includes(query) || tab.url.toLowerCase().includes(query);
          });
          return (
            <div className="accordion-body" style={{ minHeight: displayedTabs.length === 0 ? '40px' : 'auto' }}>
              <SortableContext items={displayedTabs.map(t => t.id)} strategy={verticalListSortingStrategy}>
                {displayedTabs.map(tab => (
                  <TabItem key={tab.id} tab={tab} containerId={space.id} onRemove={handleRemoveTab} />
                ))}
                {displayedTabs.length === 0 && (
                  <div className="empty-drop-zone text-dim small center" style={{ padding: '8px', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
                    {query ? 'No matching tabs' : 'Drop tabs here'}
                  </div>
                )}
              </SortableContext>
            </div>
          );
        })()}
      </div>
    </div>
  );
});
