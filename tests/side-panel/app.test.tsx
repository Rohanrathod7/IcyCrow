// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { render } from 'preact';
import { App } from '../../src/side-panel/App';
import { activeView, isLoading, error } from '../../src/side-panel/store';


describe('Side Panel App Root', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    isLoading.value = false;
    error.value = null;
    
    // Mock chrome.storage.local for HomeView
    global.chrome = {
      storage: {
        local: { get: vi.fn().mockResolvedValue({}) },
      },
    } as any;
  });

  it('should render loading overlay when isLoading is true', async () => {
    const root = document.getElementById('app')!;
    isLoading.value = true;
    render(<App />, root);
    
    expect(document.body.innerHTML).toContain('Loading...');
  });

  it('should render error banner when error is set', async () => {
    const root = document.getElementById('app')!;
    error.value = 'Failed to load';
    render(<App />, root);
    
    expect(document.body.innerHTML).toContain('Failed to load');
  });

  it('should render the NavBar and HomeView by default', async () => {

    const root = document.getElementById('app')!;
    render(<App />, root);
    
    // Check for NavBar buttons
    expect(document.body.innerHTML).toContain('Home');
    expect(document.body.innerHTML).toContain('Search');
    
    // Wait for HomeView effect
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check for HomeView empty state or content
    expect(document.body.innerHTML).toContain('No highlights yet');
  });
});


