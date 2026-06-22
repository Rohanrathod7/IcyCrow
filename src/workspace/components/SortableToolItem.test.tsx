// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/preact';
import { SortableToolItem } from './SortableToolItem';
import { activeTool, toolSettings } from '../store/viewer-state';
import { toolMetadata } from '../store/toolbar-state';

vi.mock('@dnd-kit/sortable', () => ({
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
    Transform: {
      toString: () => '',
    },
  },
}));

describe('SortableToolItem Icon Colors', () => {
  beforeEach(() => {
    activeTool.value = 'pan';
    // Reset custom settings and metadata
    toolSettings.value = {
      draw: { size: 4, color: '#facc15' },
      highlight: { size: 20, color: '#fef08a' }
    };
    toolMetadata.value = {
      draw: { color: '#facc15' },
      highlight: { color: '#4ade80' }
    };
  });

  it('renders with uniform inactive color when the tool is not active', () => {
    // 'draw' is inactive because activeTool is 'pan'
    const { container } = render(<SortableToolItem id="draw" />);
    const icon = container.querySelector('svg');
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute('stroke')).toBe('rgba(255,255,255,0.7)');
  });

  it('renders with the custom selected color when the tool is active', () => {
    activeTool.value = 'draw';
    const { container } = render(<SortableToolItem id="draw" />);
    const icon = container.querySelector('svg');
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute('stroke')).toBe('#facc15');
  });

  it('updates icon color when the user customizes the tool settings color', () => {
    activeTool.value = 'draw';
    // Change selected color in toolSettings to green
    toolSettings.value = {
      ...toolSettings.value,
      draw: { size: 4, color: '#00ff00' }
    };
    const { container } = render(<SortableToolItem id="draw" />);
    const icon = container.querySelector('svg');
    expect(icon).toBeTruthy();
    expect(icon?.getAttribute('stroke')).toBe('#00ff00');
  });
});
