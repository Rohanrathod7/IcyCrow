// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/preact';
import { SpaceCard } from './SpaceCard';
import { expandedSpaceId, updateSpaceConfig, searchQuery, currentWindowId, activeWorkspaces } from '../store';
import type { Space, UUID, ISOTimestamp } from '../../lib/types';

// Mock store
vi.mock('../store', () => ({
  expandedSpaceId: { value: null },
  updateSpaceConfig: vi.fn(),
  deleteSpace: vi.fn(),
  addActiveTabToSpace: vi.fn().mockResolvedValue({ success: true }),
  activeWorkspaces: { value: {} },
  spaces: { value: {} },
  searchQuery: { value: '' },
  currentWindowId: { value: null },
}));

// Mock icons
vi.mock('lucide-preact', () => ({
  ChevronDown: ({ className }: { className?: string }) => <div data-testid="chevron-down" className={className} />,
  ChevronUp: ({ className }: { className?: string }) => <div data-testid="chevron-up" className={className} />,
  ArrowUpRight: () => <div data-testid="icon-restore" />,
  Edit2: () => <div data-testid="icon-edit" />,
  Trash2: () => <div data-testid="icon-trash" />,
  X: () => <div data-testid="icon-x" />,
  Plus: () => <div data-testid="icon-plus" />,
  Check: () => <div data-testid="icon-check" />,
  MoreVertical: () => <div data-testid="icon-options" />,
  Save: () => <div data-testid="icon-save" />,
  GripVertical: () => <div data-testid="icon-grip" />,
  Globe: () => <div data-testid="icon-globe" />,
}));

vi.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({
    setNodeRef: vi.fn(),
  }),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <>{children}</>,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Translate: {
      toString: vi.fn(),
    },
  },
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
    searchQuery.value = '';
    currentWindowId.value = null;
    activeWorkspaces.value = {};
  });

  it('renders the header with space name and tab count', () => {
    render(<SpaceCard {...defaultProps} />);
    screen.getByText('Test Space');
    const countBadge = screen.getByText('1');
    expect(countBadge.classList.contains('badge-pill-count')).toBe(true);
  });

  it('toggles expansion when the header is clicked', () => {
    render(<SpaceCard {...defaultProps} />);
    const header = screen.getByTestId(`space-card-space-1`).querySelector('.space-card-title-group');
    if (header) fireEvent.click(header);
    expect(expandedSpaceId.value).toBe('space-1');
  });

  it('enters editing mode when the edit icon is clicked', async () => {
    render(<SpaceCard {...defaultProps} />);
    const optionsBtn = screen.getByTestId('icon-options').parentElement;
    if (optionsBtn) fireEvent.click(optionsBtn);
    
    const editBtn = screen.getByTestId('icon-edit').parentElement;
    if (editBtn) fireEvent.click(editBtn);
    
    const input = screen.getByDisplayValue('Test Space');
    expect(input).toBeDefined();
  });

  it('saves the new name on Enter', async () => {
    render(<SpaceCard {...defaultProps} />);
    const optionsBtn = screen.getByTestId('icon-options').parentElement;
    if (optionsBtn) fireEvent.click(optionsBtn);
    
    const editBtn = screen.getByTestId('icon-edit').parentElement;
    if (editBtn) fireEvent.click(editBtn);
    
    const input = screen.getByDisplayValue('Test Space') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'New Space Name' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(updateSpaceConfig).toHaveBeenCalledWith('space-1', { name: 'New Space Name' });
  });

  it('renders the action icons: Restore (ArrowUpRight), Options, and dropdown menu options', () => {
    render(<SpaceCard {...defaultProps} />);
    expect(screen.getByTestId('icon-restore')).toBeDefined();
    expect(screen.getByTestId('icon-options')).toBeDefined();
    
    const optionsBtn = screen.getByTestId('icon-options').parentElement;
    if (optionsBtn) fireEvent.click(optionsBtn);
    
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

  it('triggers addActiveTabToSpace when the plus button is clicked', async () => {
    const { addActiveTabToSpace } = await import('../store');
    render(<SpaceCard {...defaultProps} />);
    
    const plusBtn = screen.getByTestId('icon-plus').parentElement;
    if (plusBtn) fireEvent.click(plusBtn);
    
    expect(addActiveTabToSpace).toHaveBeenCalledWith('space-1');
    // After click, it should show check icon (micro-interaction)
    expect(await screen.findByTestId('icon-check')).toBeDefined();
  });

  it('renders Current badge when active in the current window', async () => {
    currentWindowId.value = 10;
    activeWorkspaces.value = { 10: 'space-1' as UUID };

    render(<SpaceCard {...defaultProps} />);
    
    expect(screen.getByText('Current')).toBeDefined();
    const card = screen.getByTestId('space-card-space-1');
    expect(card.classList.contains('current-window-card')).toBe(true);
  });

  it('renders pulse dot when active in another window but not current window', async () => {
    currentWindowId.value = 10;
    activeWorkspaces.value = { 20: 'space-1' as UUID };

    const { container } = render(<SpaceCard {...defaultProps} />);
    
    expect(screen.queryByText('Current')).toBeNull();
    const pulseDot = container.querySelector('.pulse-dot-mini');
    expect(pulseDot).toBeTruthy();
    expect(pulseDot?.getAttribute('title')).toBe('Active in another window');
    const card = screen.getByTestId('space-card-space-1');
    expect(card.classList.contains('current-window-card')).toBe(false);
  });
});
