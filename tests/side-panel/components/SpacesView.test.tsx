// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'preact';
import { SpacesView } from '../../../src/side-panel/components/SpacesView';
import { sendToSW } from '../../../src/lib/messaging';
import { spaces, isLoading, error } from '../../../src/side-panel/store';

vi.mock('../../../src/lib/messaging', () => ({
  sendToSW: vi.fn(),
}));

describe('SpacesView Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    spaces.value = {} as any;
    isLoading.value = false;
    error.value = null;


    global.chrome = {
      storage: {
        local: { get: vi.fn() },
      },
    } as any;

    vi.stubGlobal('prompt', vi.fn().mockReturnValue('New Space Name'));
  });


  it('should list existing spaces from storage', async () => {
    const mockSpaces = {
      spaces: {
        'space-1': { id: 'space-1', name: 'Work', color: 'blue', createdAt: new Date().toISOString() },
        'space-2': { id: 'space-2', name: 'Personal', color: 'green', createdAt: new Date().toISOString() },
      }
    };

    (chrome.storage.local.get as any).mockResolvedValue(mockSpaces);

    const root = document.getElementById('app')!;
    render(<SpacesView />, root);

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(document.body.innerHTML).toContain('Work');
    expect(document.body.innerHTML).toContain('Personal');

  });

  it('should show "New Space" button and call sendToSW on click', async () => {
    (chrome.storage.local.get as any).mockResolvedValue({});
    const root = document.getElementById('app')!;
    render(<SpacesView />, root);

    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Space'))!;

    btn.click();

    expect(sendToSW).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SPACE_CREATE'
    }));
  });
});
