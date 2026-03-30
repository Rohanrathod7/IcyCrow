import { currentAppStatus, activeView } from '../store';
import { DinoMascot } from './DinoMascot';
import { Pin, Bell, Settings, X } from 'lucide-preact';

export const MascotHeader = () => {
  const status = currentAppStatus.value;
  
  return (
    <div className="grass-header">
      {/* Navigation Icons (Absolute Overlay) */}
      <div className="nav-icon-row-bridge">
        <div className="nav-icon-group" style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="btn-grass-nav" 
            onClick={() => activeView.value = 'spaces'}
            aria-label="Spaces"
            title="Spaces"
          >
            <Pin size={18} />
          </button>
          <button 
            className="btn-grass-nav" 
            onClick={() => activeView.value = 'chat'}
            aria-label="Notifications"
            title="Chat/Notifications"
          >
            <Bell size={18} />
          </button>
          <button 
            className="btn-grass-nav" 
            onClick={() => activeView.value = 'settings'}
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
        
        <button 
          className="btn-grass-nav" 
          onClick={() => window.close()}
          aria-label="Close panel"
          title="Close Sidebar"
        >
          <X size={18} />
        </button>
      </div>

      <DinoMascot status={status} />
    </div>
  );
};
