// @vitest-environment jsdom
import { render } from '@testing-library/preact';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HighlightsPanel } from '../../../src/side-panel/components/HighlightsPanel';
import { allHighlights } from '../../../src/side-panel/store';

describe('HighlightsPanel', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    allHighlights.value = [];
  });

  it('renders empty state when no highlights exist', () => {
    const root = document.getElementById('app')!;
    render(<HighlightsPanel />, { container: root });
    expect(document.body.innerHTML).toContain('No highlights captured yet');
  });

  it('groups highlights by URL', () => {
    allHighlights.value = [
      {
        id: '1' as any,
        url: 'https://site-a.com',
        text: 'Text A',
        color: 'yellow',
        note: null,
        anchor: {} as any,
        pageMeta: { title: 'Site A', domFingerprint: 'h1' as any },
        createdAt: new Date().toISOString() as any,
        spaceId: null
      },
      {
        id: '2' as any,
        url: 'https://site-a.com',
        text: 'Text A2',
        color: 'green',
        note: null,
        anchor: {} as any,
        pageMeta: { title: 'Site A', domFingerprint: 'h1' as any },
        createdAt: new Date().toISOString() as any,
        spaceId: null
      },
      {
        id: '3' as any,
        url: 'https://site-b.com',
        text: 'Text B',
        color: 'pink',
        note: null,
        anchor: {} as any,
        pageMeta: { title: 'Site B', domFingerprint: 'h2' as any },
        createdAt: new Date().toISOString() as any,
        spaceId: null
      }
    ];

    const root = document.getElementById('app')!;
    render(<HighlightsPanel />, { container: root });
    
    expect(document.body.innerHTML).toContain('Site A');
    expect(document.body.innerHTML).toContain('Site B');
    
    // Check if grouped correctly
    const groups = document.querySelectorAll('.highlight-group');
    expect(groups.length).toBe(2);
  });
});
