import { useEffect } from 'preact/hooks';
import { sendToSW } from '../../lib/messaging';
import { spaces, isLoading, error } from '../store';
import { SpaceCard } from './SpaceCard';
import type { SpacesStore, UUID } from '../../lib/types';

export const SpacesView = () => {
  useEffect(() => {
    const fetchSpaces = async () => {
      // Small delay to ensure store signal is ready if needed, 
      // but primarily just fetching from storage
      try {
        const result = await chrome.storage.local.get('spaces');
        spaces.value = (result.spaces || {}) as SpacesStore;
      } catch (err) {
        console.error('Failed to fetch spaces:', err);
        error.value = 'Failed to load spaces.';
      } finally {
        isLoading.value = false;
      }
    };
    fetchSpaces();
  }, []);

  const handleRestore = async (spaceId: string) => {
    try {
      await sendToSW({
        type: 'SPACE_RESTORE',
        payload: { spaceId }
      } as any);
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
      
      // Optimistic update
      const newSpaces = { ...spaces.value };
      delete newSpaces[spaceId as UUID];
      spaces.value = newSpaces;
    } catch (err) {
      console.error('Failed to delete space:', err);
    }
  };

  const handleCreatePrompt = async () => {
    // This will be replaced by SpaceForm in Phase 3
    const name = window.prompt('Space Name:');
    if (!name) return;
    
    try {
      await sendToSW({
        type: 'SPACE_CREATE',
        payload: { name, color: '#4a90e2', captureCurrentTabs: true }
      } as any);
      
      // Refresh
      const result = await chrome.storage.local.get('spaces');
      spaces.value = (result.spaces || {}) as any;
    } catch (err) {
      console.error('Failed to create space:', err);
    }
  };

  const spaceList = Object.values(spaces.value);

  return (
    <div className="view-container">
      <div className="flex-row items-center" style={{ marginBottom: '16px' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Spaces</h2>
        <button className="btn-primary small" onClick={handleCreatePrompt}>+ New</button>
      </div>

      <div className="spaces-list flex-col gap-12">
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
            <button className="btn-secondary" onClick={handleCreatePrompt}>
              Create your first space
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
