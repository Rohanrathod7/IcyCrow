// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StandaloneTabsView } from './StandaloneTabsView';
import { standaloneTabs, currentWindowOpenTabs, bulkSelectionMode, selectedStandaloneTabIds, spaces } from '../store';
import type { SpaceTab, UUID } from '../../lib/types';

const mockChrome = {
  tabs: {
    create: vi.fn(),
    update: vi.fn(),
  },
  runtime: {
    sendMessage: vi.fn(),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
    session: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
};

vi.stubGlobal('chrome', mockChrome);

describe('StandaloneTabsView - Smart Focus', () => {
  const mockTabOpen: SpaceTab = {
    id: 'tab-open-id' as UUID,
    url: 'https://open.com',
    title: 'Open Tab Title',
    favicon: null,
    scrollPosition: 0,
    chromeTabId: null,
  };

  const mockTabClosed: SpaceTab = {
    id: 'tab-closed-id' as UUID,
    url: 'https://closed.com',
    title: 'Closed Tab Title',
    favicon: null,
    scrollPosition: 0,
    chromeTabId: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    standaloneTabs.value = [mockTabOpen, mockTabClosed];
    currentWindowOpenTabs.value = [
      { id: 101, url: 'https://open.com', windowId: 1 } as any,
    ];
  });

  it('renders standalone tabs and open status badges', () => {
    render(<StandaloneTabsView />);
    
    // Check titles are rendered
    expect(screen.getByText('Open Tab Title')).toBeTruthy();
    expect(screen.getByText('Closed Tab Title')).toBeTruthy();

    // Check Open badge is rendered for open tab, but not for closed tab
    expect(screen.queryAllByText('Open')).toHaveLength(1);
  });

  it('focuses existing tab on click if open', () => {
    render(<StandaloneTabsView />);
    
    const openTabRow = screen.getByText('Open Tab Title').closest('.tab-main');
    expect(openTabRow).toBeTruthy();
    
    fireEvent.click(openTabRow!);
    
    expect(mockChrome.tabs.update).toHaveBeenCalledWith(101, { active: true });
    expect(mockChrome.tabs.create).not.toHaveBeenCalled();
  });

  it('opens a new tab on click if closed', () => {
    render(<StandaloneTabsView />);
    
    const closedTabRow = screen.getByText('Closed Tab Title').closest('.tab-main');
    expect(closedTabRow).toBeTruthy();
    
    fireEvent.click(closedTabRow!);
    
    expect(mockChrome.tabs.create).toHaveBeenCalledWith({ url: 'https://closed.com' });
    expect(mockChrome.tabs.update).not.toHaveBeenCalled();
  });

  describe('StandaloneTabsView - Bulk Selection UI', () => {
    const mockTab1: SpaceTab = {
      id: 'tab1' as UUID,
      url: 'https://tab1.com',
      title: 'Tab 1',
      favicon: null,
      scrollPosition: 0,
      chromeTabId: null,
    };

    const mockTab2: SpaceTab = {
      id: 'tab2' as UUID,
      url: 'https://tab2.com',
      title: 'Tab 2',
      favicon: null,
      scrollPosition: 0,
      chromeTabId: null,
    };

    beforeEach(() => {
      vi.clearAllMocks();
      standaloneTabs.value = [mockTab1, mockTab2];
      currentWindowOpenTabs.value = [];
      bulkSelectionMode.value = false;
      selectedStandaloneTabIds.value = {};
      spaces.value = {
        ['space-a' as UUID]: { id: 'space-a' as UUID, name: 'Space A', color: 'blue', tabs: [] } as any
      };
    });

    it('renders select mode button and toggles selection mode on click', () => {
      render(<StandaloneTabsView />);
      
      const selectBtn = screen.getByTitle('Select Mode');
      expect(selectBtn).toBeTruthy();

      expect(screen.queryByText('Cancel')).toBeNull();
      expect(screen.queryByTestId('bulk-checkbox-tab1')).toBeNull();

      fireEvent.click(selectBtn);
      expect(bulkSelectionMode.value).toBe(true);
    });

    it('shows checkboxes and toggles item selection when in bulk selection mode', () => {
      bulkSelectionMode.value = true;
      render(<StandaloneTabsView />);

      const checkbox1 = screen.getByTestId('bulk-checkbox-tab1') as HTMLInputElement;
      expect(checkbox1).toBeTruthy();
      expect(checkbox1.checked).toBe(false);

      fireEvent.click(checkbox1);
      expect(selectedStandaloneTabIds.value['tab1' as UUID]).toBe(true);

      const cancelBtn = screen.getByText('Cancel');
      fireEvent.click(cancelBtn);
      expect(bulkSelectionMode.value).toBe(false);
      expect(selectedStandaloneTabIds.value).toEqual({});
    });

    it('performs select all and clear selection', () => {
      bulkSelectionMode.value = true;
      render(<StandaloneTabsView />);

      const selectAllBtn = screen.getByText('Select All');
      fireEvent.click(selectAllBtn);
      expect(selectedStandaloneTabIds.value).toEqual({ tab1: true, tab2: true });

      const clearBtn = screen.getByText('Clear');
      fireEvent.click(clearBtn);
      expect(selectedStandaloneTabIds.value).toEqual({});
    });
  });
});
