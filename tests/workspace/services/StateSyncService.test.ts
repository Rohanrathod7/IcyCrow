// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportWorkspace, validateWorkspaceFile, commitWorkspaceToStore } from '../../../src/workspace/services/StateSyncService';
import * as annotationState from '../../../src/workspace/store/annotation-state';

// Mock the IDB store and signals
vi.mock('../../../src/workspace/store/annotation-state', () => ({
  highlights: { value: [] },
  strokes: { value: [] },
  stickyNotes: { value: [] },
  callouts: { value: [] },
  persistAnnotations: vi.fn()
}));

describe('StateSyncService Hardening', () => {
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

  it('exportWorkspace includes metadata', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const createSpy = vi.spyOn(document, 'createElement');
    
    await exportWorkspace('https://test.com/doc.pdf', 5, 'doc.pdf');
    
    expect(createSpy).toHaveBeenCalledWith('a');
    expect(clickSpy).toHaveBeenCalled();
  });

  it('validateWorkspaceFile passes for valid schema', async () => {
    const mockPayload = {
      version: '1.0',
      documentUrl: 'https://test.com/doc.pdf',
      pageCount: 5,
      highlights: [],
      strokes: [],
      stickyNotes: [],
      callouts: [],
      exportedAt: new Date().toISOString()
    };
    
    const mockFile = new File([JSON.stringify(mockPayload)], 'workspace.json', { type: 'application/json' });
    const validated = await validateWorkspaceFile(mockFile);
    
    expect(validated.version).toBe('1.0');
    expect(validated.documentUrl).toBe('https://test.com/doc.pdf');
  });

  it('validateWorkspaceFile fails for invalid schema', async () => {
    const invalidPayload = { version: '1.0' }; // Missing arrays
    
    const mockFile = new File([JSON.stringify(invalidPayload)], 'workspace.json', { type: 'application/json' });
    
    await expect(validateWorkspaceFile(mockFile)).rejects.toThrow("Invalid workspace file format.");
  });

  it('commitWorkspaceToStore updates signals', async () => {
    const data = {
      version: '1.0',
      highlights: [{ id: 'h1' }],
      strokes: [],
      stickyNotes: [],
      callouts: [],
      exportedAt: new Date().toISOString()
    } as any;
    
    await commitWorkspaceToStore(data, 'https://test.com/doc.pdf');
    
    expect(annotationState.highlights.value).toEqual(data.highlights);
    expect(annotationState.persistAnnotations).toHaveBeenCalledWith('https://test.com/doc.pdf');
  });
});
