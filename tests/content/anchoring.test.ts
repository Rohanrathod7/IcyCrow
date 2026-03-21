// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { captureAnchor, restoreAnchor } from '../../src/content/anchoring';

describe('Anchoring Core: Capture', () => {
  it('captures a simple text selection', () => {
    document.body.innerHTML = '<div><p id="test-p">Hello World</p></div>';
    const p = document.getElementById('test-p')!;
    const textNode = p.firstChild as Text;
    
    const range = document.createRange();
    range.setStart(textNode, 6); // 'W'
    range.setEnd(textNode, 11); // after 'd'
    
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    
    const anchor = captureAnchor(selection);
    
    expect(anchor).toBeDefined();
    expect(anchor?.exact).toBe('World');
    expect(anchor?.prefix).toContain('Hello ');
    expect(anchor?.cssFallback).toBe('#test-p');
  });

  it('computes XPath fallback correctly', () => {
    document.body.innerHTML = '<section><div><p>Target</p></div></section>';
    const p = document.querySelector('p')!;
    const range = document.createRange();
    range.selectNodeContents(p);
    
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    
    const anchor = captureAnchor(selection);
    expect(anchor?.xpathFallback).toBe('/html[1]/body[1]/section[1]/div[1]/p[1]');
  });
});

describe('Anchoring Core: Restore', () => {
  it('restores anchor via exact text match (Strategy 1)', () => {
    document.body.innerHTML = '<div><p>The quick brown fox</p></div>';
    const anchor: any = {
      type: 'TextQuoteSelector',
      exact: 'brown fox',
      prefix: 'quick ',
      suffix: '',
      xpathFallback: '',
      cssFallback: '',
      startOffset: 0,
       endOffset: 0
    };
    
    const range = restoreAnchor(anchor);
    expect(range).not.toBeNull();
    expect(range?.toString()).toBe('brown fox');
  });

  it('restores via XPath fallback when text is slightly different (Strategy 2)', () => {
    document.body.innerHTML = '<div><p id="target">Mismatch Text</p></div>';
    const anchor: any = {
      type: 'TextQuoteSelector',
      exact: 'Original Text',
      prefix: '',
      suffix: '',
      xpathFallback: '/html[1]/body[1]/div[1]/p[1]',
      cssFallback: '',
      startOffset: 0,
      endOffset: 0
    };
    
    const range = restoreAnchor(anchor);
    expect(range).not.toBeNull();
    expect((range?.startContainer as HTMLElement).id).toBe('target');
  });

  it('restores via Fuzzy match when text has typos (Strategy 4)', () => {
    document.body.innerHTML = '<div><p>The quick brwn fox</p></div>'; // Typo: 'brwn'
    const anchor: any = {
      type: 'TextQuoteSelector',
      exact: 'brown fox',
      prefix: 'quick ',
      suffix: '',
      xpathFallback: '/invalid/path',
      cssFallback: '#invalid',
      startOffset: 0,
      endOffset: 0
    };
    
    const range = restoreAnchor(anchor);
    expect(range).not.toBeNull();
    expect(range?.toString()).toBe('brwn fox');
  });
});
