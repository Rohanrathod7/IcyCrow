import { useState, useEffect } from 'preact/hooks';
import { 
  isToolbarSettingsOpen, 
  resetToolbarLayout,
  isImportModalOpen,
  pendingImportData
} from '../store/toolbar-state';
import { pdfUrl, autoSaveFileHandle, isAutoSaveEnabled } from '../store/viewer-state';
import { 
  X, 
  Settings2, 
  Download, 
  Upload, 
  FileCheck, 
  RefreshCcw, 
  MoreVertical,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  MousePointer2
} from 'lucide-preact';
import { 
  getSaveHandle, 
  exportWorkspace, 
  validateWorkspaceFile, 
  commitWorkspaceToStore,
  verifyPermission,
  loadFromHandle
} from '../services/StateSyncService';
import { deleteWorkspaceHandle, getWorkspaceHandle, saveWorkspaceHandle } from '../../lib/idb-store';
import { showSyncToast } from './SyncToast';
import { toolMetadata, removeToolInstance, toolsOrder } from '../store/toolbar-state';

const ICONS: Record<string, any> = {
  pan: MousePointer2,
  select: MousePointer2,
  highlight: FileCheck,
  draw: RefreshCcw, // Fallback
  brush: RefreshCcw,
  eraser: Trash2,
  text: FileCheck,
  sticky: FileCheck,
  callout: FileCheck
};

