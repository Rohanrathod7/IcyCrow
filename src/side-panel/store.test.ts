import { describe, it, expect, beforeEach } from 'vitest';
import { activeView, highlights, spaces, error, isLoading, searchResults } from './store';

describe('Side Panel Signal Store', () => {
  beforeEach(() => {
    activeView.value = 'home';
    highlights.value = [];
    spaces.value = {};
    error.value = null;
    isLoading.value = false;
    searchResults.value = [];
  });

  it('should initialize with default values', () => {
    expect(activeView.value).toBe('home');
    expect(highlights.value).toEqual([]);
    expect(spaces.value).toEqual({});
    expect(error.value).toBe(null);
  });

  it('should update signal values correctly', () => {
    activeView.value = 'search';
    expect(activeView.value).toBe('search');
    
    isLoading.value = true;
    expect(isLoading.value).toBe(true);

    error.value = 'Test Error';
    expect(error.value).toBe('Test Error');
  });
});
