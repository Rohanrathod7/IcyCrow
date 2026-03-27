/** @vitest-environment jsdom */
/** @jsx h */
import { h } from 'preact';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/preact';
import { EdgeToolbar } from '../../../src/workspace/components/EdgeToolbar';
import { toolsOrder, toolbarPosition } from '../../../src/workspace/store/toolbar-state';

describe('EdgeToolbar', () => {
  it('renders all tools from toolsOrder', () => {
    toolbarPosition.value = 'bottom';
    toolsOrder.value = ['pan', 'select', 'highlight'];
    
    const { container } = render(<EdgeToolbar />);
    
    // Check for tool items (we'll use a specific class or data-testid)
    const items = container.querySelectorAll('[data-testid^="tool-"]');
    expect(items.length).toBe(3);
  });

  it('renders vertically when position is left or right', () => {
    toolbarPosition.value = 'left';
    const { container } = render(<EdgeToolbar />);
    const toolbar = container.firstChild as HTMLElement;
    
    // We expect a flex-col class or similar
    expect(toolbar.className).toContain('flex-col');
  });

  it('renders horizontally when position is top or bottom', () => {
    toolbarPosition.value = 'bottom';
    const { container } = render(<EdgeToolbar />);
    const toolbar = container.firstChild as HTMLElement;
    
    expect(toolbar.className).toContain('flex-row');
  });
});
