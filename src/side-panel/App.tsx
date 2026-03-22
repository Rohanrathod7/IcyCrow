import { activeView } from './store';
import { NavBar } from './components/NavBar';
import { HomeView } from './components/HomeView';
import { SearchView } from './components/SearchView';
import { SpacesView } from './components/SpacesView';
import { SettingsView } from './components/SettingsView';

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
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      background: '#1a1a1a', 
      color: 'white',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <NavBar />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {renderView()}
      </main>
    </div>
  );
};

