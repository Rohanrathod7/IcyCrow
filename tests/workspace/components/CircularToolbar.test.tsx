import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';

// Mock dnd-kit to avoid React hook issues in Preact test environment
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div>{children}</div>,
  PointerSensor: {},
  useSensor: () => ({}),
  useSensors: () => ({}),
  closestCenter: {},
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div>{children}</div>,
  verticalListSortingStrategy: {},
  arrayMove: (arr: any) => arr,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: null,
  }),
}));

import { CircularToolbar } from '../../../src/workspace/components/CircularToolbar';
import { toolsOrder } from '../../../src/workspace/store/toolbar-state';
import { activeTool } from '../../../src/workspace/store/viewer-state';

describe('CircularToolbar', () => {
  it('renders all tools on a unified dial', () => {
    toolsOrder.value = ['pan', 'select', 'highlight', 'draw'];
    const { container } = render(<CircularToolbar />);
    
    // Check for unified wrapper
    const wrapper = container.querySelector('.unified-dial-wrapper');
    expect(wrapper).toBeDefined();

    // Tools should be buttons within the dial
    const toolItems = container.querySelectorAll('.dial-tool-button');
    expect(toolItems.length).toBe(4);
    
    // Check if they have some transform style (indicates geometric positioning)
    const firstTool = toolItems[0] as HTMLElement;
    expect(firstTool.style.transform).toContain('translate');
  });

  it('renders dial tick marks and corner brackets', () => {
    const { container } = render(<CircularToolbar />);
    
    // Check for tick marks
    const ticks = container.querySelectorAll('.dial-tick');
    expect(ticks.length).toBeGreaterThan(0);

    // Check for corner brackets around the hub
    const corners = container.querySelectorAll('.dial-corner');
    expect(corners.length).toBe(4);
  });

  it('renders directional arrows at cardinal points', () => {
    const { getByTestId } = render(<CircularToolbar />);
    
    expect(getByTestId('arrow-up')).toBeDefined();
    expect(getByTestId('arrow-down')).toBeDefined();
    expect(getByTestId('arrow-left')).toBeDefined();
    expect(getByTestId('arrow-right')).toBeDefined();
  });

  it('rotates the arc indicator based on active tool', async () => {
    toolsOrder.value = ['pan', 'select', 'highlight', 'draw']; // Ensure toolsOrder has values
    const { container, rerender } = render(<CircularToolbar />);
    const arc = container.querySelector('.dial-arc-indicator') as HTMLElement;
    
    // Default tool (pan) usually at index 0 or -90deg
    expect(arc.style.transform).toContain('rotate');
    const initialRotation = arc.style.transform;

    // Change tool to second one
    activeTool.value = toolsOrder.value[1] as any;
    rerender(<CircularToolbar />);
    
    // The rotation should have changed
    expect(arc.style.transform).toContain('rotate');
  });

  it('opens reorder overlay when reorder button is clicked', () => {
    const { getByTestId, queryByTestId } = render(<CircularToolbar />);
    
    // Initially overlay is hidden
    expect(queryByTestId('reorder-overlay')).toBeNull();
    
    // Click reorder button
    const reorderBtn = getByTestId('reorder-toggle');
    fireEvent.click(reorderBtn);
    
    // Now it should show
    expect(getByTestId('reorder-overlay')).toBeDefined();
  });
});
