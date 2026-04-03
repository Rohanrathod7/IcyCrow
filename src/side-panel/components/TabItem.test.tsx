// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/preact';
import { describe, it, expect, vi } from 'vitest';
import { TabItem } from './TabItem';
import { SpaceTab, UUID } from '../../lib/types';
import { DndContext } from '@dnd-kit/core';

describe('TabItem', () => {
  const mockTab: SpaceTab = {
    id: 't1' as UUID,
    url: 'https://test.com',
    title: 'Test Tab',
    favicon: 'https://test.com/favicon.ico',
    scrollPosition: 0,
    chromeTabId: null,
  };

  const mockOnRemove = vi.fn();

  const renderWithDnd = (ui: any) => {
    return render(
      <DndContext>
        {ui}
      </DndContext>
    );
  };

  it('renders tab title and icon', () => {
    renderWithDnd(<TabItem tab={mockTab} containerId={'s1' as UUID} onRemove={mockOnRemove} />);
    expect(screen.getByText('Test Tab')).toBeTruthy();
    expect(screen.getByRole('img')).toBeTruthy();
  });

  it('calls onRemove when delete button is clicked', () => {
    renderWithDnd(<TabItem tab={mockTab} containerId={'s1' as UUID} onRemove={mockOnRemove} />);
    const removeBtn = screen.getByTestId('remove-tab-btn');
    fireEvent.click(removeBtn);
    expect(mockOnRemove).toHaveBeenCalledWith('t1');
  });

  it('renders fallback icon if no favicon is provided', () => {
    const tabNoFav = { ...mockTab, favicon: null };
    renderWithDnd(<TabItem tab={tabNoFav} containerId={'s1' as UUID} onRemove={mockOnRemove} />);
    expect(screen.getByTestId('fallback-icon')).toBeTruthy();
  });
});
