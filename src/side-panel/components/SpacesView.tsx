import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { 
  DndContext, 
  DragOverlay, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  closestCorners,
  rectIntersection,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  defaultDropAnimationSideEffects,
  CollisionDetection,
  getFirstCollision
} from '@dnd-kit/core';
import { sendToSW } from '../../lib/messaging';
import { TabItem } from './TabItem';
import { EmptyState } from './EmptyState';
import { spaces, isLoading, currentAppStatus, calculateReorder, calculateMove } from '../store';
import { SpaceCard } from './SpaceCard';
import { SpaceForm } from './SpaceForm';
import type { SpacesStore, UUID, SpaceTab } from '../../lib/types';

export const SpacesView = () => {
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<SpaceTab | null>(null);
  const [draftSpaces, setDraftSpaces] = useState<SpacesStore | null>(null);
  const lastOverId = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
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
    
    // 1. Initialize draft from the source signal
    setDraftSpaces({ ...spaces.value });

    // 2. Find the tab being dragged in the signal (initial capture)
    for (const space of Object.values(spaces.value)) {
      const tab = space.tabs.find(t => t.id === activeId);
      if (tab) {
        setActiveTab(tab);
        break;
      }
    }
  };

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !draftSpaces) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeSpace = findDraftContainer(activeId, draftSpaces);
    const overSpace = draftSpaces[overId as UUID] ? overId : findDraftContainer(overId, draftSpaces);

    if (!activeSpace || !overSpace) return;

    if (activeSpace !== overSpace && lastOverId.current !== overSpace) {
      const targetSpace = draftSpaces[overSpace as UUID];
      if (!targetSpace) return;

      const overIndex = draftSpaces[overId as UUID] 
        ? targetSpace.tabs.length 
        : targetSpace.tabs.findIndex(t => t.id === overId);

      const safeIndex = overIndex === -1 ? targetSpace.tabs.length : overIndex;

      const next = calculateMove(draftSpaces, activeId, activeSpace as UUID, overSpace as UUID, safeIndex);
      if (next) {
        setDraftSpaces(next);
        lastOverId.current = overSpace;
      }
    } else if (activeId !== overId && activeSpace === overSpace) {
      if (!draftSpaces[overId as UUID]) {
        const next = calculateReorder(draftSpaces, overSpace as UUID, activeId, overId);
        if (next) setDraftSpaces(next);
      }
    }
  }, [draftSpaces]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (draftSpaces) {
      // 1. Finalize the move structure in the draft if needed
      let finalState = { ...draftSpaces };
      
      if (over) {
        const activeId = active.id as string;
        const overId = over.id as string;
        const activeSpace = findDraftContainer(activeId, finalState);
        const overSpace = finalState[overId as UUID] ? overId : findDraftContainer(overId, finalState);

        if (activeSpace && overSpace) {
          const targetSpace = finalState[overSpace as UUID];
          const overIndex = finalState[overId as UUID] 
            ? targetSpace.tabs.length 
            : targetSpace.tabs.findIndex(t => t.id === overId);
          const safeIndex = overIndex === -1 ? targetSpace.tabs.length : overIndex;

          if (activeSpace === overSpace) {
            const next = calculateReorder(finalState, overSpace as UUID, activeId, overId);
            if (next) finalState = next;
          } else {
            const next = calculateMove(finalState, activeId, activeSpace as UUID, overSpace as UUID, safeIndex);
            if (next) finalState = next;
          }
        }
      }

      // 2. Commit the entire drag session in ONE SHOT to the global store & storage
      spaces.value = finalState;
      await chrome.storage.local.set({ spaces: finalState });
    }

    // 3. Cleanup
    setActiveTab(null);
    setDraftSpaces(null);
    lastOverId.current = null;
  }, [draftSpaces]);

  const findDraftContainer = (id: string, store: SpacesStore) => {
    if (id in store) return id;
    for (const space of Object.values(store)) {
      if (space.tabs.some(t => t.id === id)) return space.id;
    }
    return undefined;
  };

  // Internal helper for components (prioritizes draft during drag)
  const findContainer = (id: string) => {
    const current = draftSpaces || spaces.value;
    return findDraftContainer(id, current);
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

  const handleCreateSpace = async (name: string, color: string, { captureCurrentTabs, createTabGroup }: { captureCurrentTabs: boolean; createTabGroup: boolean }, tabs?: any[]) => {
    try {
      currentAppStatus.value = 'saving';
      await sendToSW({
        type: 'SPACE_CREATE',
        payload: { name, color, captureCurrentTabs, createTabGroup, tabs }
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
        collisionDetection={((args) => {
          // 1. First find the container using Rect Intersection
          const containerCollisions = rectIntersection({
            ...args,
            droppableContainers: args.droppableContainers.filter(ctr => draftSpaces && !!draftSpaces[ctr.id as UUID])
          });
          
          let overId = getFirstCollision(containerCollisions, 'id');

          // 2. If no direct container hit, use standard item collision
          if (!overId) {
             const intersections = closestCorners(args);
             return intersections;
          }

          // 3. If we hit a container, find items IN that container
          const intersections = closestCorners({
            ...args,
            droppableContainers: args.droppableContainers.filter(ctr => 
              ctr.id === overId || 
              (ctr.data.current?.containerId === overId)
            )
          });
          
          return intersections.length > 0 ? intersections : containerCollisions;
        }) as CollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="bento-grid" style={{ gridTemplateColumns: '1fr' }}>
          {(draftSpaces || spaces.value) && Object.values(draftSpaces || spaces.value).map(s => (
            <SpaceCard 
              key={s.id} 
              space={s} 
              onRestore={handleRestore}
              onDelete={handleDelete}
            />
          ))}

          {Object.keys(spaces.value).length === 0 && !isLoading.value && (
            <EmptyState onAction={() => setShowForm(true)} />
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
