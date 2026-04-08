import { useEffect, useState } from 'preact/hooks';
import { selectionModalState } from '../store';

export const ActiveTabsView = () => {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);

  useEffect(() => {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      setTabs(tabs);
    });
  }, []);

  if (tabs.length === 0) return null;

  return (
    <div className="active-tabs-view" style={{ marginBottom: '24px' }}>
      <h3 className="section-title">Current Window</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {tabs.map(tab => (
          <div 
            key={tab.id} 
            className="tab-row"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '8px',
              background: 'var(--surface-primary)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {tab.favIconUrl ? (
              <img src={tab.favIconUrl} style={{ width: 16, height: 16, borderRadius: '2px', objectFit: 'contain' }} />
            ) : (
              <div style={{ width: 16, height: 16, background: 'var(--bg-secondary)', borderRadius: '2px' }} />
            )}
            <div className="text-truncate" style={{ flex: 1, fontSize: '0.85em', color: 'var(--text-primary)' }}>
              {tab.title}
            </div>
            <button 
              className="tab-save-overlay btn-reset"
              onClick={() => {
                selectionModalState.value = { isOpen: true, mode: 'single', targetTabs: [tab.id!] };
              }}
              title="Save this tab"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
