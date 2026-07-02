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

  describe('Image management features', () => {
    let originalFileReader: any;

    beforeEach(() => {
      originalFileReader = global.FileReader;
      class MockFileReader {
        onload: any = null;
        readAsDataURL(file: any) {
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: { result: 'data:image/png;base64,mockdata' } });
            }
          }, 5);
        }
      }
      vi.stubGlobal('FileReader', MockFileReader);
    });

    afterEach(() => {
      global.FileReader = originalFileReader;
      vi.clearAllMocks();
    });

    it('intercepts image paste and updates imageUrl on sticky notes', async () => {
      const onUpdate = vi.fn();
      render(<DraggableNoteWindow {...defaultProps} onUpdate={onUpdate} />);

      const textarea = screen.getByPlaceholderText('Type sticky text...');
      const file = new File([''], 'test.png', { type: 'image/png' });
      const clipboardData = {
        items: [
          {
            type: 'image/png',
            getAsFile: () => file
          }
        ]
      };

      const pasteEvent = new Event('paste', { bubbles: true }) as any;
      pasteEvent.clipboardData = clipboardData;
      
      fireEvent(textarea, pasteEvent);

      // Wait for FileReader onload to execute
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(onUpdate).toHaveBeenCalledWith({ imageUrl: 'data:image/png;base64,mockdata' });
    });

    it('displays image size slider when image is present', () => {
      const onUpdate = vi.fn();
      render(
        <DraggableNoteWindow 
          {...defaultProps} 
          imageUrl="data:image/png;base64,mockdata" 
          imageSize={50} 
          onUpdate={onUpdate}
        />
      );

      // We need to trigger hover/mouseenter to show the controls
      const img = screen.getByRole('img');
      const container = img.parentElement?.parentElement;
      expect(container).toBeDefined();

      if (container) {
        fireEvent.mouseEnter(container);
      }

      // Check for size slider
      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider).toBeDefined();
      expect(slider.value).toBe('50');

      // Change slider value
      fireEvent.input(slider, { target: { value: '75' } });
      expect(onUpdate).toHaveBeenCalledWith({ imageSize: 75 });
    });

    it('triggers onViewFullscreen when fullscreen button is clicked', () => {
      const onViewFullscreen = vi.fn();
      render(
        <DraggableNoteWindow 
          {...defaultProps} 
          imageUrl="data:image/png;base64,mockdata" 
          onViewFullscreen={onViewFullscreen}
        />
      );

      const img = screen.getByRole('img');
      const container = img.parentElement?.parentElement;
      expect(container).toBeDefined();

      if (container) {
        fireEvent.mouseEnter(container);
      }

      const zoomBtn = screen.getByTitle('Full screen');
      fireEvent.click(zoomBtn);

      expect(onViewFullscreen).toHaveBeenCalledWith('data:image/png;base64,mockdata');
    });

    it('intercepts front and back pastes for flashcards', async () => {
      const onUpdate = vi.fn();
      const flashcardProps = {
        ...defaultProps,
        type: 'flashcard' as const,
        frontText: 'Front question',
        backText: 'Back answer',
        onUpdate
      };
      
      render(<DraggableNoteWindow {...flashcardProps} />);

      const frontTextarea = screen.getByPlaceholderText('Front (Question)...');
      const backTextarea = screen.getByPlaceholderText('Back (Answer)...');

      const file = new File([''], 'fc.png', { type: 'image/png' });
      const clipboardData = {
        items: [{ type: 'image/png', getAsFile: () => file }]
      };

      const pasteEventFront = new Event('paste', { bubbles: true }) as any;
      pasteEventFront.clipboardData = clipboardData;
      fireEvent(frontTextarea, pasteEventFront);
      
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(onUpdate).toHaveBeenCalledWith({ frontImageUrl: 'data:image/png;base64,mockdata' });

      onUpdate.mockClear();

      const pasteEventBack = new Event('paste', { bubbles: true }) as any;
      pasteEventBack.clipboardData = clipboardData;
      fireEvent(backTextarea, pasteEventBack);
      
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(onUpdate).toHaveBeenCalledWith({ backImageUrl: 'data:image/png;base64,mockdata' });
    });
  });
});
