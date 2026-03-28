import { settings, isLocked } from '../store';
import { setSettings } from '../../lib/storage';
import { useState, useEffect } from 'preact/hooks';

export const SettingsView = () => {
  const currentSettings = settings.value;
  const [storageUsage, setStorageUsage] = useState<number>(0);

  useEffect(() => {
    const fetchStorage = async () => {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        try {
          // getBytesInUse might not be available in all mock environments
          const bytes = await (chrome.storage.local as any).getBytesInUse(null);
          setStorageUsage(bytes);
        } catch (e) {
          console.warn('[SettingsView] Could not fetch storage usage:', e);
        }
      }
    };
    fetchStorage();

    // Listen for storage changes to keep dashboard up to date
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      const listener = () => fetchStorage();
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  }, []);

  const updateTheme = async (theme: 'light' | 'dark' | 'system') => {
    const updated = { ...settings.value, theme };
    settings.value = updated;
    await setSettings(updated);
  };

  const updateEngine = async (aiEngine: 'gemini' | 'window.ai') => {
    const updated = { ...settings.value, aiEngine };
    settings.value = updated;
    await setSettings(updated);
  };

  const handleLock = () => chrome.runtime.sendMessage({ type: 'CRYPTO_LOCK' });
  
  const handleUnlock = () => {
    const passphrase = prompt('Enter workspace password:');
    if (passphrase) {
      chrome.runtime.sendMessage({ type: 'CRYPTO_UNLOCK', payload: { passphrase } });
    }
  };

  const handleNukeData = () => {
    const confirmation = prompt('Type "DELETE" to clear ALL local data. This cannot be undone:');
    if (confirmation === 'DELETE') {
      chrome.runtime.sendMessage({ type: 'NUKE_DATA' });
    }
  };

  const handleExport = () => {
    const password = prompt('Enter a password to encrypt your backup:');
    if (password) {
      chrome.runtime.sendMessage({ type: 'EXPORT_WORKSPACE', payload: { password } });
    }
  };

  const handleImport = async () => {
    try {
      const [handle] = await (window as any).showOpenFilePicker({
        types: [{ description: 'IcyCrow Backup', accept: { 'application/x-icycrow': ['.icycrow'] } }]
      });
      if (!handle) return;
      const file = await handle.getFile();
      chrome.runtime.sendMessage({ type: 'IMPORT_WORKSPACE', payload: { file } });
    } catch (err) {
      console.error('[SettingsView] Import failed or cancelled:', err);
    }
  };

  const handleDebugExport = () => {
    chrome.runtime.sendMessage({ type: 'DEBUG_EXPORT' });
  };

  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  const [session, setSession] = useState<{ manualGeminiTabId?: number | null, geminiTabIds: number[] }>({ geminiTabIds: [] });

  const fetchSession = async () => {
    const res = await chrome.storage.session.get('sessionState');
    if (res.sessionState) setSession(res.sessionState as any);
  };

  useEffect(() => {
    fetchSession();
    const fetchTabs = async () => {
      const allTabs = await chrome.tabs.query({});
      setTabs(allTabs);
    };
    fetchTabs();
  }, []);

  const handleRegisterBridge = (tabId: number) => {
    chrome.runtime.sendMessage({ 
      type: 'MANUAL_REGISTER_BRIDGE', 
      payload: { tabId } 
    }, (res) => {
      if (res?.ok) fetchSession();
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(dm) + ' ' + sizes[i];
  };

  return (
    <div className="view-container settings-view">
      <h3 className="section-title">Common Settings</h3>
      
      <div className="setting-group">
        <label htmlFor="theme-select">Theme</label>
        <select 
          id="theme-select"
          value={currentSettings.theme} 
          onChange={(e) => updateTheme((e.target as HTMLSelectElement).value as any)}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </div>

      <div className="setting-group">
        <label htmlFor="engine-select">AI Engine</label>
        <select 
          id="engine-select"
          value={currentSettings.aiEngine || 'gemini'} 
          onChange={(e) => updateEngine((e.target as HTMLSelectElement).value as any)}
        >
          <option value="gemini">Gemini (Cloud Bridge)</option>
          <option value="window.ai">Gemini Nano (Local)</option>
        </select>
      </div>

      <hr />

      <h3 className="section-title">Workspace Security</h3>
      <div className="glass-card" style={{ padding: '16px' }}>
        <div className="flex-row items-center" style={{ marginBottom: '12px' }}>
          <span className={`status-pill ${isLocked.value ? 'locked' : 'unlocked'}`} style={{ 
            padding: '4px 12px', 
            borderRadius: '20px', 
            fontSize: '0.8rem',
            background: isLocked.value ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
            color: isLocked.value ? '#ef4444' : '#22c55e'
          }}>
            {isLocked.value ? '🔒 Locked' : '🔓 Unlocked'}
          </span>
          <div className="btn-group">
            {isLocked.value ? (
              <button onClick={handleUnlock} className="btn-primary small">Unlock</button>
            ) : (
              <button onClick={handleLock} className="btn-ghost small">Lock</button>
            )}
          </div>
        </div>
      </div>

      <h3 className="section-title" style={{ marginTop: '16px' }}>Backup & Restore</h3>
      <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button onClick={handleExport} className="btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
          📦 Generate Encrypted Backup
        </button>
        <button onClick={handleImport} className="btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
          📥 Restore from Backup
        </button>
        <p className="text-dim" style={{ fontSize: '0.75rem' }}>Backups are encrypted using your chosen password.</p>
      </div>

      <h3 className="section-title" style={{ marginTop: '16px' }}>Storage & Diagnostics</h3>
      <div className="glass-card" style={{ padding: '16px', marginBottom: '16px' }}>
        <div className="flex-row">
          <span className="text-dim">Local Storage Used</span>
          <span data-testid="storage-usage" style={{ fontWeight: 600 }}>{formatBytes(storageUsage)}</span>
        </div>
        <div className="progress-bar-container" style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginTop: '8px' }}>
          <div className="progress-bar" style={{ width: '2%', height: '100%', background: 'var(--accent-primary)' }}></div>
        </div>
        <button onClick={handleDebugExport} className="btn-ghost" style={{ width: '100%', marginTop: '16px' }}>
          🔍 Download Diagnostics
        </button>
      </div>

      <h3 className="section-title" style={{ marginTop: '16px' }}>Gemini Bridge Diagnostics</h3>
      <div className="glass-card" style={{ padding: '16px' }}>
        <div className="flex-row items-center" style={{ marginBottom: '12px' }}>
          <span className="text-dim">Status:</span>
          <span style={{ 
            color: (session.manualGeminiTabId || session.geminiTabIds.length > 0) ? '#22c55e' : '#ef4444',
            fontWeight: 600
          }}>
            {(session.manualGeminiTabId || session.geminiTabIds.length > 0) ? '📡 Connected' : '❌ Disconnected'}
          </span>
        </div>
        
        <div className="tab-list" style={{ maxHeight: '150px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '8px' }}>
          {tabs.map(tab => {
            const isManual = session.manualGeminiTabId === tab.id;
            const isAuto = session.geminiTabIds.includes(tab.id as number);
            return (
              <div key={tab.id} className="tab-item" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '6px 8px',
                fontSize: '0.8rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}>
                <span className="truncate" style={{ flex: 1, marginRight: '8px' }}>{tab.title}</span>
                <button 
                  onClick={() => tab.id && handleRegisterBridge(tab.id)}
                  className={`btn-ghost small ${isManual ? 'active' : ''}`}
                  style={{ 
                    padding: '2px 8px', 
                    fontSize: '10px',
                    borderColor: isManual ? 'var(--accent-primary)' : 'transparent',
                    background: isManual ? 'rgba(var(--accent-rgb), 0.2)' : 'transparent'
                  }}
                >
                  {isManual ? 'Manual Bridge' : isAuto ? 'Auto Detected' : 'Set as Bridge'}
                </button>
              </div>
            );
          })}
          {tabs.length === 0 && <div className="text-dim center">No open tabs found</div>}
        </div>
        <p className="text-dim" style={{ fontSize: '0.7rem', marginTop: '8px' }}>
          Select a Gemini tab to force connectivity if automatic detection fails.
        </p>
      </div>

      <div className="danger-zone" style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
        <h4 style={{ color: 'var(--danger)', marginBottom: '8px' }}>Danger Zone</h4>
        <button 
          onClick={handleNukeData}
          data-testid="nuke-button"
          className="btn-primary"
          style={{ width: '100%', padding: '10px', background: 'var(--danger)' }}
        >
          Clear All Local Data
        </button>
        <p className="text-dim" style={{ fontSize: '0.75rem', marginTop: '8px' }}>Requires text confirmation to wipe all data.</p>
      </div>
    </div>
  );
};
