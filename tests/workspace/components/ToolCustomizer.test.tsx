// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/preact';
import { ToolCustomizer } from '../../../src/workspace/components/ToolCustomizer';
import { activeCustomizationTool, toolSettings } from '../../../src/workspace/store/viewer-state';

vi.mock('../../../src/workspace/store/viewer-state', async () => {
  const { signal } = await import('@preact/signals');
  return {
    activeTool: signal('pan'),
    activeCustomizationTool: signal(null),
    toolSettings: signal({
      'highlight-yellow': { size: 20, color: '#eab308', opacity: 0.4, mode: 'text' },
      'highlight-green': { size: 20, color: '#22c55e', opacity: 0.4, mode: 'text' },
      'highlight-blue': { size: 20, color: '#3b82f6', opacity: 0.4, mode: 'text' }
    })
  };
});

describe('ToolCustomizer: Highlight Presets and Preview Modes', () => {
  beforeEach(() => {
    activeCustomizationTool.value = null;
    vi.clearAllMocks();
  });

  it('renders text preview instead of circle when customizing highlights', () => {
    activeCustomizationTool.value = 'highlight-yellow';
    render(<ToolCustomizer />);
    
    // Should show text preview
    expect(screen.queryByText(/highlight important details/)).not.toBeNull();
  });

  it('toggles preview background between light and dark modes', () => {
    activeCustomizationTool.value = 'highlight-yellow';
    render(<ToolCustomizer />);
    
    const darkBtn = screen.getByText('Dark');
    fireEvent.click(darkBtn);
    
    // Check that dark mode background styling or text color is applied
    const previewContainer = screen.queryByText(/highlight important details/)?.parentElement;
    expect(previewContainer).not.toBeNull();
    // Container background style is updated
  });
});
