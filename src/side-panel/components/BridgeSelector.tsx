import { useState, useEffect, useRef } from 'preact/hooks';
import { Circle, Target, ChevronDown, ChevronUp, RefreshCw } from 'lucide-preact';
import { manualBridgeTabId } from '../store';
import { sendToSW } from '../../lib/messaging';
import type { SessionState } from '../../lib/types';

interface BridgeTab {
  id: number;
  title: string;
  url: string;
}

interface BridgeSelectorProps {
  compact?: boolean;
  width?: number;
}

export const BridgeSelector = ({ compact = false, width = 400 }: BridgeSelectorProps) => {
  const [tabs, setTabs] = useState<BridgeTab[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [successId, setSuccessId] = useState<number | null>(null);
  const [failedId, setFailedId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside, { capture: true });
      document.addEventListener('touchstart', handleClickOutside, { capture: true });
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, { capture: true });
      document.removeEventListener('touchstart', handleClickOutside, { capture: true });
    };
  }, [isOpen]);

  const fetchTabs = async () => {
    setIsRefreshing(true);
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
        const queryResults = await chrome.tabs.query({ url: 'https://gemini.google.com/*' });
        const formattedTabs = queryResults.map(t => ({
          id: t.id!,
          title: t.title || 'Gemini Tab',
          url: t.url || 'https://gemini.google.com'
        }));
        setTabs(formattedTabs);
      }
    } catch (err) {
      console.error('[IcyCrow] Failed to refresh Gemini tabs:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTabs();
  }, []);

  const handleSelect = async (tabId: number) => {
    setConnectingId(tabId);
    console.log(`[IcyCrow] Manual select initiated for tab: ${tabId}`);
    try {
      const result = await sendToSW({
        type: 'MANUAL_REGISTER_BRIDGE',
        payload: { tabId }
      } as any);
      
      if (result.ok) {
        manualBridgeTabId.value = tabId;
        setSuccessId(tabId);
        setFailedId(null);
        await fetchTabs();
        setTimeout(() => setSuccessId(null), 2000);
      } else {
        console.error('[IcyCrow] Bridge registration failed:', result.error);
        setFailedId(tabId);
        setTimeout(() => setFailedId(null), 3000);
      }
    } catch (err) {
      console.error('[IcyCrow] Connection error:', err);
    } finally {
      setConnectingId(null);
    }
  };

  const handleFocus = async (tabId: number) => {
    try {
      const tab = await chrome.tabs.get(tabId);
      await chrome.tabs.update(tabId, { active: true });
      if (tab.windowId) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }
    } catch (err) {
      console.error('[IcyCrow] Failed to focus tab:', err);
    }
  };

  const cleanTitle = (title: string) => {
    return title
      .replace(/ - Google Gemini$/, '')
      .replace(/^Gemini\s*-\s*/, '')
      .replace(/Google Gemini$/, '')
      .trim();
  };

  const currentTab = tabs.find(t => t.id === manualBridgeTabId.value) || tabs[0];

  return (
    <div className="bridge-selector" ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <div 
        className="bridge-status-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          padding: '1px',
          gap: '1px'
        }}
      >
        {/* Main Focus Button */}
        <button 
          className="bridge-focus-trigger" 
          onClick={() => currentTab && handleFocus(currentTab.id)}
          title={currentTab ? `Focus: ${currentTab.title}` : 'No Bridge'}
          style={{ 
            fontSize: width < 300 ? '9px' : '10px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: width < 300 ? '2px' : '4px', /* Tighter gap */
            padding: width < 300 ? '2px 4px' : '2px 6px', /* Reduced horizontal padding */
            borderRadius: '8px',
            cursor: 'pointer',
            color: 'var(--text-main)',
            border: 'none',
            background: 'transparent',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            flexShrink: 1, // Allow button itself to shrink
            minWidth: 0,
            overflow: 'hidden'
          }}
        >
          <Circle 
            size={width < 300 ? 6 : 8} 
            fill={currentTab && tabs.length > 0 ? '#22c55e' : '#ef4444'} 
            style={{ 
              color: (currentTab && (tabs.length > 0)) ? '#22c55e' : '#ef4444', 
              animation: (currentTab && tabs.length > 0) ? 'pulse 2s infinite' : 'none',
              flexShrink: 0
            }} 
          />
          {!compact && (
            <span className="truncate" style={{ 
              fontWeight: 600, 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              minWidth: 0,
              maxWidth: width < 280 ? '30px' : width < 320 ? '55px' : '85px' // Ultra-strict maxWidth
            }}>
              {currentTab ? cleanTitle(currentTab.title) : 'Bridge'}
            </span>
          )}
          {width >= 300 && <Target size={12} style={{ opacity: 0.6, flexShrink: 0 }} />}
        </button>

        {/* Dropdown Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            borderLeft: '1px solid rgba(255,255,255,0.1)',
            padding: '2px 6px',
            borderRadius: '0 8px 8px 0',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {isOpen && (
        <div className="glass-card dropdown-menu" style={{ 
          position: 'absolute', 
          top: '32px', 
          right: 0, 
          zIndex: 1000, 
          width: '280px',
          padding: '10px',
          boxShadow: 'var(--shadow-premium)',
          background: 'rgba(18, 18, 24, 0.98)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(12px)',
          borderRadius: '12px'
        }} onClick={() => setIsOpen(false)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, opacity: 0.4, letterSpacing: '0.05em' }}>AVAILABLE BRIDGES</span>
            <button 
              className="btn-ghost" 
              onClick={(e) => { e.stopPropagation(); fetchTabs(); }} 
              disabled={isRefreshing}
              style={{ padding: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
          
          <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }} className="custom-scrollbar">
            {tabs.length === 0 ? (
              <div className="text-dim" style={{ fontSize: '11px', padding: '20px', textAlign: 'center', opacity: 0.5 }}>
                No active Gemini tabs found.<br/>
                <a href="https://gemini.google.com" target="_blank" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>Open Gemini.com</a>
              </div>
            ) : (
              tabs.map(tab => (
                <div
                  key={tab.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px',
                    borderRadius: '10px',
                    background: manualBridgeTabId.value === tab.id ? 'rgba(14, 165, 233, 0.08)' : 'transparent',
                    border: '1px solid',
                    borderColor: manualBridgeTabId.value === tab.id ? 'rgba(14, 165, 233, 0.3)' : 'rgba(255,255,255,0.03)',
                    gap: '10px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  className="bridge-tab-item-card"
                >
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ 
                      fontSize: '11px', 
                      fontWeight: 600, 
                      color: manualBridgeTabId.value === tab.id ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.9)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {tab.title}
                    </div>
                    <div style={{ 
                      fontSize: '9px', 
                      opacity: 0.3, 
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '2px'
                    }}>
                      {tab.url}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {manualBridgeTabId.value === tab.id ? (
                      <span style={{ 
                        fontSize: '9px', 
                        fontWeight: 800, 
                        color: 'var(--accent-primary)', 
                        background: 'rgba(14, 165, 233, 0.2)',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        CONNECTED
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSelect(tab.id)}
                        disabled={connectingId === tab.id}
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: failedId === tab.id ? 'var(--error)' : (successId === tab.id ? 'var(--success)' : (connectingId === tab.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)')),
                          border: '1px solid rgba(255,255,255,0.1)',
                          cursor: connectingId === tab.id ? 'wait' : 'pointer',
                          color: (successId === tab.id || failedId === tab.id) ? 'white' : 'rgba(255,255,255,0.7)',
                          minWidth: '60px'
                        }}
                      >
                        {failedId === tab.id ? 'FAILED' : (successId === tab.id ? '✓ SAVED' : (connectingId === tab.id ? '...' : 'CONNECT'))}
                      </button>
                    )}
                    
                    <button
                      className="btn-ghost"
                      onClick={(e) => { e.stopPropagation(); handleFocus(tab.id); }}
                      title="Navigate to this tab"
                      style={{ 
                        padding: '0', 
                        width: '24px', 
                        height: '24px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.03)'
                      }}
                    >
                      <Target size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {manualBridgeTabId.value && (
            <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
              <button 
                className="btn-ghost" 
                style={{ width: '100%', fontSize: '10px', color: 'var(--danger)', opacity: 0.6 }}
                onClick={async () => {
                   const res = await chrome.storage.session.get('sessionState');
                   const state = (res.sessionState as SessionState) || {};
                   await chrome.storage.session.set({
                      sessionState: { ...state, manualGeminiTabId: null }
                   });
                   manualBridgeTabId.value = null;
                }}
              >
                Reset to Auto-Discovery
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
