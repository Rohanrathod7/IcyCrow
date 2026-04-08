import { currentAppStatus, activeView } from '../store';
import { DinoMascot } from './DinoMascot';
import { Pin, Bell, Settings, X, ChevronUp } from 'lucide-preact';
import { useSignal } from '@preact/signals';

export const MascotHeader = () => {
  const status = currentAppStatus.value;
  const isMinimized = useSignal(false);
  
  return (
    <div className="premium-header-stage" style={{ height: isMinimized.value ? '100px' : '180px', minHeight: 'unset', transition: 'height 0.4s cubic-bezier(0.16, 1, 0.3, 1)', paddingBottom: isMinimized.value ? '0' : '20px' }}>
      {/* Navigation Icons (Absolute Overlay) */}
      <div className="header-icon-bar">
        <div className="header-icon-group">
          <button 
            className="btn-header-icon" 
            onClick={() => activeView.value = 'spaces'}
            aria-label="Spaces"
            title="Spaces"
          >
            <Pin size={18} />
          </button>
          <button 
            className="btn-header-icon" 
            onClick={() => activeView.value = 'chat'}
            aria-label="Notifications"
            title="Chat/Notifications"
          >
            <Bell size={18} />
          </button>
          <button 
            className="btn-header-icon" 
            onClick={() => activeView.value = 'settings'}
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        </div>
        
        <button 
          className="btn-header-icon" 
          onClick={() => window.close()}
          aria-label="Close panel"
          title="Close Sidebar"
        >
          <X size={18} />
        </button>
      </div>

      <div style={{ transform: `translate(36px, ${isMinimized.value ? '-18px' : '0px'}) scale(0.85)`, transformOrigin: 'bottom center', transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <DinoMascot status={status} />
      </div>
      
      <button 
        onClick={() => isMinimized.value = !isMinimized.value}
        style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          zIndex: 20
        }}
        className="btn-header-icon"
        title={isMinimized.value ? "Expand Header" : "Minimize Header"}
      >
        <div style={{ transform: isMinimized.value ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.4s ease', display: 'flex' }}>
            <ChevronUp size={18} />
        </div>
      </button>
    </div>
  );
};
