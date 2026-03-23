import { describe, it, expect, beforeEach, vi } from 'vitest';
import { activeView, allHighlights, spaces, error, isLoading, searchResults, chatMessages, selectedContextTabs } from './store';

describe('Side Panel Signal Store', () => {
  beforeEach(() => {
    activeView.value = 'home';
    allHighlights.value = [];
    spaces.value = {};
    error.value = null;
    isLoading.value = false;
    searchResults.value = [];
    chatMessages.value = [];
    selectedContextTabs.value = [];
  });

  it('should initialize with default values', () => {
    expect(activeView.value).toBe('home');
    expect(allHighlights.value).toEqual([]);
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

  it('should aggregate allHighlights from multiple storage keys', async () => {
    // Mock chrome storage
    global.chrome = {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            'highlights:hash1': [{ id: '1', text: 'H1', createdAt: '2023-01-01T12:00:00Z' }],
            'highlights:hash2': [{ id: '2', text: 'H2', createdAt: '2023-01-02T12:00:00Z' }],
            'otherKey': 'junk'
          })
        }
      }
    } as any;

    const { syncAllHighlights } = await import('./store');
    await syncAllHighlights();
    
    expect(allHighlights.value).toHaveLength(2);
    expect(allHighlights.value.map((h: any) => h.text)).toContain('H1');
    expect(allHighlights.value.map((h: any) => h.text)).toContain('H2');
  });
});
