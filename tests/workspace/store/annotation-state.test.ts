import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  stickyNotes, 
  addSticky, 
  updateStickyText, 
  deleteSticky,
  activeStickyId,
  highlights,
  strokes,
  callouts,
  draftCallout,
  activeCalloutId,
  addCallout,
  updateCalloutText,
  deleteCallout,
  updateStickyPosition,
  updateCalloutBoxPosition
} from '../../../src/workspace/store/annotation-state';

// Mock IDB store
vi.mock('../../../src/lib/idb-store', () => ({
  saveAnnotations: vi.fn(),
  getAnnotations: vi.fn()
}));

describe('Annotation State - Sticky Notes', () => {
  beforeEach(() => {
    stickyNotes.value = [];
    callouts.value = [];
    draftCallout.value = null;
    activeStickyId.value = null;
    activeCalloutId.value = null;
    vi.clearAllMocks();
  });

  it('should add a new sticky note', () => {
    addSticky(1, 100, 200, '#fbbf24');
    expect(stickyNotes.value.length).toBe(1);
    expect(stickyNotes.value[0]).toMatchObject({
      pageNumber: 1,
      x: 100,
      y: 200,
      color: '#fbbf24',
      text: ''
    });
    // Should auto-expand
    expect(activeStickyId.value).toBe(stickyNotes.value[0].id);
  });

  it('should update sticky note text', () => {
    addSticky(1, 0, 0, 'red');
    const id = stickyNotes.value[0].id;
    updateStickyText(id, 'Hello World');
    expect(stickyNotes.value[0].text).toBe('Hello World');
  });

  it('should delete a sticky note', () => {
    expect(stickyNotes.value.length).toBe(0);
  });
  
  it('should update sticky note position', () => {
    addSticky(1, 100, 200, 'red');
    const id = stickyNotes.value[0].id;
    updateStickyPosition(id, 300, 400);
    expect(stickyNotes.value[0].x).toBe(300);
    expect(stickyNotes.value[0].y).toBe(400);
  });

  describe('Annotation State - Callouts', () => {
    it('should add a new callout', () => {
      addCallout(1, { x: 10, y: 10 }, { x: 50, y: 50 }, '#3b82f6');
      expect(callouts.value.length).toBe(1);
      expect(callouts.value[0]).toMatchObject({
        pageNumber: 1,
        anchor: { x: 10, y: 10 },
        box: { x: 50, y: 50 },
        color: '#3b82f6',
        text: ''
      });
      expect(activeCalloutId.value).toBe(callouts.value[0].id);
    });

    it('should update callout text', () => {
      addCallout(1, { x: 0, y: 0 }, { x: 10, y: 10 }, 'blue');
      const id = callouts.value[0].id;
      updateCalloutText(id, 'Check this out');
      expect(callouts.value[0].text).toBe('Check this out');
    });

    it('should delete a callout', () => {
      addCallout(1, { x: 0, y: 0 }, { x: 10, y: 10 }, 'blue');
      const id = callouts.value[0].id;
      deleteCallout(id);
      expect(callouts.value.length).toBe(0);
    });

    it('should update callout box position', () => {
      addCallout(1, { x: 0, y: 0 }, { x: 10, y: 10 }, 'blue');
      const id = callouts.value[0].id;
      updateCalloutBoxPosition(id, 200, 300);
      expect(callouts.value[0].box.x).toBe(200);
      expect(callouts.value[0].box.y).toBe(300);
      // Anchor should NOT change
      expect(callouts.value[0].anchor.x).toBe(0);
    });
  });
});
