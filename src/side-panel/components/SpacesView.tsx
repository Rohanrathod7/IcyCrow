import { useState, useEffect, useRef } from 'preact/hooks';
import { 
  DndContext, 
  DragOverlay, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  closestCorners,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { sendToSW } from '../../lib/messaging';
import { TabItem } from './TabItem';
import { spaces, isLoading, currentAppStatus, reorderTabsInSpace, moveTabBetweenSpaces } from '../store';
import { SpaceCard } from './SpaceCard';
import { SpaceForm } from './SpaceForm';
import type { SpacesStore, UUID, SpaceTab } from '../../lib/types';

export const SpacesView = () => {
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<SpaceTab | null>(null);
  const lastOverId = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        const result = await chrome.storage.local.get('spaces');
        spaces.value = (result.spaces || {}) as SpacesStore;
      } catch (err) {
        console.error('Failed to fetch spaces:', err);
      } finally {
        isLoading.value = false;
      }
    };
    
    fetchSpaces();

    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.spaces) {
        spaces.value = (changes.spaces.newValue || {}) as SpacesStore;
      }
    };

    if (chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
    }
    
    return () => {
      if (chrome.storage?.onChanged) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
    };
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;
    
    // Find the tab being dragged
    for (const space of Object.values(spaces.value)) {
      const tab = space.tabs.find(t => t.id === activeId);
      if (tab) {
        setActiveTab(tab);
        break;
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // 1. Get Containers
    // Standard @dnd-kit pattern: use data.current if available
    const activeSpace = active.data.current?.containerId || findContainer(activeId);
    const overSpace = over.data.current?.type === 'space' ? overId : (over.data.current?.containerId || findContainer(overId));

    if (!activeSpace || !overSpace) return;

    // 2. Stability check: Don't update if we are already over this space
    if (lastOverId.current === overSpace && activeSpace === overSpace) return;

    if (activeSpace !== overSpace) {
      const overIndex = over.data.current?.type === 'space' 
        ? Object.values(spaces.value).find(s => s.id === overSpace)?.tabs.length || 0
        : Object.values(spaces.value).find(s => s.id === overSpace)?.tabs.findIndex(t => t.id === overId) ?? 0;

      moveTabBetweenSpaces(activeId, activeSpace as UUID, overSpace as UUID, overIndex, false);
      lastOverId.current = overSpace;
    } else if (activeId !== overId) {
      // Reorder within same space
      reorderTabsInSpace(overSpace as UUID, activeId, overId, false);
      lastOverId.current = overSpace;
    }
  };
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over) {
      const activeId = active.id as string;
      const overId = over.id as string;
      const activeSpace = active.data.current?.containerId || findContainer(activeId);
      const overSpace = over.data.current?.type === 'space' ? overId : (over.data.current?.containerId || findContainer(overId));

      if (activeSpace && overSpace) {
        if (activeSpace === overSpace) {
          await reorderTabsInSpace(overSpace as UUID, activeId, overId, true);
        } else {
          const overIndex = over.data.current?.type === 'space' 
            ? Object.values(spaces.value).find(s => s.id === overSpace)?.tabs.length || 0
            : Object.values(spaces.value).find(s => s.id === overSpace)?.tabs.findIndex(t => t.id === overId) ?? 0;
          await moveTabBetweenSpaces(activeId, activeSpace as UUID, overSpace as UUID, overIndex, true);
        }
      }
    }
    setActiveTab(null);
    lastOverId.current = null;
  };

  const findContainer = (id: string) => {
    // 1. Check if ID is a space itself
    if (id in spaces.value) return id;
    
    // 2. Use the most recent signal state for mapping
    const spaceEntries = Object.values(spaces.value);
    for (const space of spaceEntries) {
      if (space.tabs?.some(t => t.id === id)) return space.id;
    }
    return undefined;
  };

  const handleRestore = async (spaceId: string) => {
    const space = spaces.value[spaceId as UUID];
    if (!space) return;

    try {
      await sendToSW({
        type: 'SPACE_RESTORE',
        payload: { 
          spaceId,
          createNativeGroup: space.createNativeGroup 
        }
      } as any);
      
      // Also make it the active space in UI
      import('../store').then(m => {
        m.activeSpaceId.value = spaceId as UUID;
        m.activeView.value = 'chat';
      });
    } catch (err) {
      console.error('Failed to restore space:', err);
    }
  };

  const handleDelete = async (spaceId: string) => {
    if (!confirm('Are you sure you want to delete this space?')) return;
    try {
      await sendToSW({
        type: 'SPACE_DELETE',
        payload: { spaceId }
      } as any);
      
      const newSpaces = { ...spaces.value };
      delete newSpaces[spaceId as UUID];
      spaces.value = newSpaces;
    } catch (err) {
      console.error('Failed to delete space:', err);
    }
  };

  const handleCreateSpace = async (name: string, color: string, { captureCurrentTabs, createTabGroup }: { captureCurrentTabs: boolean; createTabGroup: boolean }) => {
    try {
      currentAppStatus.value = 'saving';
      await sendToSW({
        type: 'SPACE_CREATE',
        payload: { name, color, captureCurrentTabs, createTabGroup }
      } as any);
      
      currentAppStatus.value = 'success';
      
      // Refresh list
      const result = await chrome.storage.local.get('spaces');
      const newSpaces = (result.spaces || {}) as any;
      spaces.value = newSpaces;
      
      // Auto-focus new space if it's the only one or if we just created it
      const newId = Object.keys(newSpaces).find(id => !spaces.value[id as UUID]);
      if (newId || Object.keys(newSpaces).length === 1) {
        import('../store').then(m => {
          m.activeSpaceId.value = (newId || Object.keys(newSpaces)[0]) as UUID;
          m.activeView.value = 'chat';
        });
      }
      
      setShowForm(false);
      
      // Revert to idle after 1000ms
      setTimeout(() => {
        if (currentAppStatus.value === 'success') {
          currentAppStatus.value = 'idle';
        }
      }, 1000);
      
    } catch (err) {
      console.error('Failed to create space:', err);
      currentAppStatus.value = 'idle';
    }
  };

  const spaceList = Object.values(spaces.value);

  return (
    <div className="view-container">
      <div className="flex-row items-center" style={{ marginBottom: '16px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Spaces</h2>
        <button className="btn-primary small" onClick={() => setShowForm(true)}>+ New</button>
      </div>

      {showForm && (
        <SpaceForm 
          onSubmit={handleCreateSpace} 
          onCancel={() => setShowForm(false)} 
        />
      )}

      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="bento-grid" style={{ gridTemplateColumns: '1fr' }}>
          {spaceList.map(s => (
            <SpaceCard 
              key={s.id} 
              space={s} 
              onRestore={handleRestore}
              onDelete={handleDelete}
            />
          ))}

          {spaceList.length === 0 && !isLoading.value && (
            <div className="empty-state">
              <p className="text-dim">No spaces created yet.</p>
              <button className="btn-secondary" onClick={() => setShowForm(true)}>
                Create your first space
              </button>
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.5',
              },
            },
          }),
        }}>
          {activeTab ? (
            <div className="drag-overlay-container glass" style={{ width: '100%', pointerEvents: 'none' }}>
              <TabItem 
                tab={activeTab} 
                containerId={findContainer(activeTab.id) as UUID || '' as UUID}
                onRemove={() => {}} 
                isOverlay 
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
