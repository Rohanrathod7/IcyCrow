// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/preact';
import { HighlightTooltip } from '../../src/content/components/HighlightTooltip';
import { tooltipVisible, selectedColor } from '../../src/content/state';
import { activeCustomizationTool } from '../../src/workspace/store/viewer-state';

vi.mock('../../src/content/state', async () => {
  const { signal } = await import('@preact/signals');
  return {
    tooltipVisible: signal(true),
    tooltipPos: signal({ x: 100, y: 100 }),
    selectedColor: signal('yellow')
  };
});

vi.mock('../../src/workspace/store/viewer-state', async () => {
  const { signal } = await import('@preact/signals');
  return {
    activeTool: signal('pan'),
    activeCustomizationTool: signal(null),
    toolSettings: signal({
      'highlight-yellow': { size: 20, color: '#eab308', opacity: 0.4 },
      'highlight-green': { size: 20, color: '#22c55e', opacity: 0.4 },
      'highlight-blue': { size: 20, color: '#3b82f6', opacity: 0.4 }
    })
  };
});

vi.mock('../../src/workspace/store/toolbar-state', async () => {
  const { signal } = await import('@preact/signals');
  return {
    isToolPickerOpen: signal(false)
  };
});

vi.mock('../../src/content/store/web-annotation-state', () => ({
  webFlashcardNotes: { value: [] },
  webStickyNotes: { value: [] },
  webCallouts: { value: [] },
  triggerAutoSave: vi.fn()
}));

describe('HighlightTooltip Component', () => {
  beforeEach(() => {
    tooltipVisible.value = true;
    activeCustomizationTool.value = null;
  });

  it('renders only three color circles (yellow, green, blue)', () => {
    render(<HighlightTooltip />);
    
    // There should be exactly 3 color buttons in the tooltip
    const buttons = screen.getAllByRole('button');
    // Filter buttons that represent our colors by their titles
    const colorButtons = buttons.filter(btn => 
      ['yellow', 'green', 'blue', 'red'].includes(btn.title)
    );
    
    expect(colorButtons.length).toBe(3);
    const titles = colorButtons.map(btn => btn.title);
    expect(titles).toContain('yellow');
    expect(titles).toContain('green');
    expect(titles).toContain('blue');
    expect(titles).not.toContain('red');
  });

  it('opens customization panel on double click of a color circle', () => {
    render(<HighlightTooltip />);
    
    const greenBtn = screen.getByTitle('green');
    greenBtn.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
    
    expect(activeCustomizationTool.value).toBe('highlight-green');
  });
});
