import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandPalette } from './CommandPalette';
import type { SpacesStore, UUID, ISOTimestamp } from '../../lib/types';

// Mock chrome APIs
const chromeMock = {
  tabs: {
    create: vi.fn(),
  },
};
vi.stubGlobal('chrome', chromeMock);

// Mock component with some sample data using branded type casting
const mockSpaces: SpacesStore = {
  ['space-1' as UUID]: {
    id: 'space-1' as UUID,
    name: 'Work',
    color: 'blue',
    createdAt: '2026-03-01T00:00:00Z' as ISOTimestamp,
    updatedAt: '2026-03-01T00:00:00Z' as ISOTimestamp,
    createNativeGroup: false,
    tabs: [
      { id: 'tab-1' as UUID, title: 'Google', url: 'https://google.com', favicon: null, scrollPosition: 0, chromeTabId: null },
      { id: 'tab-2' as UUID, title: 'GitHub', url: 'https://github.com', favicon: null, scrollPosition: 0, chromeTabId: null },
    ],
  },
  ['space-2' as UUID]: {
    id: 'space-2' as UUID,
    name: 'Personal',
    color: 'green',
    createdAt: '2026-03-01T00:00:00Z' as ISOTimestamp,
    updatedAt: '2026-03-01T00:00:00Z' as ISOTimestamp,
    createNativeGroup: false,
    tabs: [
      { id: 'tab-3' as UUID, title: 'YouTube', url: 'https://youtube.com', favicon: null, scrollPosition: 0, chromeTabId: null },
    ],
  },
};

describe('CommandPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('renders nothing when closed', () => {
    render(<CommandPalette isOpen={false} onClose={() => {}} spaces={mockSpaces} />);
    expect(screen.queryByPlaceholderText(/Search tabs/i)).toBeNull();
  });

  it('renders input and tabs when open', () => {
    render(<CommandPalette isOpen={true} onClose={() => {}} spaces={mockSpaces} />);
    expect(screen.getByPlaceholderText(/Search tabs/i)).toBeTruthy();
    expect(screen.getByText('Google')).toBeTruthy();
    expect(screen.getByText('GitHub')).toBeTruthy();
    expect(screen.getByText('YouTube')).toBeTruthy();
  });

  it('filters tabs based on query', async () => {
    render(<CommandPalette isOpen={true} onClose={() => {}} spaces={mockSpaces} />);
    const input = screen.getByPlaceholderText(/Search tabs/i) as HTMLInputElement;
    
    // Initial state: 3 tabs
    expect(screen.getAllByTestId('tab-item').length).toBe(3);
    
    // Search for google (matches 1)
    input.value = 'google';
    fireEvent.input(input);
    
    await screen.findByText('Google');
    expect(screen.getAllByTestId('tab-item').length).toBe(1);
    
    // Search for non-existent (matches 0)
    input.value = 'googoo';
    fireEvent.input(input);
    
    await screen.findByText(/No tabs matched/i);
    expect(screen.queryAllByTestId('tab-item').length).toBe(0);
  });

  it('opens a tab and closes when a result is clicked', () => {
    const onClose = vi.fn();
    render(<CommandPalette isOpen={true} onClose={onClose} spaces={mockSpaces} />);
    
    const item = screen.getByText('Google');
    fireEvent.click(item);
    
    expect(chromeMock.tabs.create).toHaveBeenCalledWith({ url: 'https://google.com' });
    expect(onClose).toHaveBeenCalled();
  });

  it('closes when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<CommandPalette isOpen={true} onClose={onClose} spaces={mockSpaces} />);
    
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
