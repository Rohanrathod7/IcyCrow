// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/preact';
import { TabRow } from './TabRow';
import type { SpaceTab, UUID } from '../../lib/types';

describe('TabRow Component', () => {
  const mockTab: SpaceTab = {
    id: 't-1' as UUID,
    url: 'https://example.com',
    title: 'Example Tab',
    favicon: 'https://example.com/icon.png',
    scrollPosition: 0,
    chromeTabId: 1
  };

  const onRemove = vi.fn();

  it('renders tab title and fallback icon when favicon is missing', () => {
    const tabWithoutIcon: SpaceTab = { ...mockTab, favicon: null };
    render(<TabRow tab={tabWithoutIcon} onRemove={onRemove} />);
    
    expect(screen.getByText('Example Tab')).toBeTruthy();
    // Should render Globe icon (fallback)
    const fallbackIcon = screen.queryByTestId('fallback-icon');
    expect(fallbackIcon).toBeTruthy();
    
    const container = screen.getByText('Example Tab').parentElement;
    expect(container?.className).toContain('gap-12');
  });

  it('renders tab title and favicon when present', () => {
    render(<TabRow tab={mockTab} onRemove={onRemove} />);
    
    expect(screen.getByText('Example Tab')).toBeTruthy();
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://example.com/icon.png');
    
    const container = screen.getByText('Example Tab').parentElement;
    expect(container?.className).toContain('gap-12');
  });

  it('has a ghost delete button', () => {
    render(<TabRow tab={mockTab} onRemove={onRemove} />);
    const deleteBtn = screen.getByTestId('remove-tab-btn');
    expect(deleteBtn.className).toContain('remove-btn');
    expect(deleteBtn.className).toContain('hidden-action');
  });

  it('calls onRemove when the remove button is clicked', () => {
    render(<TabRow tab={mockTab} onRemove={onRemove} />);
    const removeBtn = screen.getByTestId('remove-tab-btn');
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith('t-1');
  });
});
