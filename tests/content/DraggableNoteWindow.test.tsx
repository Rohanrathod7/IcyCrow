// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/preact';
import { DraggableNoteWindow } from '../../src/content/components/DraggableNoteWindow';

describe('DraggableNoteWindow Component', () => {
  const defaultProps = {
    id: 'test-note-1',
    type: 'sticky' as const,
    x: 100,
    y: 100,
    color: '#fbbf24',
    text: 'Hello world',
    isExpanded: true,
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    onFocus: vi.fn(),
    onBlur: vi.fn(),
    isActive: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders color picker buttons in the header when expanded', () => {
    render(<DraggableNoteWindow {...defaultProps} />);
    
    // Check that color buttons exist (we can query them by title or element style)
    const colorButtons = screen.getAllByTitle('Change color');
    expect(colorButtons.length).toBe(5);
  });

  it('triggers color update when a color circle is clicked', () => {
    render(<DraggableNoteWindow {...defaultProps} />);
    
    const colorButtons = screen.getAllByTitle('Change color');
    fireEvent.click(colorButtons[1]); // Click second color (e.g. green)
    
    expect(defaultProps.onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ color: expect.any(String) })
    );
  });

  it('collapses/compress when clicking outside of the card', async () => {
    render(
      <div>
        <div data-testid="outside">Outside Element</div>
        <DraggableNoteWindow {...defaultProps} />
      </div>
    );
    
    // Wait for the delay timer to register the listener
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Simulate mousedown on the outside element
    fireEvent.mouseDown(screen.getByTestId('outside'));
    
    expect(defaultProps.onUpdate).toHaveBeenCalledWith({ isExpanded: false });
  });
});
