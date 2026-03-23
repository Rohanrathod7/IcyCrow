import { useEffect } from 'preact/hooks';
import { allHighlights, isLoading, error } from '../store';


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
        allHighlights.value = collected;

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
  
  if (allHighlights.value.length === 0) {
    return (
      <div className="empty-state">
        <p>No highlights yet.</p>
        <p className="text-dim">Start highlighting on Gemini or use the hotkey!</p>
      </div>
    );
  }

  return (
    <div className="view-container">
      <h3 className="section-title">✨ Recent Highlights</h3>
      <div className="bento-grid" style={{ gridTemplateColumns: '1fr' }}>
        {allHighlights.value.map((h: any) => (
          <div 
            key={h.id} 
            className="bento-item"
            style={{ 
              borderLeft: `4px solid ${h.color || 'var(--accent-primary)'}`
            }}
          >
            <div className="text-truncate" style={{ fontWeight: 500, marginBottom: '4px' }}>
              {h.text}
            </div>
            <div className="text-dim" style={{ fontSize: '0.75em' }}>
              {new Date(h.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

