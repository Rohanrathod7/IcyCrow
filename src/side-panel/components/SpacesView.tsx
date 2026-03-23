import { useState, useEffect } from 'preact/hooks';
import { sendToSW } from '../../lib/messaging';
import { spaces, isLoading, error } from '../store';
import { SpaceCard } from './SpaceCard';
import { SpaceForm } from './SpaceForm';
import type { SpacesStore, UUID } from '../../lib/types';

export const SpacesView = () => {
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const fetchSpaces = async () => {
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
      
      const newSpaces = { ...spaces.value };
      delete newSpaces[spaceId as UUID];
      spaces.value = newSpaces;
    } catch (err) {
      console.error('Failed to delete space:', err);
    }
  };

  const handleCreateSpace = async (data: { name: string; color: string; captureCurrentTabs: boolean; createTabGroup: boolean }) => {
    try {
      await sendToSW({
        type: 'SPACE_CREATE',
        payload: data
      } as any);
      
      // Refresh list
      const result = await chrome.storage.local.get('spaces');
      spaces.value = (result.spaces || {}) as any;
      setShowForm(false);
    } catch (err) {
      console.error('Failed to create space:', err);
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
    </div>
  );
};
