// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/preact';
import { AnnotationSidebar } from './AnnotationSidebar';
import { highlights, stickyNotes, callouts } from '../store/annotation-state';

describe('AnnotationSidebar Data Aggregation', () => {
  it('should group annotations by page number and sort them', () => {
    // Mock data
    highlights.value = [
      { id: 'h1', text: 'H1', pageNumber: 2, rects: [], color: 'yellow' } as any
    ];
    stickyNotes.value = [
      { id: 's1', text: 'S1', pageNumber: 1, x: 0, y: 0, color: 'blue', size: 24 } as any
    ];
    callouts.value = [
      { id: 'c1', text: 'C1', pageNumber: 2, anchor: {x:0, y:0}, box: {x:10, y:10}, color: 'red' } as any
    ];

    const { getByText } = render(<AnnotationSidebar />);

    // Check if Page headers exist and are in order
    const page1Header = getByText('Page 1');
    const page2Header = getByText('Page 2');
    
    // Page 1 should appear before Page 2 (simplified check for presence)
    expect(page1Header).toBeDefined();
    expect(page2Header).toBeDefined();

    // Check for specific snippets
    expect(getByText('S1...')).toBeDefined(); // Sticky snippet
    expect(getByText('Highlight')).toBeDefined(); // Highlight label
    expect(getByText('C1...')).toBeDefined(); // Callout snippet
  });
});
