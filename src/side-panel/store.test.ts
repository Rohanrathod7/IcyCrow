import { describe, it, expect, beforeEach } from 'vitest';
import { activeView, highlights, isLoading, spaces, searchResults, error } from './store';

describe('Side Panel Signal Store', () => {
  beforeEach(() => {
    // Reset signals to defaults
    activeView.value = 'home';
    highlights.value = [];
    isLoading.value = false;
    spaces.value = {};
    searchResults.value = [];
  });

  it('should have correct default states', () => {
    expect(activeView.value).toBe('home');
    expect(highlights.value).toEqual([]);
    expect(isLoading.value).toBe(false);
  });

  it('should reflect mutations', () => {
    activeView.value = 'search';
    expect(activeView.value).toBe('search');

    const mockHighlight = { id: '1', text: 'test' } as any;
    highlights.value = [mockHighlight];
    expect(highlights.value).toHaveLength(1);
    expect(highlights.value[0].text).toBe('test');
  });

  it('should handle loading state toggles', () => {
    isLoading.value = true;
    expect(isLoading.value).toBe(true);
    isLoading.value = false;
    expect(isLoading.value).toBe(false);
  });
});
