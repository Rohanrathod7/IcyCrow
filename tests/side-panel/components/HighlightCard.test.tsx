// @vitest-environment jsdom
import { render, fireEvent } from '@testing-library/preact';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HighlightCard } from '../../../src/side-panel/components/HighlightCard';
import type { Highlight } from '../../../src/lib/types';

describe('HighlightCard', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
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
    expect(document.body.innerHTML).toContain('Important note here');
  });

  it('applies the correct color class', () => {
    const root = document.getElementById('app')!;
    render(<HighlightCard highlight={mockHighlight} />, { container: root });
    
    const marker = document.querySelector('.highlight-marker');
    expect(marker?.classList.contains('yellow')).toBe(true);
  });

  it('calls chrome.tabs.create when source button is clicked', () => {
    global.chrome = {
      tabs: {
        create: vi.fn()
      }
    } as any;

    const root = document.getElementById('app')!;
    render(<HighlightCard highlight={mockHighlight} />, { container: root });
    
    const sourceBtn = document.querySelector('.btn-source') as HTMLButtonElement;
    fireEvent.click(sourceBtn);
    
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: mockHighlight.url });
  });

  it('renders ghost warning when isGhost is true', () => {
    const root = document.getElementById('app')!;
    render(<HighlightCard highlight={mockHighlight} isGhost={true} />, { container: root });
    
    expect(document.body.innerHTML).toContain('⚠️');
    expect(document.body.innerHTML).toContain('Page content changed');
  });
});
