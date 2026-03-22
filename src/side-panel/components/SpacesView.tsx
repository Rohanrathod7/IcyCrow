import { useEffect } from 'preact/hooks';
import { sendToSW } from '../../lib/messaging';
import { spaces, isLoading, error } from '../store';


export const SpacesView = () => {
  useEffect(() => {
    const fetchSpaces = async () => {
      isLoading.value = true;
      try {
        const result = await chrome.storage.local.get('spaces');
        spaces.value = result.spaces || {};
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
    <div style={{ padding: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '1.1em' }}>My Spaces</h3>
        <button 
          onClick={handleCreateSpace}
          disabled={isLoading.value}
          style={{ 
            padding: '6px 14px', 
            background: '#3a76f0', 
            color: 'white', 
            border: 'none', 
            borderRadius: '6px', 
            cursor: isLoading.value ? 'not-allowed' : 'pointer',
            fontSize: '0.9em'
          }}
        >
          + New Space
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {spaceList.map(s => (
          <div 
            key={s.id} 
            style={{ 
              padding: '12px', 
              background: 'rgba(255,255,255,0.05)', 
              borderRadius: '8px', 
              borderLeft: `4px solid ${s.color || '#444'}`,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>{s.name}</div>
            <div style={{ fontSize: '0.75em', opacity: 0.5 }}>Created: {new Date(s.createdAt as any).toLocaleDateString()}</div>
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
