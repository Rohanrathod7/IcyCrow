import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  stickyNotes, 
  addSticky, 
  updateStickyText, 
  deleteSticky,
  activeStickyId,
  highlights,
  strokes
} from '../../../src/workspace/store/annotation-state';

// Mock IDB store
vi.mock('../../../src/lib/idb-store', () => ({
  saveAnnotations: vi.fn(),
  getAnnotations: vi.fn()
}));

describe('Annotation State - Sticky Notes', () => {
  beforeEach(() => {
    stickyNotes.value = [];
    activeStickyId.value = null;
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
    addSticky(1, 0, 0, 'red');
    const id = stickyNotes.value[0].id;
    deleteSticky(id);
    expect(stickyNotes.value.length).toBe(0);
  });
});
