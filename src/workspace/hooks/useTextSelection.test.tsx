import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/preact';
import { useTextSelection } from './useTextSelection';
import { selectedPdfText, aiMenuPosition } from '../store/ai-state';

describe('useTextSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectedPdfText.value = '';
    aiMenuPosition.value = null;
    
    // Mock getSelection
    vi.stubGlobal('getSelection', vi.fn());
  });

  it('updates state when text is selected', () => {
    const mockRect = { left: 100, top: 200, width: 50, height: 20 };
    const mockSelection = {
      toString: () => 'Hyperspectral imaging',
      rangeCount: 1,
      getRangeAt: () => ({
        getBoundingClientRect: () => (mockRect)
      })
    };
    
    (window.getSelection as any).mockReturnValue(mockSelection);
    
    renderHook(() => useTextSelection());
    
    // Simulate selection change
    const event = new Event('selectionchange');
    document.dispatchEvent(event);
    
    expect(selectedPdfText.value).toBe('Hyperspectral imaging');
    // x = left + width/2 = 100 + 25 = 125
    // y = top - 40 = 200 - 40 = 160
    expect(aiMenuPosition.value).toEqual({ x: 125, y: 160 });
  });

  it('clears state when selection is empty', () => {
    selectedPdfText.value = 'old text';
    aiMenuPosition.value = { x: 50, y: 50 };
    
    const mockSelection = {
      toString: () => '',
      rangeCount: 0
    };
    
    (window.getSelection as any).mockReturnValue(mockSelection);
    
    renderHook(() => useTextSelection());
    
    const event = new Event('selectionchange');
    document.dispatchEvent(event);
    
    expect(selectedPdfText.value).toBe('');
    expect(aiMenuPosition.value).toBeNull();
  });
});
