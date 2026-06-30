import { activeView, dashboardViewMode, setViewMode, searchQuery, currentAppStatus } from '../store';
import { DinoMascot } from './DinoMascot';
import { Pin, MessageSquare, Settings, X, Search, LayoutGrid, FileText, Bookmark, Brain } from 'lucide-preact';
import type { ViewType } from '../store';

export const DatabaseHeader = () => {
  const status = currentAppStatus.value;
  const mode = dashboardViewMode.value;
  const currentView = activeView.value;

  const handleNav = (view: ViewType) => {
    activeView.value = view;
  };

  return (
    <header className="db-header">
      {/* Top row: Brand & Navigation */}
      <div className="db-header-top">
        <div className="db-brand" onClick={() => handleNav('spaces')} style={{ cursor: 'pointer' }}>
          <div className="db-brand-mascot-container">
            <div style={{ transform: 'scale(0.125)', transformOrigin: 'top left', width: '20px', height: '17px', overflow: 'hidden' }}>
              <DinoMascot status={status} />
            </div>
            {status !== 'idle' && <div className="pulse-indicator" />}
          </div>
          <span style={{ fontSize: '0.8rem', letterSpacing: '0.05em', fontWeight: 800 }}>ICYCROW</span>
        </div>

        <div className="db-nav-group">
          <button 
            className={`db-nav-btn ${currentView === 'spaces' || currentView === 'home' ? 'active' : ''}`} 
            onClick={() => handleNav('spaces')}
            title="Dashboard"
          >
            <Pin size={14} />
          </button>
          <button 
            className={`db-nav-btn ${currentView === 'chat' ? 'active' : ''}`} 
            onClick={() => handleNav('chat')}
            title="AI Chat"
          >
            <MessageSquare size={14} />
          </button>
          <button 
            className={`db-nav-btn ${currentView === 'bookmarks' ? 'active' : ''}`} 
            onClick={() => handleNav('bookmarks')}
            title="Bookmarks"
          >
            <Bookmark size={14} />
          </button>
          <button 
            className={`db-nav-btn ${currentView === 'study' ? 'active' : ''}`} 
            onClick={() => handleNav('study')}
            title="Study Flashcards"
          >
            <Brain size={14} />
          </button>
          <button 
            className={`db-nav-btn ${currentView === 'settings' ? 'active' : ''}`} 
            onClick={() => handleNav('settings')}
            title="Settings"
          >
            <Settings size={14} />
          </button>
          <button 
            className="db-nav-btn danger" 
            onClick={() => window.close()}
            title="Close Sidebar"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Bottom row: Search and filter toggles */}
      {(currentView === 'spaces' || currentView === 'home') && (
        <div className="db-header-bottom">
          <div className="db-search-container">
            <Search size={12} className="db-search-icon" />
            <input
              type="text"
              className="db-search-input"
              placeholder="Search tabs..."
              value={searchQuery.value}
              onInput={(e) => searchQuery.value = (e.target as HTMLInputElement).value}
            />
          </div>

          <div className="db-filter-group">
            <div className="db-tooltip-container">
              <button 
                className={`db-filter-btn ${mode === 'spaces' ? 'active' : ''}`}
                onClick={() => setViewMode('spaces')}
              >
                <LayoutGrid size={12} />
              </button>
              <span className="db-tooltip-text">Spaces List</span>
            </div>

            <div className="db-tooltip-container">
              <button 
                className={`db-filter-btn ${mode === 'tabs' ? 'active' : ''}`}
                onClick={() => setViewMode('tabs')}
              >
                <FileText size={12} />
              </button>
              <span className="db-tooltip-text">Standalone Tabs</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
