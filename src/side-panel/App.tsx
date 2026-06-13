import { 
  activeView, 
  isLoading, 
  error, 
  syncAllHighlights, 
  commandPaletteOpen, 
  spaces,
  dashboardViewMode,
  hydrateStore
} from './store';
import { batch } from '@preact/signals';
import { HomeView } from './components/HomeView';
import { SearchView } from './components/SearchView';
import { SpacesView } from './components/SpacesView';
import { SettingsView } from './components/SettingsView';
import { ChatView } from './components/ChatView';
import { HighlightsPanel } from './components/HighlightsPanel';
import { DatabaseHeader } from './components/DatabaseHeader';
import { CommandPalette } from './components/CommandPalette';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useEffect } from 'preact/hooks';
import { StandaloneTabsView } from './components/StandaloneTabsView';
import { 
  DndContext, 
  DragOverlay, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  closestCorners,
  pointerWithin,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  CollisionDetection,
  getFirstCollision
} from '@dnd-kit/core';
import { TabItem } from './components/TabItem';
import { 
  activeDragTab, 
  draftSpaces, 
  calculateMove, 
  calculateReorder 
} from './store';
import type { UUID, SpacesStore } from '../lib/types';
import './panel.css';
import '../assets/styles/animations.css';

export const App = () => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    hydrateStore();
    syncAllHighlights();
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;
    
    // 1. Initialize draft from the source signal
    draftSpaces.value = JSON.parse(JSON.stringify(spaces.value));

    // 2. Find the tab being dragged in the signal (initial capture)
    for (const space of Object.values(spaces.value)) {
      const tab = space.tabs.find(t => t.id === activeId);
      if (tab) {
        activeDragTab.value = tab;
        break;
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    const currentDraft = draftSpaces.value;
    if (!over || !currentDraft) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const findDraftContainer = (id: string, store: SpacesStore) => {
      if (id in store) return id;
      for (const space of Object.values(store)) {
        if (space.tabs.some(t => t.id === id)) return space.id;
      }
      return undefined;
    };

    const activeSpace = findDraftContainer(activeId, currentDraft);
    const overSpace = currentDraft[overId as UUID] ? overId : findDraftContainer(overId, currentDraft);

    if (!activeSpace || !overSpace) return;

    if (activeSpace !== overSpace) {
      const targetSpace = currentDraft[overSpace as UUID];
      if (!targetSpace) return;

      const overIndex = currentDraft[overId as UUID] 
        ? targetSpace.tabs.length 
        : targetSpace.tabs.findIndex(t => t.id === overId);

      const safeIndex = overIndex === -1 ? targetSpace.tabs.length : overIndex;

      const next = calculateMove(currentDraft, activeId, activeSpace as UUID, overSpace as UUID, safeIndex);
      if (next) {
        draftSpaces.value = next;
      }
    } else {
      // LIVE SAME-SPACE REORDER:
      // Update draft state immediately during same-space dragging.
      // This ensures the DOM nodes shift to their final target positions BEFORE the drop animation resolves.
      const sourceSpace = currentDraft[activeSpace as UUID];
      const oldIndex = sourceSpace.tabs.findIndex(t => t.id === activeId);
      const newIndex = sourceSpace.tabs.findIndex(t => t.id === overId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const next = calculateReorder(currentDraft, activeSpace as UUID, activeId, overId);
        if (next) {
          draftSpaces.value = next;
        }
      }
    }
  };

  const handleDragEnd = async (_event: DragEndEvent) => {
    const finalDraft = draftSpaces.value;
    
    if (finalDraft) {
      batch(() => {
        spaces.value = finalDraft;
      });
      await chrome.storage.local.set({ spaces: finalDraft });
    }

    setTimeout(() => {
      batch(() => {
        activeDragTab.value = null;
        draftSpaces.value = null;
      });
    }, 350);
  };

  const handleDragCancel = () => {
    batch(() => {
      activeDragTab.value = null;
      draftSpaces.value = null;
    });
  };

  const renderView = () => {
    switch (activeView.value) {
      case 'home': 
      case 'spaces':
        return (
          <div className="dashboard-layout">
            <div className="dashboard-content-wrapper">
              <div className={`dashboard-slide ${dashboardViewMode.value === 'spaces' ? 'active' : ''}`}>
                <SpacesView />
              </div>
              <div className={`dashboard-slide ${dashboardViewMode.value === 'tabs' ? 'active' : ''}`}>
                <StandaloneTabsView />
              </div>
            </div>
          </div>
        );
      case 'search': return <SearchView />;
      case 'chat': return <ChatView />;
      case 'settings': return <SettingsView />;
      case 'highlights':
        return <HighlightsPanel />;
      default:
        return <HomeView />;
    }
  };

  return (
    <ErrorBoundary>
      <DndContext 
        sensors={sensors}
        measuring={{
          droppable: {
            strategy: 1 // MeasuringStrategy.Always
          }
        }}
        collisionDetection={((args) => {
          const currentStore = draftSpaces.value || spaces.value;
          const containerCollisions = pointerWithin({
            ...args,
            droppableContainers: args.droppableContainers.filter(ctr => !!currentStore[ctr.id as UUID])
          });
          const overId = getFirstCollision(containerCollisions, 'id');
          if (!overId) return closestCorners(args);
          const itemCollisions = closestCorners({
            ...args,
            droppableContainers: args.droppableContainers.filter(ctr => ctr.data.current?.containerId === overId)
          });
          if (itemCollisions.length > 0) return itemCollisions;
          if (args.active?.data.current?.containerId !== overId) return containerCollisions;
          return [];
        }) as CollisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div 
          className={`side-panel-root ${activeDragTab.value ? 'is-dragging-session' : ''}`} 
          style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-panel)', color: 'var(--text-main)' }}
        >
          {error.value && (
            <div className="error-banner">
              <span>{error.value}</span>
              <button onClick={() => error.value = null} className="close-btn" style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2em' }}>×</button>
            </div>
          )}
          
          {isLoading.value && activeView.value !== 'chat' && (
            <div className="loading-overlay">
              <div className="glass-card card" style={{ padding: '20px' }}>Loading...</div>
            </div>
          )}

          <DatabaseHeader />
          <main style={{ flex: 1, overflowY: 'auto', backgroundColor: '#121212' }}>
            {renderView()}
          </main>
          
          <CommandPalette 
            isOpen={commandPaletteOpen.value} 
            onClose={() => commandPaletteOpen.value = false} 
            spaces={spaces.value} 
          />
        </div>

        <DragOverlay dropAnimation={{
          duration: 250,
          easing: 'cubic-bezier(0.18, 1, 0.32, 1)',
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.5',
              },
            },
          }),
        }}>
          {activeDragTab.value ? (
            <div 
              className="drag-overlay-container glass" 
              style={{ 
                width: '100%', 
                pointerEvents: 'none',
                transform: 'scale(1.02)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1)',
                borderRadius: '8px',
                overflow: 'hidden',
                zIndex: 9999
              }}
            >
              <TabItem 
                tab={activeDragTab.value} 
                containerId={'' as UUID} // Placeholder for overlay
                onRemove={() => {}} 
                isOverlay 
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </ErrorBoundary>
  );
};
