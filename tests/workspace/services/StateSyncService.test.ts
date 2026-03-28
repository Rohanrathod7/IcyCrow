// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportWorkspace, importWorkspace } from '../../../src/workspace/services/StateSyncService';
import * as annotationState from '../../../src/workspace/store/annotation-state';

// Mock the IDB store and signals
vi.mock('../../../src/workspace/store/annotation-state', () => ({
  highlights: { value: [] },
  strokes: { value: [] },
  stickyNotes: { value: [] },
  callouts: { value: [] },
  persistAnnotations: vi.fn()
}));

describe('StateSyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    annotationState.highlights.value = [];
    annotationState.strokes.value = [];
    annotationState.stickyNotes.value = [];
    annotationState.callouts.value = [];

    // Mock URL methods
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('exportWorkspace creates a JSON download link', async () => {
    // Fill state
    annotationState.highlights.value = [{ id: '1', pageNumber: 1, rects: [], color: 'yellow' }];
    
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const createSpy = vi.spyOn(document, 'createElement');
    
    await exportWorkspace('test.pdf');
    
    expect(createSpy).toHaveBeenCalledWith('a');
    expect(clickSpy).toHaveBeenCalled();
  });

  it('importWorkspace updates signals and persists to IDB', async () => {
    const mockPayload = {
      version: '1.0',
      highlights: [{ id: 'h1', pageNumber: 1, rects: [], color: 'red' }],
      strokes: [],
      stickyNotes: [],
      callouts: []
    };
    
    const mockFile = new File([JSON.stringify(mockPayload)], 'workspace.json', { type: 'application/json' });
    
    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    await importWorkspace(mockFile, 'test.pdf');
    
    expect(annotationState.highlights.value).toEqual(mockPayload.highlights);
    expect(annotationState.persistAnnotations).toHaveBeenCalledWith('test.pdf');
  });
});
