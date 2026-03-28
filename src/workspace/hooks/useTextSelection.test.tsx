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
    
    // Create mock DOM structure for page identification
    const mockPageDiv = document.createElement('div');
    mockPageDiv.className = 'pdf-page-container';
    mockPageDiv.setAttribute('data-testid', 'pdf-page-5');
    
    const mockTextNode = document.createTextNode('Hyperspectral imaging');
    mockPageDiv.appendChild(mockTextNode);
    document.body.appendChild(mockPageDiv);

    const mockSelection = {
      toString: () => 'Hyperspectral imaging',
      rangeCount: 1,
      getRangeAt: () => ({
        startContainer: mockTextNode,
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
    // y = top = 200 (Note: window.scrollY is 0 in test)
    expect(aiMenuPosition.value).toEqual({ x: 125, y: 200, pageNumber: 5 });
    
    // Cleanup
    document.body.removeChild(mockPageDiv);
  });

  it('clears state when selection is empty', () => {
    selectedPdfText.value = 'old text';
    aiMenuPosition.value = { x: 50, y: 50, pageNumber: 1 };
    
    const mockSelection = {
      toString: () => '',
      isCollapsed: true,
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
