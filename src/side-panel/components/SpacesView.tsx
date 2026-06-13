import { useEffect } from 'preact/hooks';
import { sendToSW } from '../../lib/messaging';
import { EmptyState } from './EmptyState';
import { 
  spaces, 
  isLoading, 
  draftSpaces,
  searchQuery
} from '../store';
import { SpaceCard } from './SpaceCard';
import { SplitButton } from './SplitButton';
import { TabSelectionModal } from './TabSelectionModal';
import type { SpacesStore, UUID } from '../../lib/types';

export const SpacesView = () => {
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

  const handleRestore = async (spaceId: string) => {
    const space = spaces.value[spaceId as UUID];
    if (!space) return;

    try {
      await sendToSW({
        type: 'SPACE_RESTORE',
        payload: { 
          spaceId: spaceId as UUID,
          createNativeGroup: space.createNativeGroup 
        }
      });
      
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
        payload: { spaceId: spaceId as UUID }
      });
      
      const newSpaces = { ...spaces.value };
      delete newSpaces[spaceId as UUID];
      spaces.value = newSpaces;
    } catch (err) {
      console.error('Failed to delete space:', err);
    }
  };

  const query = searchQuery.value.toLowerCase().trim();
  const rawStore = draftSpaces.value || spaces.value;

  const filteredSpaces = Object.values(rawStore).filter((space) => {
    if (!query) return true;
    const spaceNameMatches = space.name.toLowerCase().includes(query);
    const hasMatchingTab = space.tabs && space.tabs.some(tab => 
      tab.title.toLowerCase().includes(query) || 
      tab.url.toLowerCase().includes(query)
    );
    return spaceNameMatches || hasMatchingTab;
  });

  return (
    <div className="view-container">
      <SplitButton 
        onMainClick={async () => {
          const store = await import('../store');
          store.saveCurrentSessionAsSpace();
        }}
        onChevronClick={async () => {
          const store = await import('../store');
          store.selectionModalState.value = { isOpen: true, mode: 'all', targetTabs: [] };
        }}
      />
      <TabSelectionModal />

      <div className="flex-row items-center justify-between" style={{ marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
        <h2 className="section-title" style={{ margin: 0, fontSize: '0.85rem', letterSpacing: '-0.01em', fontWeight: 700 }}>Spaces</h2>
        <button className="btn-primary small animate-fade-in" onClick={async () => {
           const store = await import('../store');
           store.selectionModalState.value = { isOpen: true, mode: 'none', targetTabs: [] };
        }} title="Create a new workspace">+ New Space</button>
      </div>

      <div className="spaces-list">
        {filteredSpaces.map((s) => (
          <div 
            key={s.id} 
            className="animate-slide-up" 
          >
            <SpaceCard 
              space={s} 
              onRestore={handleRestore}
              onDelete={handleDelete}
            />
          </div>
        ))}

        {Object.keys(spaces.value).length === 0 && !isLoading.value && (
          <EmptyState onAction={async () => {
            const store = await import('../store');
            store.selectionModalState.value = { isOpen: true, mode: 'none', targetTabs: [] };
          }} />
        )}
      </div>
    </div>
  );
};
