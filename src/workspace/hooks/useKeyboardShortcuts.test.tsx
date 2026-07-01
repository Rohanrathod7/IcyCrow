import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/preact';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { activeTool } from '../store/viewer-state';

// Mock dependencies
vi.mock('../store/viewer-state', () => ({
  activeTool: { value: 'pan' },
  pdfUrl: { value: 'test.pdf' }
}));

vi.mock('../store/annotation-state', () => ({
  highlights: { value: [] },
  strokes: { value: [] },
  stickyNotes: { value: [] },
  callouts: { value: [] }
}));


describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeTool.value = 'pan';
    document.body.innerHTML = '';
  });

  it('switches tool to draw on "p" keydown', () => {
    renderHook(() => useKeyboardShortcuts());
    
    const event = new KeyboardEvent('keydown', { key: 'p' });
    window.dispatchEvent(event);
    
    expect(activeTool.value).toBe('draw');
  });

  it('switches tool to select on "v" keydown', () => {
    renderHook(() => useKeyboardShortcuts());
    
    const event = new KeyboardEvent('keydown', { key: 'v' });
    window.dispatchEvent(event);
    
    expect(activeTool.value).toBe('select');
  });

  it('ignores shortcuts when typing in an input', () => {
    renderHook(() => useKeyboardShortcuts());
    
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    
    const event = new KeyboardEvent('keydown', { key: 'p' });
    window.dispatchEvent(event);
    
    expect(activeTool.value).toBe('pan'); // Should NOT change
  });

  it('ignores shortcuts when typing in an input inside a Shadow DOM', () => {
    renderHook(() => useKeyboardShortcuts());
    
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const input = document.createElement('input');
    shadow.appendChild(input);
    input.focus();
    
    const event = new KeyboardEvent('keydown', { key: 'p' });
    window.dispatchEvent(event);
    
    expect(activeTool.value).toBe('pan'); // Should NOT change
  });

  it('triggers workspace-save event on Ctrl+S', () => {
    renderHook(() => useKeyboardShortcuts());
    
    const event = new KeyboardEvent('keydown', { 
      key: 's', 
      ctrlKey: true,
      cancelable: true 
    });
    
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    
    window.dispatchEvent(event);
    
    expect(dispatchSpy).toHaveBeenCalled();
    const hasEvent = dispatchSpy.mock.calls.some(call => 
      call[0] instanceof CustomEvent && call[0].type === 'workspace-save'
    );
    expect(hasEvent).toBe(true);
    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
