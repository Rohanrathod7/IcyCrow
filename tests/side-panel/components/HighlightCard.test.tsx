// @vitest-environment jsdom
import { render, fireEvent } from '@testing-library/preact';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HighlightCard } from '../../../src/side-panel/components/HighlightCard';
import type { Highlight } from '../../../src/lib/types';

describe('HighlightCard', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    vi.clearAllMocks();
    
    // Global Mocks
    global.window.confirm = vi.fn().mockReturnValue(true);
    global.chrome = {
      runtime: { sendMessage: vi.fn().mockResolvedValue({ ok: true }) },
      tabs: { create: vi.fn() }
    } as any;
    
    global.crypto = {
      subtle: {
        digest: vi.fn().mockResolvedValue(new Uint8Array(32).buffer)
      }
    } as any;
    
    global.TextEncoder = class {
      encode(s: string) { return new Uint8Array(s.length); }
    } as any;
  });

  const mockHighlight: Highlight = {
    id: 'h1' as any,
    url: 'https://example.com',
    text: 'This is a selected snippet',
    color: 'yellow',
    note: 'Important note here',
    anchor: {} as any,
    pageMeta: { title: 'Example Page', domFingerprint: 'hash' as any },
    createdAt: new Date().toISOString() as any,
    spaceId: null
  };

  it('renders the highlight text and note', () => {
    const root = document.getElementById('app')!;
    render(<HighlightCard highlight={mockHighlight} />, { container: root });
    
    expect(document.body.innerHTML).toContain('This is a selected snippet');
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Important note here');
  });

  it('applies the correct color class', () => {
    const root = document.getElementById('app')!;
    render(<HighlightCard highlight={mockHighlight} />, { container: root });
    
    const marker = document.querySelector('.highlight-marker');
    expect(marker?.classList.contains('yellow')).toBe(true);
  });
  it('calls chrome.tabs.create when source button is clicked', () => {
    const sourceBtn = document.querySelector('.btn-source') as HTMLButtonElement;
    fireEvent.click(sourceBtn);
    
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: mockHighlight.url });
  });

  it('renders ghost warning when isGhost is true', () => {
    const root = document.getElementById('app')!;
    render(<HighlightCard highlight={mockHighlight} isGhost={true} />, { container: root });
    
    expect(document.body.innerHTML).toContain('⚠️');
    expect(document.body.innerHTML).toContain('Page changed');
  });

  it('dispatches HIGHLIGHT_DELETE when delete button is clicked', async () => {
    const root = document.getElementById('app')!;
    render(<HighlightCard highlight={mockHighlight} />, { container: root });
    
    const deleteBtn = document.querySelector('.btn-delete') as HTMLButtonElement;
    fireEvent.click(deleteBtn);
    
    await vi.waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        type: 'HIGHLIGHT_DELETE',
        payload: expect.objectContaining({
          highlightId: mockHighlight.id
        })
      }));
    }, { timeout: 1000 });
  });

  it('dispatches HIGHLIGHT_UPDATE when note is changed', async () => {
    const root = document.getElementById('app')!;
    render(<HighlightCard highlight={mockHighlight} />, { container: root });
    
    const noteArea = document.querySelector('textarea') as HTMLTextAreaElement;
    fireEvent.input(noteArea, { target: { value: 'Updated Note' } });
    fireEvent.blur(noteArea);
    
    await vi.waitFor(() => {
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        type: 'HIGHLIGHT_UPDATE',
        payload: expect.objectContaining({
          updates: { note: 'Updated Note' }
        })
      }));
    }, { timeout: 1000 });
  });
});
