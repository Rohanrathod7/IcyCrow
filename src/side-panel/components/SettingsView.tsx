import { isLoading, error } from '../store';
import { sendToSW } from '../../lib/messaging';

export const SettingsView = () => {
  const handleExport = async () => {
    const password = window.prompt('Enter encryption password for export:');
    if (!password) return;

    isLoading.value = true;
    try {
      const result = await sendToSW<any>({
        type: 'EXPORT_WORKSPACE',
        payload: { password }
      } as any);
      
      if (result.ok && result.data.arrayBuffer) {
        const blob = new Blob([result.data.arrayBuffer], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `icycrow-backup-${new Date().toISOString().split('T')[0]}.icycrow`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (!result.ok) {
        throw new Error(result.error?.message || 'Export failed');
      }
    } catch (err) {
      console.error('Export failed:', err);
      error.value = 'Export failed: ' + (err as Error).message;
    } finally {
      isLoading.value = false;
    }
  };

  const handleImport = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const password = window.prompt('Enter password to decrypt the backup:');
    if (!password) return;

    isLoading.value = true;
    try {
      const buffer = await file.arrayBuffer();
      const result = await sendToSW<any>({
        type: 'IMPORT_WORKSPACE',
        payload: { arrayBuffer: buffer, password }
      } as any);
      if (result.ok) {
        window.alert('Import successful! Your workspace has been restored.');
      } else {
        throw new Error(result.error?.message || 'Import failed');
      }
    } catch (err) {
      console.error('Import failed:', err);
      error.value = 'Import failed: ' + (err as Error).message;
    } finally {
      isLoading.value = false;
      (e.target as HTMLInputElement).value = ''; // Reset input
    }
  };

  return (
    <div className="view-container">
      <h3 className="section-title">Data & Backup</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <div className="card">
          <h4 style={{ margin: '0 0 10px 0', fontSize: '1em' }}>Export Workspace</h4>
          <p className="text-dim" style={{ marginBottom: '15px', lineHeight: '1.4' }}>
            Download a secure, encrypted backup regarding your highlights, spaces, and notes.
          </p>
          <button 
            onClick={handleExport}
            disabled={isLoading.value}
            className="btn-primary"
            style={{ width: '100%' }}
          >
            {isLoading.value ? '...' : 'Export (.icycrow)'}
          </button>
        </div>

        <div className="card">
          <h4 style={{ margin: '0 0 10px 0', fontSize: '1em' }}>Import Workspace</h4>
          <p className="text-dim" style={{ marginBottom: '15px', lineHeight: '1.4' }}>
            Restore your data from an existing backup file.
          </p>
          <label className="btn-primary" style={{ display: 'block', textAlign: 'center', background: 'rgba(255,255,255,0.1)', color: 'white' }}>
            {isLoading.value ? '...' : 'Choose Backup File'}
            <input 
              type="file" 
              accept=".icycrow" 
              onChange={handleImport} 
              disabled={isLoading.value} 
              style={{ display: 'none' }} 
            />
          </label>
        </div>

      </div>
    </div>
  );
};
