import { useEffect } from 'preact/hooks';
import { highlights, isLoading, error } from '../store';


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
        error.value = 'Failed to load highlights. Please reload.';
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
    <div className="view-container">
      <h3 className="section-title">Recent Highlights</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {highlights.value.map(h => (
          <div 
            key={h.id} 
            className="card"
            style={{ 
              borderLeft: `3px solid ${h.color || '#F0F0F0'}`,
            }}
          >
            {h.text}
          </div>
        ))}
      </div>
    </div>
  );
};

