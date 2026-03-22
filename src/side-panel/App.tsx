import { activeView, isLoading, error } from './store';
import { NavBar } from './components/NavBar';
import { HomeView } from './components/HomeView';
import { SearchView } from './components/SearchView';
import { SpacesView } from './components/SpacesView';
import { SettingsView } from './components/SettingsView';
import './panel.css';

export const App = () => {
  const renderView = () => {
    switch (activeView.value) {
      case 'home': return <HomeView />;
      case 'search': return <SearchView />;
      case 'spaces': return <SpacesView />;
      case 'settings': return <SettingsView />;
      default: return <HomeView />;
    }
  };

  return (
    <div className="side-panel-root" style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {error.value && (
        <div className="error-banner">
          <span>{error.value}</span>
          <button onClick={() => error.value = null} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.2em' }}>×</button>
        </div>
      )}
      
      {isLoading.value && (
        <div className="loading-overlay">
          <div className="glass-card" style={{ padding: '20px' }}>Loading...</div>
        </div>
      )}

      <NavBar />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {renderView()}
      </main>
    </div>
  );
};


