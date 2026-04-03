import { useMemo, useEffect, useRef } from 'preact/hooks';
import { useSignal } from '@preact/signals';
import { Search, Globe } from 'lucide-preact';
import type { SpacesStore } from '../../lib/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  spaces: SpacesStore;
}

export const CommandPalette = ({ isOpen, onClose, spaces }: CommandPaletteProps) => {
  const query = useSignal('');
  const selectedIndex = useSignal(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten spaces into a searchable list of tabs
  const allTabs = useMemo(() => {
    return Object.values(spaces).flatMap(space =>
      space.tabs.map(tab => ({
        ...tab,
        spaceName: space.name,
        spaceColor: space.color
      }))
    );
  }, [spaces]);

  const filteredTabs = useMemo(() => {
    const q = query.value.toLowerCase();
    if (!q) return allTabs.slice(0, 10);
    return allTabs.filter(tab => 
      tab.title.toLowerCase().includes(q) || 
      tab.url.toLowerCase().includes(q)
    );
  }, [allTabs, query.value]);

  useEffect(() => {
    if (isOpen) {
      query.value = '';
      selectedIndex.value = 0;
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          selectedIndex.value = (selectedIndex.value + 1) % Math.max(1, filteredTabs.length);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          selectedIndex.value = (selectedIndex.value - 1 + filteredTabs.length) % Math.max(1, filteredTabs.length);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredTabs[selectedIndex.value]) {
            handleOpenTab(filteredTabs[selectedIndex.value].url);
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose, filteredTabs, selectedIndex.value]);

  if (!isOpen) return null;

  const handleOpenTab = (url: string) => {
    chrome.tabs.create({ url });
    onClose();
  };

  return (
    <div 
      className="command-palette-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'start',
        justifyContent: 'center',
        paddingTop: '15vh'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div 
        className="glass-card"
        style={{
          width: '90%',
          maxWidth: '500px',
          backgroundColor: '#1a1a1a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '16px', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <Search size={20} color="var(--text-dim)" style={{ marginRight: '12px' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tabs across all spaces..."
            value={query.value}
            onInput={(e) => { query.value = (e.target as HTMLInputElement).value; }}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'white',
              fontSize: '16px',
              fontFamily: 'inherit'
            }}
          />
          <div style={{ 
            fontSize: '10px', 
            color: 'var(--text-dim)', 
            padding: '2px 6px', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            borderRadius: '4px' 
          }}>
            ESC
          </div>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto', padding: '8px' }}>
          {filteredTabs.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)' }}>
              No tabs matched your search
            </div>
          ) : (
            filteredTabs.map((tab, idx) => (
              <div
                key={`${tab.id}-${idx}`}
                data-testid="tab-item"
                onClick={() => handleOpenTab(tab.url)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  gap: '12px',
                  backgroundColor: idx === selectedIndex.value ? 'rgba(255, 255, 255, 0.08)' : 'transparent'
                }}
                onMouseEnter={() => { selectedIndex.value = idx; }}
              >
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '6px', 
                  background: 'rgba(255, 255, 255, 0.03)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {tab.favicon ? (
                    <img src={tab.favicon} style={{ width: '16px', height: '16px' }} />
                  ) : (
                    <Globe size={16} color="var(--text-dim)" />
                  )}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ 
                    color: 'white', 
                    fontSize: '14px', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis' 
                  }}>
                    {tab.title || tab.url}
                  </div>
                  <div style={{ 
                    color: 'var(--text-dim)', 
                    fontSize: '12px', 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis' 
                  }}>
                    {tab.url}
                  </div>
                </div>
                <div style={{
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '20px',
                  border: `1px solid ${tab.spaceColor}`,
                  color: tab.spaceColor,
                  background: `${tab.spaceColor}15`,
                  flexShrink: 0
                }}>
                  {tab.spaceName}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
