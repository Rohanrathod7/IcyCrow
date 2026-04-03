// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/preact';
import { SpaceCard } from './SpaceCard';
import { expandedSpaceId, updateSpaceName } from '../store';
import type { Space, UUID, ISOTimestamp } from '../../lib/types';

// Mock store
vi.mock('../store', () => ({
  expandedSpaceId: { value: null },
  updateSpaceName: vi.fn(),
  deleteSpace: vi.fn(),
  spaces: { value: {} },
}));

// Mock icons
vi.mock('lucide-preact', () => ({
  ChevronDown: ({ className }: { className?: string }) => <div data-testid="chevron-down" className={className} />,
  ChevronUp: ({ className }: { className?: string }) => <div data-testid="chevron-up" className={className} />,
  ArrowUpRight: () => <div data-testid="icon-restore" />,
  Edit2: () => <div data-testid="icon-edit" />,
  Trash2: () => <div data-testid="icon-trash" />,
  X: () => <div data-testid="icon-x" />,
}));

describe('SpaceCard Component', () => {
  const mockSpace: Space = {
    id: 'space-1' as UUID,
    name: 'Test Space',
    color: '#ff0000',
    createdAt: '2026-03-29T00:00:00Z' as ISOTimestamp,
    updatedAt: '2026-03-29T00:00:00Z' as ISOTimestamp,
    tabs: [
      { id: 't1' as UUID, url: 'https://test.com', title: 'Tab 1', favicon: 'fav1.png', scrollPosition: 0, chromeTabId: 1 },
    ],
    createNativeGroup: false,
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

  it('renders the header with stacked name and tab count', () => {
    render(<SpaceCard {...defaultProps} />);
    screen.getByText('Test Space');
    screen.getByText('1 tabs');
    
    // Check if they are wrapped in an items-start container (flex-col)
    const nameElement = screen.getByText('Test Space');
    const columnContainer = nameElement.parentElement;
    expect(columnContainer?.classList.contains('flex-col')).toBe(true);
    expect(columnContainer?.classList.contains('items-start')).toBe(true);
    expect(columnContainer?.classList.contains('leading-tight')).toBe(true);

    const tabCount = screen.getByText('1 tabs');
    expect(tabCount.classList.contains('text-gray-400')).toBe(true);
  });

  it('toggles expansion when the header is clicked', () => {
    render(<SpaceCard {...defaultProps} />);
    const header = screen.getByTestId(`space-card-space-1`).querySelector('.header-row');
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

  it('renders the action icons: Restore (ArrowUpRight), Edit, Delete', () => {
    render(<SpaceCard {...defaultProps} />);
    expect(screen.getByTestId('icon-restore')).toBeDefined();
    expect(screen.getByTestId('icon-edit')).toBeDefined();
    expect(screen.getByTestId('icon-trash')).toBeDefined();
  });

  it('renders the accordion body when expanded', () => {
    expandedSpaceId.value = 'space-1' as UUID;
    render(<SpaceCard {...defaultProps} />);
    // Tab 1 should be visible in the body
    expect(screen.getByText('Tab 1')).toBeDefined();
  });

  it('does not render the accordion body when collapsed', () => {
    expandedSpaceId.value = 'other-space' as UUID;
    render(<SpaceCard {...defaultProps} />);
    expect(screen.queryByText('Tab 1')).toBeNull();
  });
});
