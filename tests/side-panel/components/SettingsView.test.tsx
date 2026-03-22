// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'preact';
import { SettingsView } from '../../../src/side-panel/components/SettingsView';
import { sendToSW } from '../../../src/lib/messaging';
import { isLoading, error } from '../../../src/side-panel/store';

vi.mock('../../../src/lib/messaging', () => ({
  sendToSW: vi.fn(),
}));

describe('SettingsView Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    isLoading.value = false;
    error.value = null;
    vi.stubGlobal('prompt', vi.fn().mockReturnValue('test-password'));
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:test'),
      revokeObjectURL: vi.fn(),
    });
    
    (sendToSW as any).mockResolvedValue({ 
      ok: true, 
      data: { arrayBuffer: new Uint8Array([1, 2, 3]).buffer } 
    });
  });



  it('should render export and import buttons', () => {
    const root = document.getElementById('app')!;
    render(<SettingsView />, root);
    
    expect(document.body.innerHTML).toContain('Export Workspace');
    expect(document.body.innerHTML).toContain('Import Workspace');
  });

  it('should trigger EXPORT_WORKSPACE when expert button clicked', async () => {
    const root = document.getElementById('app')!;
    render(<SettingsView />, root);
    
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Export'))!;
    btn.click();

    expect(sendToSW).toHaveBeenCalledWith(expect.objectContaining({
      type: 'EXPORT_WORKSPACE',
      payload: { password: 'test-password' }
    }));
  });
});
