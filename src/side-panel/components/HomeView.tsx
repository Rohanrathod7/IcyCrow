import { useEffect } from 'preact/hooks';
import { highlights, isLoading } from '../store';

export const HomeView = () => {
  useEffect(() => {
    const fetchAllHighlights = async () => {
      isLoading.value = true;
      try {
        const allData = await chrome.storage.local.get(null);
        const collected: any[] = [];
        if (allData) {
          Object.keys(allData).forEach(key => {
            if (key.startsWith('highlights:')) {
              const items = allData[key];
              if (Array.isArray(items)) {
                collected.push(...items);
              }
            }
          });
        }
        highlights.value = collected;

      } catch (err) {
        console.error('Failed to fetch highlights:', err);
      } finally {
        isLoading.value = false;
      }
    };

    fetchAllHighlights();
  }, []);

  if (isLoading.value) return <div style={{ padding: '20px' }}>Loading Highlights...</div>;
  
  if (highlights.value.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', opacity: 0.7 }}>
        <p>No highlights yet.</p>
        <p style={{ fontSize: '0.8em' }}>Start highlighting on Gemini or use the hotkey!</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '10px' }}>
      <h3 style={{ fontSize: '1.1em', marginBottom: '15px' }}>Recent Highlights</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {highlights.value.map(h => (
          <div 
            key={h.id} 
            style={{ 
              padding: '10px', 
              background: 'rgba(255,255,255,0.05)', 
              borderRadius: '6px', 
              borderLeft: `3px solid ${h.color || '#F0F0F0'}`,
              fontSize: '0.9em',
              lineHeight: '1.4'
            }}
          >
            {h.text}
          </div>
        ))}
      </div>
    </div>
  );
};
