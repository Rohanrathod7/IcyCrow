import { activeView, isLoading, error, syncAllHighlights, activeSpaceId, loadChatHistory, chatMessages, commandPaletteOpen, spaces } from './store';
import type { UUID } from '../lib/types';
import { HomeView } from './components/HomeView';
import { SearchView } from './components/SearchView';
import { SpacesView } from './components/SpacesView';
import { SettingsView } from './components/SettingsView';
import { ChatView } from './components/ChatView';
import { HighlightsPanel } from './components/HighlightsPanel';
import { MascotHeader } from './components/MascotHeader';
import { CommandPalette } from './components/CommandPalette';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useEffect } from 'preact/hooks';
import './panel.css';
import '../assets/styles/animations.css';

export const App = () => {
  useEffect(() => {
    syncAllHighlights();
    
    // Auto-select first space if none active
    const selectDefaultSpace = async () => {
      const result = await chrome.storage.local.get('spaces');
      const loadedSpaces = result.spaces || {};
      if (!activeSpaceId.value) {
        const firstId = Object.keys(loadedSpaces)[0];
        if (firstId) activeSpaceId.value = firstId as UUID;
      }
    };
    selectDefaultSpace();
  }, []);

  useEffect(() => {
    if (activeSpaceId.value) {
      loadChatHistory(activeSpaceId.value);
    } else {
      chatMessages.value = [];
    }
  }, [activeSpaceId.value]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        commandPaletteOpen.value = !commandPaletteOpen.value;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderView = () => {
    switch (activeView.value) {
      case 'home': return <HomeView />;
      case 'search': return <SearchView />;
      case 'chat': return <ChatView />;
      case 'spaces': return <SpacesView />;
      case 'settings': return <SettingsView />;
      case 'highlights':
        return <HighlightsPanel />;
      default:
        return <HomeView />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="side-panel-root" style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-panel)', color: 'var(--text-main)' }}>
        {error.value && (
          <div className="error-banner">
            <span>{error.value}</span>
            <button onClick={() => error.value = null} className="close-btn" style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2em' }}>×</button>
          </div>
        )}
        
        {isLoading.value && activeView.value !== 'chat' && (
          <div className="loading-overlay">
            <div className="glass-card card" style={{ padding: '20px' }}>Loading...</div>
          </div>
        )}

        <MascotHeader />
        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: '#121212' }}>
          {renderView()}
        </main>
        
        <CommandPalette 
          isOpen={commandPaletteOpen.value} 
          onClose={() => commandPaletteOpen.value = false} 
          spaces={spaces.value} 
        />
      </div>
    </ErrorBoundary>
  );
};



