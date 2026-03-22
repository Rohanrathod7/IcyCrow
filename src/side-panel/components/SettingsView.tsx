import { isLoading } from '../store';
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
      
      if (result && result.blobUrl) {
        const a = document.createElement('a');
        a.href = result.blobUrl;
        a.download = result.filename || 'backup.icycrow';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Export failed:', err);
      window.alert('Export failed: ' + (err as Error).message);
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
      await sendToSW({
        type: 'IMPORT_WORKSPACE',
        payload: { arrayBuffer: buffer, password }
      } as any);
      window.alert('Import successful! Your workspace has been restored.');
    } catch (err) {
      console.error('Import failed:', err);
      window.alert('Import failed: ' + (err as Error).message);
    } finally {
      isLoading.value = false;
      (e.target as HTMLInputElement).value = ''; // Reset input
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginBottom: '20px', fontSize: '1.2em' }}>Data & Backup</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '1em' }}>Export Workspace</h4>
          <p style={{ fontSize: '0.85em', opacity: 0.7, marginBottom: '15px', lineHeight: '1.4' }}>
            Download a secure, encrypted backup of all your highlights, spaces, and notes.
          </p>
          <button 
            onClick={handleExport}
            disabled={isLoading.value}
            style={{ 
              width: '100%', 
              padding: '10px', 
              background: '#3a76f0', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: isLoading.value ? 'not-allowed' : 'pointer',
              fontWeight: '500'
            }}
          >
            {isLoading.value ? 'Exporting...' : 'Export Workspace (.icycrow)'}
          </button>
        </div>

        <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '1em' }}>Import Workspace</h4>
          <p style={{ fontSize: '0.85em', opacity: 0.7, marginBottom: '15px', lineHeight: '1.4' }}>
            Restore your data from an existing backup file. This will merge with your current data.
          </p>
          <label style={{ 
            display: 'block', 
            width: '100%', 
            padding: '10px', 
            background: 'rgba(255,255,255,0.1)', 
            color: 'white', 
            textAlign: 'center',
            borderRadius: '8px', 
            cursor: isLoading.value ? 'not-allowed' : 'pointer',
            fontSize: '0.9em'
          }}>
            {isLoading.value ? 'Processing...' : 'Choose Backup File'}
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
