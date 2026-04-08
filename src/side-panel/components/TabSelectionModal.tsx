import { useEffect, useRef, useState, useMemo } from 'preact/hooks';
import { selectionModalState, currentAppStatus, inferSpaceName, generateFallbackSpaceName } from '../store';
import { useSignal } from '@preact/signals';
import { Sparkles } from 'lucide-preact';

export const TabSelectionModal = () => {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [name, setName] = useState('');
  const [color] = useState('var(--accent-primary)');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isInferring, setIsInferring] = useState(false);
  const searchSignal = useSignal('');
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectionModalState.value.isOpen) {
      chrome.tabs.query({ currentWindow: true }, (fetchedTabs) => {
        setTabs(fetchedTabs);
        
        const state = selectionModalState.value;
        if (state.mode === 'all') {
          setSelectedIds(new Set(fetchedTabs.map(t => t.id!).filter(Boolean)));
          
          // 1. Set stable fallback immediately
          setName(generateFallbackSpaceName());
          
          // 2. Try to enrich with AI silently
          const titles = fetchedTabs.map(t => t.title).filter(Boolean) as string[];
          inferSpaceName(titles).then(suggested => {
             if (suggested) setName(suggested);
          });
        } else if (state.mode === 'single' && state.targetTabs.length > 0) {
          setSelectedIds(new Set(state.targetTabs));
          
          const tab = fetchedTabs.find(t => t.id === state.targetTabs[0]);
          setName(tab?.title || 'New Space');
        } else {
          setSelectedIds(new Set());
          setName('');
        }
      });
      searchSignal.value = '';
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [selectionModalState.value]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!selectionModalState.value.isOpen) return;
        if (e.key === '/' && document.activeElement !== nameInputRef.current && document.activeElement !== searchInputRef.current) {
            e.preventDefault();
            searchInputRef.current?.focus();
        }
        if (e.key === 'Escape') {
            selectionModalState.value = { ...selectionModalState.value, isOpen: false };
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
    if (!name.trim() || selectedIds.size === 0) return;

    currentAppStatus.value = 'saving';
    selectionModalState.value = { ...selectionModalState.value, isOpen: false };

    try {
      const spaceTabs = tabs.filter(t => selectedIds.has(t.id!)).map(t => ({
        id: crypto.randomUUID() as any, // ID will be generated in SW but let's scrub it to match SpaceTab
        url: t.url!,
        title: t.title || 'Untitled',
        favIconUrl: t.favIconUrl || undefined
      }));

      const response = await chrome.runtime.sendMessage({
        type: 'SPACE_CREATE',
        payload: { 
          name, 
          color, 
          captureCurrentTabs: false,
          createTabGroup: false,
          tabs: spaceTabs
        }
      });

      if (response && response.ok) {
        currentAppStatus.value = 'success';
        setTimeout(() => currentAppStatus.value = 'idle', 2000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (currentAppStatus.value === 'saving') {
        currentAppStatus.value = 'idle';
      }
    }
  };

  const handleManualInfer = async () => {
    const titles = tabs.filter(t => selectedIds.has(t.id!)).map(t => t.title).filter(Boolean) as string[];
    if (titles.length === 0) return;
    
    setIsInferring(true);
    try {
      const suggested = await inferSpaceName(titles, 12000); // 12s timeout for manual
      if (suggested) {
        setName(suggested);
      }
    } finally {
      setIsInferring(false);
    }
  };

  const toggleTab = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  if (!selectionModalState.value.isOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => selectionModalState.value = { ...selectionModalState.value, isOpen: false }}>
      <div className="modal-content modal-glass" onClick={e => e.stopPropagation()} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', maxHeight: '100vh', overflow: 'hidden', gap: '10px', width: '92%' }}>
        
        {/* Header */}
        <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '10px' }}>Save to Space</h2>
            
            <div className="flex-row" style={{ marginBottom: '4px' }}>
                <label className="label-saas" style={{ margin: 0, fontSize: '0.6rem' }}>SPACE NAME</label>
                <button 
                  onClick={handleManualInfer}
                  disabled={isInferring || selectedIds.size === 0}
                  className={`btn-ai-infer ${isInferring ? 'shimmer-pulse' : ''}`}
                  title="Auto-name with Gemini"
                >
                  <Sparkles size={10} style={{ marginRight: '4px' }} />
                  {isInferring ? 'Thinking...' : 'AI Name'}
                </button>
            </div>
            
            <input 
              ref={nameInputRef}
              type="text" 
              value={name} 
              onInput={e => setName((e.target as HTMLInputElement).value)} 
              placeholder="e.g. Research Session" 
              className="input-saas"
              style={{ marginBottom: '10px', padding: '8px 12px', fontSize: '0.85rem' }}
            />
            
            <div style={{ position: 'relative' }}>
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search tabs... (/ to focus)"
                    className="input-saas"
                    value={searchSignal.value}
                    onInput={e => searchSignal.value = (e.target as HTMLInputElement).value}
                    style={{ paddingLeft: '32px', paddingRight: '10px', paddingBottom: '6px', paddingTop: '6px', fontSize: '0.8rem' }}
                />
                <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, color: '#fff' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, minHeight: 0, maxHeight: '220px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                <span className="label-saas" style={{ margin: 0, fontSize: '0.6rem' }}>
                    {selectedIds.size} of {tabs.length} SELECTED
                </span>
                {selectedIds.size === tabs.length ? (
                     <button className="btn-pill-compact" onClick={() => setSelectedIds(new Set())}>Deselect All</button>
                ) : (
                     <button className="btn-pill-compact" onClick={() => setSelectedIds(new Set(tabs.map(t=>t.id!)))}>Select All</button>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {visibleTabs.map(tab => (
                    <label 
                        key={tab.id}
                        className="checkbox-label"
                        style={{
                            background: selectedIds.has(tab.id!) ? 'rgba(255,255,255,0.05)' : 'transparent',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            margin: 0,
                            fontSize: '0.775rem'
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
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button className="btn-ghost-premium" style={{ padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => selectionModalState.value = { ...selectionModalState.value, isOpen: false }}>Cancel</button>
            <button className="btn-primary" style={{ padding: '4px 16px', fontSize: '0.8rem' }} onClick={handleSave} disabled={!name.trim() || selectedIds.size === 0}>
                Create Space
            </button>
        </div>

      </div>
    </div>
  );
};
