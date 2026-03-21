// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { wrapRange } from '../../src/content/highlighter';

describe('Highlighter: Wrapping', () => {
  it('wraps a single text node in a <mark> element', () => {
    document.body.innerHTML = '<p id="p">Hello World</p>';
    const p = document.getElementById('p')!;
    const range = document.createRange();
    range.setStart(p.firstChild!, 6);
    range.setEnd(p.firstChild!, 11);
    
    wrapRange(range, 'test-id', 'yellow');
    
    const mark = p.querySelector('mark');
    expect(mark).not.toBeNull();
    expect(mark?.textContent).toBe('World');
    expect(mark?.classList.contains('icycrow-highlight')).toBe(true);
    expect(mark?.dataset.color).toBe('yellow');
  });

  it('wraps cross-element selections by splitting fragments', () => {
    document.body.innerHTML = '<div><p id="p1">Part A</p><ul><li id="l1">Part B</li></ul></div>';
    const p1 = document.getElementById('p1')!;
    const l1 = document.getElementById('l1')!;
    
    const range = document.createRange();
    range.setStart(p1.firstChild!, 5); // 'A'
    range.setEnd(l1.firstChild!, 4);   // 'Part'
    
    wrapRange(range, 'group-1', 'blue');
    
    const marks = document.querySelectorAll('mark.icycrow-highlight');
    expect(marks.length).toBeGreaterThanOrEqual(2);
    expect((marks[0] as HTMLElement).getAttribute('data-id')).toBe('group-1');
    expect((marks[marks.length - 1] as HTMLElement).getAttribute('data-id')).toBe('group-1');
    
    expect(p1.innerHTML).toContain('<mark');
    expect(l1.innerHTML).toContain('<mark');
  });
});
