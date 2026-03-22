import { useEffect } from 'preact/hooks';
import { sendToSW } from '../../lib/messaging';
import { spaces, isLoading, error, type ViewType } from '../store';
import type { SpacesStore } from '../../lib/types';



export const SpacesView = () => {
  useEffect(() => {
    const fetchSpaces = async () => {
      isLoading.value = true;
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

  const handleCreateSpace = async () => {
    const name = window.prompt('Enter space name:');
    if (!name) return;

    isLoading.value = true;
    try {
      await sendToSW({
        type: 'SPACE_CREATE',
        payload: { name }
      } as any);
      
      // Refresh list
      const result = await chrome.storage.local.get('spaces');
      spaces.value = (result.spaces || {}) as any;
    } catch (err) {
      console.error('Failed to create space:', err);
      error.value = 'Failed to create space. Please try again.';
    } finally {
      isLoading.value = false;
    }
  };

  const spaceList = Object.values(spaces.value);

  return (
    <div className="view-container">
      <div className="flex-row" style={{ marginBottom: '10px' }}>
        <h3 className="section-title" style={{ marginBottom: 0 }}>My Spaces</h3>
        <button 
          onClick={handleCreateSpace}
          disabled={isLoading.value}
          className="btn-primary"
          style={{ padding: '6px 14px', fontSize: '0.9em' }}
        >
          + Space
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {spaceList.map(s => (
          <div 
            key={s.id} 
            className="card"
            style={{ 
              borderLeft: `4px solid ${s.color || '#444'}`,
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>{s.name}</div>
            <div className="text-dim">Created: {new Date(s.createdAt as any).toLocaleDateString()}</div>
          </div>
        ))}


        {spaceList.length === 0 && !isLoading.value && (
          <div style={{ textAlign: 'center', opacity: 0.5, padding: '40px 0' }}>
            <p>No spaces created yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};
