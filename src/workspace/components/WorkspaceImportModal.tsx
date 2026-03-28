import { isImportModalOpen, pendingImportData } from '../store/toolbar-state';
import { pdfUrl } from '../store/viewer-state';
import { commitWorkspaceToStore } from '../services/StateSyncService';
import { AlertTriangle, CheckCircle2, FileJson, Calendar, Layers } from 'lucide-preact';

export const WorkspaceImportModal = () => {
  if (!isImportModalOpen.value || !pendingImportData.value) return null;

  const data = pendingImportData.value;
  const currentUrl = pdfUrl.value;
  const isMismatch = data.documentUrl && data.documentUrl !== currentUrl;

  const handleConfirm = async () => {
    // If the import was triggered by a file handle, we use it for auto-save
    const sourceHandle = (data as any)._fileHandle; 
    await commitWorkspaceToStore(data, currentUrl, sourceHandle);
    isImportModalOpen.value = false;
    pendingImportData.value = null;
  };

  const handleCancel = () => {
    isImportModalOpen.value = false;
    pendingImportData.value = null;
  };

  const highlightCount = data.highlights?.length || 0;
  const strokeCount = data.strokes?.length || 0;
  const stickyCount = data.stickyNotes?.length || 0;
  const calloutCount = data.callouts?.length || 0;
  const total = highlightCount + strokeCount + stickyCount + calloutCount;

  return (
    <div 
      className="import-preview-modal"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '400px',
        background: '#121214',
        borderRadius: '24px',
        zIndex: 10020,
        color: '#fff',
        boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        pointerEvents: 'auto'
      }}
    >
      <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <FileJson size={20} color="#3b82f6" />
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Import Workspace</h2>
      </div>

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {isMismatch && (
          <div style={{ 
            background: 'rgba(245, 158, 11, 0.1)', 
            border: '1px solid rgba(245, 158, 11, 0.2)', 
            padding: '12px', 
            borderRadius: '12px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12px', color: '#f59e0b', lineHeight: '1.5' }}>
              <strong>Document Mismatch:</strong> This file was exported from a different PDF. Annotations may appear in incorrect positions.
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <SummaryCard icon={<Layers size={14}/>} label="Total Notes" value={total} />
          <SummaryCard icon={<Calendar size={14}/>} label="Exported At" value={new Date(data.exportedAt).toLocaleDateString()} />
        </div>

        <div style={{ 
          background: 'rgba(255,255,255,0.02)', 
          borderRadius: '16px', 
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <EntityRow label="Highlights" count={highlightCount} />
          <EntityRow label="Ink Strokes" count={strokeCount} />
          <EntityRow label="Sticky Notes" count={stickyCount} />
          <EntityRow label="Callouts" count={calloutCount} />
        </div>

        <p style={{ fontSize: '12px', opacity: 0.5, margin: 0, textAlign: 'center' }}>
          This will permanently replace your current document annotations.
        </p>
      </div>

      <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.02)', display: 'flex', gap: '12px' }}>
        <button 
          onClick={handleCancel}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.05)',
            border: 'none',
            color: '#fff',
            padding: '12px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600
          }}
        >
          Cancel
        </button>
        <button 
          onClick={handleConfirm}
          style={{
            flex: 2,
            background: '#3b82f6',
            border: 'none',
            color: '#fff',
            padding: '12px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={16} />
          Confirm Import
        </button>
      </div>
    </div>
  );
};

const SummaryCard = ({ icon, label, value }: any) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.4, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {icon}
      {label}
    </div>
    <div style={{ fontSize: '14px', fontWeight: 600 }}>{value}</div>
  </div>
);

const EntityRow = ({ label, count }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
    <span style={{ opacity: 0.6 }}>{label}</span>
    <span style={{ fontWeight: 600 }}>{count}</span>
  </div>
);
