import { settings, isLocked } from '../store';
import { setSettings } from '../../lib/storage';
import { useState, useEffect } from 'preact/hooks';
import { 
  Sun, 
  Moon, 
  Monitor, 
  Cloud, 
  Cpu, 
  Key, 
  Lock, 
  Download, 
  Upload, 
  Database, 
  Settings, 
  ShieldAlert, 
  Eye, 
  EyeOff 
} from 'lucide-preact';

export const SettingsView = () => {
  const currentSettings = settings.value;
  const [storageUsage, setStorageUsage] = useState<number>(0);
  const [apiKey, setApiKey] = useState(currentSettings.apiKey || '');
  const [apiModel, setApiModel] = useState(currentSettings.apiModel || 'gemini-1.5-flash');
  const [showApiKey, setShowApiKey] = useState(false);

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

  const updateEngine = async (aiEngine: 'gemini' | 'window.ai' | 'api') => {
    const updated = { ...settings.value, aiEngine };
    settings.value = updated;
    await setSettings(updated);
  };

  const handleSaveApiSettings = async (newKey: string, newModel: string) => {
    const updated = { ...settings.value, apiKey: newKey, apiModel: newModel };
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
    try {
      const res = await chrome.storage.session.get('sessionState');
      if (res && res.sessionState) setSession(res.sessionState as any);
    } catch (e) {
      console.warn('[SettingsView] Failed to fetch session state:', e);
    }
  };

  useEffect(() => {
    fetchSession();
    const fetchTabs = async () => {
      try {
        const allTabs = await chrome.tabs.query({});
        setTabs(allTabs || []);
      } catch (e) {
        console.warn('[SettingsView] Failed to query tabs:', e);
      }
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
      <div className="settings-header-banner">
        <Settings size={20} style={{ color: 'var(--accent-primary)' }} />
        <h2>Settings</h2>
      </div>

      {/* 1. Theme Configuration */}
      <div className="settings-card glass-card">
        <div className="settings-card-title">
          <Sun size={15} />
          <span>Appearance Theme</span>
        </div>
        <div className="segmented-control">
          <button 
            type="button"
            className={currentSettings.theme === 'light' ? 'active' : ''} 
            onClick={() => updateTheme('light')}
          >
            <Sun size={13} />
            <span>Light</span>
          </button>
          <button 
            type="button"
            className={currentSettings.theme === 'dark' ? 'active' : ''} 
            onClick={() => updateTheme('dark')}
          >
            <Moon size={13} />
            <span>Dark</span>
          </button>
          <button 
            type="button"
            className={currentSettings.theme === 'system' ? 'active' : ''} 
            onClick={() => updateTheme('system')}
          >
            <Monitor size={13} />
            <span>System</span>
          </button>
        </div>
      </div>

      {/* 2. AI Engine Configuration */}
      <div className="settings-card glass-card">
        <div className="settings-card-title">
          <Cloud size={15} />
          <span>AI Engine Provider</span>
        </div>
        
        <div className="settings-option-grid">
          <div 
            className={`settings-option-card ${currentSettings.aiEngine === 'gemini' ? 'active' : ''}`}
            onClick={() => updateEngine('gemini')}
          >
            <Cloud size={16} className="option-icon" />
            <span className="option-label">Tab Bridge</span>
          </div>
          
          <div 
            className={`settings-option-card ${currentSettings.aiEngine === 'window.ai' ? 'active' : ''}`}
            onClick={() => updateEngine('window.ai')}
          >
            <Cpu size={16} className="option-icon" />
            <span className="option-label">Gemini Nano</span>
          </div>

          <div 
            className={`settings-option-card ${currentSettings.aiEngine === 'api' ? 'active' : ''}`}
            onClick={() => updateEngine('api')}
          >
            <Key size={16} className="option-icon" />
            <span className="option-label">API Gateway</span>
          </div>
        </div>

        {currentSettings.aiEngine === 'api' && (
          <div className="settings-input-container" style={{ marginTop: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
            <label className="label-saas" style={{ fontSize: '9px' }}>API key (Gemini / OpenAI compatible)</label>
            <div className="settings-input-wrapper">
              <input 
                type={showApiKey ? 'text' : 'password'} 
                value={apiKey} 
                onInput={(e) => {
                  const val = (e.target as HTMLInputElement).value;
                  setApiKey(val);
                  handleSaveApiSettings(val, apiModel);
                }}
                className="settings-input" 
                placeholder="AIzaSy..." 
                style={{ paddingRight: '40px' }}
              />
              <button 
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="btn-ghost" 
                style={{ 
                  position: 'absolute', 
                  right: '6px', 
                  border: 'none', 
                  background: 'transparent',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-dim)',
                  height: 'auto'
                }}
              >
                {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <label className="label-saas" style={{ fontSize: '9px', marginTop: '8px' }}>Select Model</label>
            <select 
              value={apiModel} 
              onChange={(e) => {
                const val = (e.target as HTMLSelectElement).value;
                setApiModel(val);
                handleSaveApiSettings(apiKey, val);
              }}
              className="settings-select"
            >
              <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
              <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="claude-3-5-haiku">Claude 3.5 Haiku</option>
            </select>
          </div>
        )}
      </div>

      {/* 2.5. PDF Interceptor */}
      <div className="settings-card glass-card">
        <div className="settings-card-title">
          <Database size={15} />
          <span>PDF Interceptor</span>
        </div>
        <div className="settings-row" style={{ marginTop: '2px' }}>
          <span className="text-dim" style={{ fontSize: '0.8rem', maxWidth: '80%' }}>Intercept web PDF links and open in IcyCrow Workspace</span>
          <label className="checkbox-label" style={{ padding: '0', display: 'flex', alignItems: 'center', margin: '0' }}>
            <input 
              type="checkbox" 
              checked={currentSettings.enablePdfInterceptor !== false} 
              onChange={async (e) => {
                const enabled = (e.target as HTMLInputElement).checked;
                const updated = { ...settings.value, enablePdfInterceptor: enabled };
                settings.value = updated;
                await setSettings(updated);
              }}
            />
          </label>
        </div>
      </div>

      {/* 3. Security */}
      <div className="settings-card glass-card">
        <div className="settings-card-title">
          <Lock size={15} />
          <span>Workspace Security</span>
        </div>
        <div className="settings-row">
          <span className={`status-pill ${isLocked.value ? 'locked' : 'unlocked'}`} style={{ 
            padding: '4px 12px', 
            borderRadius: '20px', 
            fontSize: '0.75rem',
            background: isLocked.value ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
            color: isLocked.value ? '#ef4444' : '#22c55e',
            fontWeight: 600
          }}>
            {isLocked.value ? '🔒 Locked' : '🔓 Unlocked'}
          </span>
          {isLocked.value ? (
            <button onClick={handleUnlock} className="btn-primary small">Unlock Workspace</button>
          ) : (
            <button onClick={handleLock} className="btn-ghost small" style={{ padding: '4px 12px' }}>Lock Workspace</button>
          )}
        </div>
      </div>

      {/* 4. Backup & Restore */}
      <div className="settings-card glass-card">
        <div className="settings-card-title">
          <Database size={15} />
          <span>Backup & Diagnostics</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button onClick={handleExport} className="btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
            <Download size={13} />
            <span>Generate Encrypted Backup</span>
          </button>
          <button onClick={handleImport} className="btn-ghost" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
            <Upload size={13} />
            <span>Restore Workspace Backup</span>
          </button>
        </div>
        
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
          <div className="settings-row" style={{ fontSize: '0.8rem', marginBottom: '6px' }}>
            <span className="text-dim">Local Storage Used:</span>
            <span data-testid="storage-usage" style={{ fontWeight: 600 }}>{formatBytes(storageUsage)}</span>
          </div>
          <div className="progress-bar-container" style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
            <div className="progress-bar" style={{ width: '2%', height: '100%', background: 'var(--accent-primary)' }}></div>
          </div>
          <button onClick={handleDebugExport} className="btn-ghost" style={{ width: '100%', marginTop: '10px', justifyContent: 'center' }}>
            <span>Download Debug Logs</span>
          </button>
        </div>
      </div>

      {/* 5. Gemini Bridge Diagnostics */}
      <div className="settings-card glass-card">
        <div className="settings-card-title">
          <Cloud size={15} />
          <span>Bridge Connectivity</span>
        </div>
        <div className="settings-row">
          <span className="text-dim">Status:</span>
          <span style={{ 
            color: (session.manualGeminiTabId || session.geminiTabIds.length > 0) ? '#22c55e' : '#ef4444',
            fontWeight: 600,
            fontSize: '0.85rem'
          }}>
            {(session.manualGeminiTabId || session.geminiTabIds.length > 0) ? '📡 Connected' : '❌ Disconnected'}
          </span>
        </div>
        
        <div className="tab-list" style={{ maxHeight: '130px', overflowY: 'auto', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '4px' }}>
          {tabs.map(tab => {
            const isManual = session.manualGeminiTabId === tab.id;
            const isAuto = session.geminiTabIds.includes(tab.id as number);
            return (
              <div key={tab.id} className="tab-item" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '6px 8px',
                fontSize: '0.75rem',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <span className="truncate" style={{ 
                  flex: 1, 
                  marginRight: '8px',
                  fontWeight: (isManual || isAuto) ? '600' : '400',
                  color: (isManual || isAuto) ? 'var(--accent-primary)' : 'inherit'
                }}>
                  {tab.title}
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  {(isManual || isAuto) && (
                    <span style={{ 
                      fontSize: '8px', 
                      background: isManual ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
                      color: isManual ? '#000' : '#aaa',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontWeight: 'bold'
                    }}>
                      {isManual ? 'MANUAL' : 'AUTO'}
                    </span>
                  )}
                  <button 
                    onClick={() => tab.id && handleRegisterBridge(tab.id)}
                    className="btn-ghost small"
                    style={{ 
                      padding: '2px 6px', 
                      fontSize: '9px',
                      background: isManual ? 'rgba(14, 165, 233, 0.08)' : 'transparent',
                      border: isManual ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)'
                    }}
                  >
                    {isManual ? 'Current' : 'Connect'}
                  </button>
                </div>
              </div>
            );
          })}
          {tabs.length === 0 && <div className="text-dim center" style={{ padding: '8px', fontSize: '0.75rem' }}>No open tabs found</div>}
        </div>
      </div>

      {/* 6. Danger Zone */}
      <div className="settings-card glass-card" style={{ border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.02)', marginBottom: '16px' }}>
        <div className="settings-card-title" style={{ borderBottomColor: 'rgba(239, 68, 68, 0.1)' }}>
          <ShieldAlert size={15} style={{ color: 'var(--danger)' }} />
          <span style={{ color: 'var(--danger)' }}>Danger Zone</span>
        </div>
        <button 
          onClick={handleNukeData}
          data-testid="nuke-button"
          className="btn-primary"
          style={{ width: '100%', padding: '10px', background: 'var(--danger)', color: 'white' }}
        >
          Clear All Local Data
        </button>
      </div>
    </div>
  );
};
