import { useState } from 'preact/hooks';
import { standaloneTabs, addActiveTabStandalone, deleteStandaloneTab, moveTabToSpace, spaces, standaloneModalState } from '../store';
import { X, Globe, MoreVertical } from 'lucide-preact';
import { SplitButton } from './SplitButton';
import { StandaloneTabSelectionModal } from './StandaloneTabSelectionModal';
import type { UUID, SpaceTab } from '../../lib/types';

export const StandaloneTabsView = () => {
  const [isAdding, setIsAdding] = useState(false);
  const handleQuickAdd = async () => {
    setIsAdding(true);
    await addActiveTabStandalone();
    
    // We don't need to manually push status feedback to SplitButton
    // as it relies on 'currentAppStatus'. Wait, does addActiveTabStandalone set currentAppStatus? 
    // It doesn't, but that's fine, it returns fast. We'll just reset isAdding.
    setIsAdding(false);
  };

  const tabs = standaloneTabs.value;

  return (
    <div className="view-container standalone-view">
      {/* Aesthetic Add Button */}
      <div className="standalone-header">
        <SplitButton 
          mainText="Save Current Tab"
          onMainClick={handleQuickAdd}
          onChevronClick={() => { standaloneModalState.value = { isOpen: true }; }}
          disabled={isAdding}
        />
      </div>

      <StandaloneTabSelectionModal />

      <div className="standalone-content">
        {tabs.length === 0 ? (
          <div className="standalone-empty animate-fade-in">
            <div className="empty-icon">🐦‍⬛</div>
            <p className="empty-title">Your independent nest</p>
            <p className="empty-subtitle">Save tabs here for quick access later, or move them into spaces when you're ready.</p>
          </div>
        ) : (
          <div className="standalone-list">
            {tabs.map((tab, i) => (
              <div 
                key={tab.id} 
                className="animate-slide-up" 
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <StandaloneTabItem tab={tab} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const StandaloneTabItem = ({ tab }: { tab: SpaceTab }) => {
  const [showMenu, setShowMenu] = useState(false);

  const handleMove = async (spaceId: UUID) => {
    await moveTabToSpace(tab.id, spaceId);
    setShowMenu(false);
  };

  return (
    <div className="standalone-tab-card glass-card">
      <div className="tab-main" onClick={() => chrome.tabs.create({ url: tab.url })}>
        <div className="tab-icon-wrapper">
          {tab.favicon ? (
            <img src={tab.favicon} alt="" className="tab-icon" onError={(e) => (e.currentTarget.style.display = 'none')} />
          ) : (
            <Globe size={16} className="text-dim" />
          )}
        </div>
        <div className="tab-details">
          <span className="tab-title-text" title={tab.title}>{tab.title}</span>
          <span className="tab-url-text">{new URL(tab.url).hostname}</span>
        </div>
      </div>

      <div className="tab-actions-group">
        <div className="action-menu-container">
          <button 
            className="btn-icon-sm" 
            onClick={() => setShowMenu(!showMenu)}
            title="Move to Space"
          >
            <MoreVertical size={14} />
          </button>
          
          {showMenu && (
            <div className="dropdown-menu glass-card">
              <div className="menu-header">Move to Space</div>
              <div className="menu-list">
                {Object.values(spaces.value).length === 0 && (
                  <div className="menu-item-dim">No spaces created</div>
                )}
                {Object.values(spaces.value).map(s => (
                  <button key={s.id} onClick={() => handleMove(s.id)} className="menu-item">
                    <div className="space-dot" style={{ backgroundColor: s.color }} />
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button 
          className="btn-icon-sm danger" 
          onClick={() => deleteStandaloneTab(tab.id)}
          title="Delete Tab"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
