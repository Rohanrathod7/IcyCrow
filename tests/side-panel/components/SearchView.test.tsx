// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'preact';
import { SearchView } from '../../../src/side-panel/components/SearchView';
import { sendToSW } from '../../../src/lib/messaging';
import { searchResults, isLoading, error } from '../../../src/side-panel/store';

// Mock the messaging bridge
vi.mock('../../../src/lib/messaging', () => ({
  sendToSW: vi.fn(),
}));

describe('SearchView Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    searchResults.value = [];
    isLoading.value = false;
    error.value = null;
  });



  it('should render search input and button', () => {
    const root = document.getElementById('app')!;
    render(<SearchView />, root);
    
    expect(document.body.innerHTML).toContain('input');
    expect(document.body.innerHTML).toContain('Search');
  });

  it('should call sendToSW when a query is submitted', async () => {
    const root = document.getElementById('app')!;
    render(<SearchView />, root);
    
    const input = document.querySelector('input')!;
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Search'))!;

    
    input.value = 'test query';
    btn.click();

    expect(sendToSW).toHaveBeenCalledWith({
      type: 'SEMANTIC_SEARCH',
      payload: { query: 'test query' }
    });
  });
});
