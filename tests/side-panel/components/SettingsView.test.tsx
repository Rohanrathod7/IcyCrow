// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'preact';
import { SettingsView } from '../../../src/side-panel/components/SettingsView';
import { isLoading, error } from '../../../src/side-panel/store';

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

    global.chrome = {
      runtime: {
        sendMessage: vi.fn(),
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
      tabs: {
        query: vi.fn().mockResolvedValue([]),
      },
      storage: {
        local: {
          getBytesInUse: vi.fn().mockResolvedValue(1024),
          onChanged: {
            addListener: vi.fn(),
            removeListener: vi.fn(),
          }
        },
        session: {
          get: vi.fn().mockResolvedValue({ sessionState: { manualGeminiTabId: null, geminiTabIds: [] } }),
        }
      }
    } as any;
  });

  it('should render export and import buttons', () => {
    const root = document.getElementById('app')!;
    render(<SettingsView />, root);
    
    expect(document.body.innerHTML).toContain('Generate Encrypted Backup');
    expect(document.body.innerHTML).toContain('Restore Workspace Backup');
  });

  it('should trigger EXPORT_WORKSPACE when export button clicked', async () => {
    const root = document.getElementById('app')!;
    render(<SettingsView />, root);
    
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Generate Encrypted Backup'))!;
    btn.click();

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'EXPORT_WORKSPACE',
      payload: { password: 'test-password' }
    }));
  });
});
