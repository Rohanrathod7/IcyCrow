// @vitest-environment jsdom
import { render, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpacesView } from '../../../src/side-panel/components/SpacesView';
import { spaces, activeSpaceId } from '../../../src/side-panel/store';
import { sendToSW } from '../../../src/lib/messaging';

// Mock messaging
vi.mock('../../../src/lib/messaging', () => ({
  sendToSW: vi.fn(),
}));

describe('SpacesView', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    vi.clearAllMocks();
    spaces.value = {};
    activeSpaceId.value = null;
    
    // Mock chrome storage
    global.chrome = {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({ spaces: {} }),
          set: vi.fn(),
        }
      }
    } as any;
  });

  it('renders empty state when no spaces exist', async () => {
    const root = document.getElementById('app')!;
    render(<SpacesView />, { container: root });
    expect(document.body.innerHTML).toContain('No spaces created yet');
  });

  it('renders a list of space cards', async () => {
    const mockSpaces = {
      's1': {
        id: 's1',
        name: 'Work Space',
        color: '#ff0000',
        createdAt: new Date().toISOString(),
        tabs: [{ url: 'https://test.com' }]
      }
    };
    spaces.value = mockSpaces as any;
    
    const root = document.getElementById('app')!;
    render(<SpacesView />, { container: root });
    
    expect(document.body.innerHTML).toContain('Work Space');
    expect(document.body.innerHTML).toContain('1 tabs');
  });

  it('dispatches SPACE_RESTORE message when restore button is clicked', async () => {
    const mockSpaces = {
      's1': {
        id: 's1',
        name: 'Work Space',
        color: '#ff0000',
        tabs: []
      }
    };
    spaces.value = mockSpaces as any;
    
    const root = document.getElementById('app')!;
    render(<SpacesView />, { container: root });
    
    const restoreBtn = document.querySelector('.btn-secondary') as HTMLButtonElement;
    fireEvent.click(restoreBtn);
    
    expect(sendToSW).toHaveBeenCalledWith(expect.objectContaining({
      type: 'SPACE_RESTORE',
      payload: { spaceId: 's1' }
    }));
  });
});