export const ToolbarSettingsModal = () => {
  const [registryEntries, setRegistryEntries] = useState<any[]>([]);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    const loadRegistry = async () => {
      if (!pdfUrl.value) return;
      const entries: any[] = [];
      const entry = await getWorkspaceHandle(pdfUrl.value);
      if (entry) entries.push(entry);
      setRegistryEntries(entries);
    };
    if (isToolbarSettingsOpen.value) {
      loadRegistry();
    }
  }, [pdfUrl.value, isToolbarSettingsOpen.value]);

  if (!isToolbarSettingsOpen.value) return null;

  const handleManualImport = async (entry: any) => {
    const hasPerm = await verifyPermission(entry.handle, 'read');
    if (hasPerm) {
      const data = await loadFromHandle(entry.handle);
      if (data) {
        await commitWorkspaceToStore(data, pdfUrl.value, entry.handle);
        showSyncToast(`Imported: ${entry.filename}`, 'success');
        setActiveMenu(null);
      }
    } else {
      showSyncToast("Permission Denied", "error");
    }
  };

  const handleDeleteEntry = async (url: string) => {
    await deleteWorkspaceHandle(url);
    if (autoSaveFileHandle.value?.url === url) {
      autoSaveFileHandle.value = null;
      isAutoSaveEnabled.value = false;
    }
    const entry = await getWorkspaceHandle(pdfUrl.value);
    setRegistryEntries(entry ? [entry] : []);
    setActiveMenu(null);
    showSyncToast("Registry Entry Removed", "info");
  };

  return (
    <div 
      className="tool-customizer-modal thin-scrollbar"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '450px',
        maxHeight: '85vh',
        background: '#121214',
        borderRadius: '24px',
        zIndex: 10010,
        color: '#fff',
        boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        pointerEvents: 'auto'
      }}
    >
      <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#121214', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
           <Settings2 size={20} color="#3b82f6" />
           <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>Workspace Settings</h2>
        </div>
        <button 
          onClick={() => isToolbarSettingsOpen.value = false}
          style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600 }}
        >
          Done
        </button>
      </div>

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Manage Toolkit */}
        <section>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.4, letterSpacing: '1px', marginBottom: '16px' }}>Manage Toolkit</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {toolsOrder.value.map((id) => {
              const baseType = id.split('-')[0];
              const Icon = ICONS[baseType] || MousePointer2;
              const meta = toolMetadata.value[id];

              return (
                <div 
                  key={id}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid rgba(255,255,255,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ color: meta?.color || '#fff', opacity: 0.8 }}>
                       <Icon size={16} />
                    </div>
                    <span style={{ fontSize: '13px', opacity: 0.8 }}>{id}</span>
                  </div>
                  
                  {id.includes('-') && (
                    <button 
                      onClick={() => removeToolInstance(id)}
                      style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '4px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Pro Workspace Sync Section */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.4, letterSpacing: '1px', margin: 0 }}>Pro Workspace Sync</h3>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px' }}>ACTIVE</div>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '20px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            
            {!autoSaveFileHandle.value ? (
              <button 
                onClick={async () => {
                  const handle = await getSaveHandle('icycrow_workspace.json');
                  if (handle) {
                    autoSaveFileHandle.value = handle;
                    isAutoSaveEnabled.value = true;
                    showSyncToast("Auto-Save Linked", "success");
                    await saveWorkspaceHandle(pdfUrl.value, handle, handle.name);
                    const updated = await getWorkspaceHandle(pdfUrl.value);
                    setRegistryEntries(updated ? [updated] : []);
                  }
                }}
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: '#3b82f6',
                  border: '1px dashed rgba(59, 130, 246, 0.3)',
                  padding: '16px',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.2s'
                }}
              >
                <Download size={18} />
                Link Output File (Enable Auto-Save)
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ 
                  background: isAutoSaveEnabled.value ? 'rgba(34, 197, 94, 0.08)' : 'rgba(245, 158, 11, 0.08)', 
                  padding: '14px', 
                  borderRadius: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  border: isAutoSaveEnabled.value ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)'
                }}>
                  {isAutoSaveEnabled.value ? <ShieldCheck size={20} color="#22c55e" /> : <AlertCircle size={20} color="#f59e0b" />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: isAutoSaveEnabled.value ? '#22c55e' : '#f59e0b' }}>
                      {isAutoSaveEnabled.value ? 'Live Sync Active' : 'Sync Paused'}
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>Locked: {autoSaveFileHandle.value.name}</div>
                  </div>
                  <button 
                    onClick={() => { autoSaveFileHandle.value = null; isAutoSaveEnabled.value = false; }}
                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: autoSaveFileHandle.value ? 1 : 0.4 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Real-time Persistence</span>
                <span style={{ fontSize: '11px', opacity: 0.5 }}>Sync annotations instantly as you work</span>
              </div>
              <button 
                disabled={!autoSaveFileHandle.value}
                onClick={() => {
                   isAutoSaveEnabled.value = !isAutoSaveEnabled.value;
                   showSyncToast(isAutoSaveEnabled.value ? "Sync Enabled" : "Sync Disabled", "info");
                }}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '14px',
                  background: isAutoSaveEnabled.value ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  position: 'relative',
                  cursor: autoSaveFileHandle.value ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s'
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '3px',
                  left: isAutoSaveEnabled.value ? '23px' : '3px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
              </button>
            </div>
          </div>
        </section>

        {/* Workspace History Section */}
        <section>
           <h3 style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.4, letterSpacing: '1px', marginBottom: '16px' }}>Workspace History</h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {registryEntries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '12px', opacity: 0.3 }}>No history found for this document</div>
                </div>
              ) : (
                registryEntries.map((entry) => (
                  <div key={entry.url} style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    padding: '12px 16px', 
                    borderRadius: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    position: 'relative'
                  }}>
                    <div style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '8px', borderRadius: '10px' }}>
                      <FileCheck size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.filename}</div>
                      <div style={{ fontSize: '10px', opacity: 0.4 }}>Saved {new Date(entry.lastLinked).toLocaleString()}</div>
                    </div>
                    
                    <button 
                      onClick={() => setActiveMenu(activeMenu === entry.url ? null : entry.url)}
                      style={{ background: 'transparent', border: 'none', color: '#fff', opacity: 0.5, cursor: 'pointer' }}
                    >
                      <MoreVertical size={18} />
                    </button>

                    {activeMenu === entry.url && (
                      <div style={{
                        position: 'absolute',
                        right: '40px',
                        top: '12px',
                        background: '#1c1c1e',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        padding: '6px',
                        zIndex: 100,
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: '140px'
                      }}>
                        <MenuAction icon={<Upload size={14}/>} label="Import Now" onClick={() => handleManualImport(entry)} />
                        <MenuAction icon={<ExternalLink size={14}/>} label="Set as Active" onClick={() => {
                           autoSaveFileHandle.value = entry.handle;
                           isAutoSaveEnabled.value = true;
                           setActiveMenu(null);
                           showSyncToast(`Active: ${entry.filename}`, "success");
                        }} />
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px' }} />
                        <MenuAction 
                           icon={<Trash2 size={14} color="#f87171"/>} 
                           label="Delete Entry" 
                           onClick={() => handleDeleteEntry(entry.url)} 
                           danger
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
           </div>
        </section>

        <section>
          <h3 style={{ fontSize: '12px', textTransform: 'uppercase', opacity: 0.4, letterSpacing: '1px', marginBottom: '16px' }}>Manual Backup</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={() => exportWorkspace(pdfUrl.value, 1, 'icycrow_notes')}
              style={{
                background: 'rgba(255,255,255,0.03)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '16px 8px',
                borderRadius: '16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <Download size={18} />
              <span style={{ fontSize: '11px', fontWeight: 600 }}>Export (.json)</span>
            </button>

            <button
              onClick={() => document.getElementById('workspace-import-input')?.click()}
              style={{
                background: 'rgba(255,255,255,0.03)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '16px 8px',
                borderRadius: '16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              <Upload size={18} />
              <span style={{ fontSize: '11px', fontWeight: 600 }}>Import File</span>
            </button>
            <input 
              id="workspace-import-input"
              type="file" 
              accept=".json"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  try {
                    const data = await validateWorkspaceFile(file);
                    pendingImportData.value = data;
                    isImportModalOpen.value = true;
                    isToolbarSettingsOpen.value = false;
                  } catch (err) {
                    alert("Failed to load workspace: Invalid or corrupted file.");
                  }
                  (e.target as HTMLInputElement).value = ''; 
                }
              }}
            />
          </div>
        </section>

        {/* Global Actions */}
        <section style={{ marginTop: '16px' }}>
           <button 
             onClick={resetToolbarLayout}
             style={{
               width: '100%',
               background: 'rgba(248, 113, 113, 0.05)',
               color: '#f87171',
               border: '1px solid rgba(248, 113, 113, 0.1)',
               padding: '14px',
               borderRadius: '16px',
               cursor: 'pointer',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center',
               gap: '8px',
               fontSize: '13px',
               fontWeight: 600
             }}
           >
             <RefreshCcw size={14} />
             Reset Toolbar to Defaults
           </button>
        </section>
      </div>
    </div>
  );
};

const MenuAction = ({ icon, label, onClick, danger }: any) => (
  <button 
    onClick={onClick}
    style={{
      padding: '8px 12px',
      background: 'transparent',
      border: 'none',
      color: danger ? '#f87171' : '#fff',
      fontSize: '11px',
      fontWeight: 600,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      borderRadius: '8px',
      textAlign: 'left',
      transition: 'background 0.2s'
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
  >
    {icon}
    {label}
  </button>
);
