// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { ToolbarManager } from './ToolbarManager';
import { isSidebarOpen } from '../store/ui-state';

describe('Sidebar Integration', () => {
  it('should toggle isSidebarOpen when the sidebar button is clicked', () => {
    isSidebarOpen.value = false;
    const { getByTestId } = render(<ToolbarManager />);
    
    const toggleBtn = getByTestId('sidebar-toggle-btn');
    fireEvent.click(toggleBtn);
    
    expect(isSidebarOpen.value).toBe(true);
    
    fireEvent.click(toggleBtn);
    expect(isSidebarOpen.value).toBe(false);
  });
});
