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
    expect(colorButtons.length).toBe(7);
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

      // Click preview to enter edit mode
      const preview = screen.getByText('Hello world');
      fireEvent.click(preview);

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

      expect(onUpdate).toHaveBeenCalledWith({ text: 'Hello world\n![Image](data:image/png;base64,mockdata)\n' });
    });

    it('supports grab-to-resize handle for dragging image size', () => {
      const onUpdate = vi.fn();
      render(
        <DraggableNoteWindow 
          {...defaultProps} 
          imageUrl="data:image/png;base64,mockdata" 
          imageSize={50} 
          onUpdate={onUpdate}
        />
      );

      // Trigger hover to show controls
      const img = screen.getByRole('img');
      const grandparent = img.parentElement?.parentElement;
      expect(grandparent).toBeDefined();

      if (grandparent) {
        fireEvent.mouseEnter(grandparent);
      }

      // Check for grab handle
      const handle = screen.getByTitle('Drag to resize');
      expect(handle).toBeDefined();

      // Mock getBoundingClientRect for parent width calculation
      const greatGrandparent = grandparent?.parentElement;
      expect(greatGrandparent).toBeDefined();
      if (greatGrandparent) {
        vi.spyOn(greatGrandparent, 'getBoundingClientRect').mockReturnValue({
          left: 100,
          right: 300,
          width: 200,
          top: 0,
          bottom: 0,
          height: 100,
          x: 100,
          y: 0,
          toJSON: () => {}
        });
      }

      // Simulate pointer drag resizing:
      // Dragging pointer from handle (x coordinate 200) to clientX 250 (which represents 75% width)
      fireEvent.pointerDown(handle, { clientX: 200, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 250 });
      fireEvent.pointerUp(handle, { pointerId: 1 });

      expect(onUpdate).toHaveBeenCalledWith({ imageSize: 75 });
    });

    it('triggers onViewFullscreen when double clicking the image and ensures fullscreen button is removed', () => {
      const onViewFullscreen = vi.fn();
      render(
        <DraggableNoteWindow 
          {...defaultProps} 
          imageUrl="data:image/png;base64,mockdata" 
          onViewFullscreen={onViewFullscreen}
        />
      );

      const img = screen.getByRole('img');
      const grandparent = img.parentElement?.parentElement;
      expect(grandparent).toBeDefined();

      if (grandparent) {
        fireEvent.mouseEnter(grandparent);
      }

      // Full screen button should NOT exist anymore
      expect(screen.queryByTitle('Full screen')).toBeNull();

      // Double-click triggers fullscreen zoom
      fireEvent.dblClick(img);

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

      // Click previews to enter edit mode
      const frontPreview = screen.getByText('Front question');
      fireEvent.click(frontPreview);
      const frontTextarea = screen.getByPlaceholderText('Front (Question)...');

      const backPreview = screen.getByText('Back answer');
      fireEvent.click(backPreview);
      const backTextarea = screen.getByPlaceholderText('Back (Answer)...');

      const file = new File([''], 'fc.png', { type: 'image/png' });
      const clipboardData = {
        items: [{ type: 'image/png', getAsFile: () => file }]
      };

      const pasteEventFront = new Event('paste', { bubbles: true }) as any;
      pasteEventFront.clipboardData = clipboardData;
      fireEvent(frontTextarea, pasteEventFront);
      
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(onUpdate).toHaveBeenCalledWith({ frontText: 'Front question\n![Image](data:image/png;base64,mockdata)\n' });

      onUpdate.mockClear();

      const pasteEventBack = new Event('paste', { bubbles: true }) as any;
      pasteEventBack.clipboardData = clipboardData;
      fireEvent(backTextarea, pasteEventBack);
      
      await new Promise(resolve => setTimeout(resolve, 20));
      expect(onUpdate).toHaveBeenCalledWith({ backText: 'Back answer\n![Image](data:image/png;base64,mockdata)\n' });
    });

    it('renders Markdown preview for note content and toggles editing on click/blur', () => {
      const onUpdate = vi.fn();
      render(
        <DraggableNoteWindow 
          {...defaultProps} 
          text="**hello** markdown" 
          onUpdate={onUpdate}
        />
      );

      // By default, it should render the parsed HTML in preview mode
      const preview = screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'strong' && content === 'hello';
      });
      expect(preview).toBeDefined();

      // Textarea should NOT be present in preview mode
      expect(screen.queryByPlaceholderText('Type sticky text...')).toBeNull();

      // Click the preview to enter editing mode
      fireEvent.click(preview);

      // Now the raw textarea should be displayed
      const textarea = screen.getByPlaceholderText('Type sticky text...') as HTMLTextAreaElement;
      expect(textarea).toBeDefined();
      expect(textarea.value).toBe('**hello** markdown');

      // Click the toggle button in header to return to preview mode
      const toggleBtn = screen.getByText('Preview');
      fireEvent.click(toggleBtn);

      // Textarea should be gone again
      expect(screen.queryByPlaceholderText('Type sticky text...')).toBeNull();
    });
  });
});
