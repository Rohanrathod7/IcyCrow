import { useState, useEffect } from 'preact/hooks';
import { selectedContextTabs } from '../store';

interface Tab {
  id?: number;
  title?: string;
  url?: string;
  favIconUrl?: string;
}

export const ContextPicker = () => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.tabs.query({}, (result) => {
      if (chrome.runtime.lastError) {
        console.error('Tabs Query Error:', chrome.runtime.lastError);
        setLoading(false);
        return;
      }
      setTabs(result || []);
      setLoading(false);
    });
  }, []);

  const toggleTab = (tab: Tab) => {
    if (!tab.id) return;
    
    const isSelected = selectedContextTabs.value.some(t => t.tabId === tab.id);
    if (isSelected) {
      selectedContextTabs.value = selectedContextTabs.value.filter(t => t.tabId !== tab.id);
    } else {
      selectedContextTabs.value = [
        ...selectedContextTabs.value,
        { tabId: tab.id, url: tab.url || '', title: tab.title || '' }
      ];
    }
  };

  if (loading) return <div className="text-dim">Loading tabs...</div>;

  return (
    <div className="context-picker">
      <div className="picker-header">
        <span className="text-dim">{selectedContextTabs.value.length} tabs selected</span>
      </div>
      <div className="tab-list">
        {tabs.map((tab) => (
          <label key={tab.id} className="tab-item">
            <input
              type="checkbox"
              checked={selectedContextTabs.value.some(t => t.tabId === tab.id)}
              onChange={() => toggleTab(tab)}
              aria-label={tab.title}
            />
            {tab.favIconUrl && <img src={tab.favIconUrl} className="tab-icon" alt="" />}
            <div className="tab-info">
              <div className="tab-title text-truncate">{tab.title}</div>
              <div className="tab-url text-dim text-truncate">{tab.url}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};
