// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'preact';
import { HomeView } from '../../../src/side-panel/components/HomeView';
import { highlights } from '../../../src/side-panel/store';

describe('HomeView Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    highlights.value = [];
    isLoading.value = false;
    
    // Mock chrome.storage.local
    global.chrome = {
      storage: {
        local: {
          get: vi.fn(),
        },
      },
    } as any;
  });

  it('should fetch and render highlights from storage', async () => {
    const mockHighlights = {
      'highlights:abc': [
        { id: '1', text: 'First highlight', color: 'yellow' },
        { id: '2', text: 'Second highlight', color: 'green' },
      ],
    };
    
    (chrome.storage.local.get as any).mockResolvedValue(mockHighlights);

    const root = document.getElementById('app')!;
    render(<HomeView />, root);

    // Wait for the useEffect/signal update
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(document.body.innerHTML).toContain('First highlight');
    expect(document.body.innerHTML).toContain('Second highlight');

  });

  it('should show empty state when no highlights found', async () => {
    (chrome.storage.local.get as any).mockResolvedValue({});

    const root = document.getElementById('app')!;
    render(<HomeView />, root);

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(document.body.innerHTML).toContain('No highlights yet');
  });
});
