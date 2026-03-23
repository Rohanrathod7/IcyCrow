// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/preact';
import { ContextPicker } from '../../../src/side-panel/components/ContextPicker';
import { selectedContextTabs } from '../../../src/side-panel/store';

describe('ContextPicker Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    selectedContextTabs.value = [];
    
    // Mock chrome.tabs.query
    global.chrome = {
      tabs: {
        query: vi.fn((query, callback) => {
          if (callback) callback([]);
          return Promise.resolve([]);
        }),
      },
      runtime: {
        lastError: null
      }
    } as any;
  });

  it('should fetch and display all open tabs', async () => {
    const mockTabs = [
      { id: 1, title: 'Tab 1', url: 'https://example.com/1', favIconUrl: 'icon1.png' },
      { id: 2, title: 'Tab 2', url: 'https://example.com/2', favIconUrl: 'icon2.png' },
    ];
    (chrome.tabs.query as any).mockImplementation((_query: any, callback: (result: any[]) => void) => {
      if (callback) callback(mockTabs);
      return Promise.resolve(mockTabs);
    });

    const { getByText } = render(<ContextPicker />);
    
    await waitFor(() => {
      expect(getByText('Tab 1')).toBeDefined();
      expect(getByText('Tab 2')).toBeDefined();
    });
  });

  it('should update selectedContextTabs signal when a tab is toggled', async () => {
    const mockTabs = [
      { id: 1, title: 'Tab 1', url: 'https://example.com/1' },
    ];
    (chrome.tabs.query as any).mockImplementation((_query: any, callback: (result: any[]) => void) => {
      if (callback) callback(mockTabs);
      return Promise.resolve(mockTabs);
    });

    const { getByLabelText } = render(<ContextPicker />);
    
    await waitFor(() => expect(getByLabelText('Tab 1')).toBeDefined());
    
    const checkbox = getByLabelText('Tab 1') as HTMLInputElement;
    fireEvent.click(checkbox);
    
    expect(selectedContextTabs.value).toHaveLength(1);
    expect(selectedContextTabs.value[0].tabId).toBe(1);
    
    fireEvent.click(checkbox);
    expect(selectedContextTabs.value).toHaveLength(0);
  });
});
