import { describe, it, expect, beforeEach } from 'vitest';
import { activeView, highlights, spaces, error, isLoading, searchResults, chatMessages, selectedContextTabs } from './store';

describe('Side Panel Signal Store', () => {
  beforeEach(() => {
    activeView.value = 'home';
    highlights.value = [];
    spaces.value = {};
    error.value = null;
    isLoading.value = false;
    searchResults.value = [];
    chatMessages.value = [];
    selectedContextTabs.value = [];
  });

  it('should initialize with default values', () => {
    expect(activeView.value).toBe('home');
    expect(highlights.value).toEqual([]);
    expect(spaces.value).toEqual({});
    expect(error.value).toBe(null);
    expect(chatMessages.value).toEqual([]);
    expect(selectedContextTabs.value).toEqual([]);
  });

  it('should update signal values correctly', () => {
    activeView.value = 'chat';
    expect(activeView.value).toBe('chat');
    
    activeView.value = 'search';
    expect(activeView.value).toBe('search');
    
    isLoading.value = true;
    expect(isLoading.value).toBe(true);

    error.value = 'Test Error';
    expect(error.value).toBe('Test Error');
  });
});
