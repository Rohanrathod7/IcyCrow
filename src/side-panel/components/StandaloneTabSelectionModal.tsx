import { useEffect, useRef, useState, useMemo } from 'preact/hooks';
import { standaloneModalState, currentAppStatus, addMultipleStandaloneTabs } from '../store';
import { useSignal } from '@preact/signals';

export const StandaloneTabSelectionModal = () => {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const searchSignal = useSignal('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (standaloneModalState.value.isOpen) {
      chrome.tabs.query({ currentWindow: true }, (fetchedTabs) => {
        setTabs(fetchedTabs);
        setSelectedIds(new Set(fetchedTabs.map(t => t.id!).filter(Boolean)));
      });
      searchSignal.value = '';
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [standaloneModalState.value]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!standaloneModalState.value.isOpen) return;
        if (e.key === 'Escape') {
            standaloneModalState.value = { isOpen: false };
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const visibleTabs = useMemo(() => {
      const qs = searchSignal.value.toLowerCase();
      if (!qs) return tabs;
      return tabs.filter(t => t.title?.toLowerCase().includes(qs) || t.url?.toLowerCase().includes(qs));
  }, [tabs, searchSignal.value]);

  const handleSave = async (e: Event) => {
    e.preventDefault();
    if (selectedIds.size === 0) return;

    currentAppStatus.value = 'saving';
    standaloneModalState.value = { isOpen: false };

    try {
      const tabsToSave = tabs.filter(t => selectedIds.has(t.id!));
      const response = await addMultipleStandaloneTabs(tabsToSave);

      if (response && response.success) {
        currentAppStatus.value = 'success';
        setTimeout(() => currentAppStatus.value = 'idle', 2000);
      } else {
        console.error('Failed to save multiple standalone tabs:', response.reason);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (currentAppStatus.value === 'saving') {
        currentAppStatus.value = 'idle';
      }
    }
  };

  const toggleTab = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  if (!standaloneModalState.value.isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => standaloneModalState.value = { isOpen: false }}>
      <div className="modal-content modal-glass" onClick={e => e.stopPropagation()} style={{ padding: '16px', display: 'flex', flexDirection: 'column', maxHeight: '100vh', overflow: 'hidden', gap: '12px', width: '90%' }}>
        
        {/* Header */}
        <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', marginBottom: '12px' }}>Save Tabs to Standalone</h2>
            
            <div style={{ position: 'relative' }}>
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search tabs..."
                    className="input-saas"
                    value={searchSignal.value}
                    onInput={e => searchSignal.value = (e.target as HTMLInputElement).value}
                    style={{ paddingLeft: '32px', paddingRight: '10px', paddingBottom: '8px', paddingTop: '8px', fontSize: '0.85rem' }}
                />
                <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, color: '#fff' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, maxHeight: '250px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                <span className="label-saas" style={{ margin: 0, fontSize: '0.6rem' }}>
                    {selectedIds.size} of {tabs.length} SELECTED
                </span>
                {selectedIds.size === tabs.length ? (
                     <button className="btn-reset text-accent" style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent-primary)' }} onClick={() => setSelectedIds(new Set())}>Deselect All</button>
                ) : (
                     <button className="btn-reset text-accent" style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent-primary)' }} onClick={() => setSelectedIds(new Set(tabs.map(t=>t.id!)))}>Select All</button>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {visibleTabs.map(tab => (
                    <label 
                        key={tab.id}
                        className="checkbox-label"
                        style={{
                            background: selectedIds.has(tab.id!) ? 'rgba(255,255,255,0.05)' : 'transparent',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            margin: 0
                        }}
                    >
                        <input 
                            type="checkbox" 
                            checked={selectedIds.has(tab.id!)} 
                            onChange={() => toggleTab(tab.id!)}
                        />
                        {tab.favIconUrl ? (
                            <img src={tab.favIconUrl} style={{ width: 14, height: 14, borderRadius: '2px', objectFit: 'contain' }} />
                        ) : (
                            <div style={{ width: 14, height: 14, background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }} />
                        )}
                        <span className="text-truncate" style={{ flex: 1, opacity: selectedIds.has(tab.id!) ? 1 : 0.7 }}>
                            {tab.title}
                        </span>
                    </label>
                ))}
                {visibleTabs.length === 0 && (
                    <div style={{ fontSize: '0.85em', color: 'var(--text-dim)', textAlign: 'center', padding: '16px 0' }}>No tabs match your search.</div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button className="btn-ghost-premium" style={{ padding: '6px 12px', fontSize: '0.85rem' }} onClick={() => standaloneModalState.value = { isOpen: false }}>Cancel</button>
            <button className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.85rem' }} onClick={handleSave} disabled={selectedIds.size === 0}>
                Save Tabs
            </button>
        </div>

      </div>
    </div>
  );
};
