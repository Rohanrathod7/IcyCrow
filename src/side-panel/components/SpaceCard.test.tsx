// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/preact';
import { SpaceCard } from './SpaceCard';
import { expandedSpaceId, updateSpaceName, deleteSpace } from '../store';
import type { Space, UUID } from '../../lib/types';

// Mock store
vi.mock('../store', () => ({
  expandedSpaceId: { value: null },
  updateSpaceName: vi.fn(),
  deleteSpace: vi.fn(),
  spaces: { value: {} },
}));

// Mock icons
vi.mock('lucide-preact', () => ({
  ChevronDown: () => <div data-testid="chevron-down" />,
  ChevronUp: () => <div data-testid="chevron-up" />,
  Play: () => <div data-testid="icon-play" />,
  Edit2: () => <div data-testid="icon-edit" />,
  Trash2: () => <div data-testid="icon-trash" />,
  X: () => <div data-testid="icon-x" />,
}));

describe('SpaceCard Component', () => {
  const mockSpace: Space = {
    id: 'space-1' as UUID,
    name: 'Test Space',
    color: '#ff0000',
    createdAt: '2026-03-29T00:00:00Z' as any,
    updatedAt: '2026-03-29T00:00:00Z' as any,
    tabs: [
      { id: 't1' as UUID, url: 'https://test.com', title: 'Tab 1', favicon: 'fav1.png', scrollPosition: 0, chromeTabId: 1 },
    ],
  };

  const defaultProps = {
    space: mockSpace,
    onRestore: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    expandedSpaceId.value = null;
  });

  it('renders the header correctly with name and tab count', () => {
    render(<SpaceCard {...defaultProps} />);
    expect(screen.getByText('Test Space')).toBeDefined();
    expect(screen.getByText('1 tabs')).toBeDefined();
  });

  it('toggles expansion when the header is clicked', () => {
    render(<SpaceCard {...defaultProps} />);
    const header = screen.getByText('Test Space').parentElement?.parentElement;
    if (header) fireEvent.click(header);
    expect(expandedSpaceId.value).toBe('space-1');
  });

  it('enters editing mode when the edit icon is clicked', async () => {
    render(<SpaceCard {...defaultProps} />);
    const editBtn = screen.getByTestId('icon-edit').parentElement;
    if (editBtn) fireEvent.click(editBtn);
    
    const input = screen.getByDisplayValue('Test Space');
    expect(input).toBeDefined();
  });

  it('saves the new name on Enter', async () => {
    render(<SpaceCard {...defaultProps} />);
    const editBtn = screen.getByTestId('icon-edit').parentElement;
    if (editBtn) fireEvent.click(editBtn);
    
    const input = screen.getByDisplayValue('Test Space') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'New Space Name' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(updateSpaceName).toHaveBeenCalledWith('space-1', 'New Space Name');
  });

  it('renders the action icons: Restore, Edit, Delete', () => {
    render(<SpaceCard {...defaultProps} />);
    expect(screen.getByTestId('icon-play')).toBeDefined();
    expect(screen.getByTestId('icon-edit')).toBeDefined();
    expect(screen.getByTestId('icon-trash')).toBeDefined();
  });
});
