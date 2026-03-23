import { activeView, isLoading, error, syncAllHighlights, activeSpaceId, loadChatHistory, chatMessages } from './store';
import { NavBar } from './components/NavBar';
import { HomeView } from './components/HomeView';
import { SearchView } from './components/SearchView';
import { SpacesView } from './components/SpacesView';
import { SettingsView } from './components/SettingsView';
import { ChatView } from './components/ChatView';
import { HighlightsPanel } from './components/HighlightsPanel';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useEffect } from 'preact/hooks';
import './panel.css';

export const App = () => {
  useEffect(() => {
    syncAllHighlights();
  }, []);

  useEffect(() => {
    if (activeSpaceId.value) {
      loadChatHistory(activeSpaceId.value);
    } else {
      chatMessages.value = [];
    }
  }, [activeSpaceId.value]);

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
        
        {isLoading.value && (
          <div className="loading-overlay">
            <div className="glass-card card" style={{ padding: '20px' }}>Loading...</div>
          </div>
        )}

        <NavBar />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {renderView()}
        </main>
      </div>
    </ErrorBoundary>
  );
};



