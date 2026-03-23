// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/preact';
import { ChatMessage } from '../../../src/side-panel/components/ChatMessage';
import type { UUID, ISOTimestamp } from '../../../src/lib/types';

describe('ChatMessage Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('should render plain text correctly', () => {
    const root = document.getElementById('app')!;
    render(<ChatMessage message={{ role: 'user', content: 'Hello World', timestamp: '2026-03-23T12:00:00Z' as ISOTimestamp, id: '1' as UUID, contextTabIds: [], taskId: null }} />, { container: root });
    expect(document.body.innerHTML).toContain('Hello World');
  });

  it('should render correct role labels', () => {
    const root = document.getElementById('app')!;
    const { rerender } = render(<ChatMessage message={{ role: 'user', content: 'Hi', timestamp: '2026-03-23T12:00:00Z' as ISOTimestamp, id: '1' as UUID, contextTabIds: [], taskId: null }} />, { container: root });
    expect(document.body.innerHTML).toContain('You');
    
    rerender(<ChatMessage message={{ role: 'assistant', content: 'Hello', timestamp: '2026-03-23T12:00:01Z' as ISOTimestamp, id: '2' as UUID, contextTabIds: [], taskId: 'task-1' as UUID }} />);
    expect(document.body.innerHTML).toContain('IcyCrow');
  });

  it('should render Markdown as HTML', () => {
    const root = document.getElementById('app')!;
    render(<ChatMessage message={{ role: 'assistant', content: '**Bold text** and [link](https://example.com)', timestamp: '2026-03-23T12:00:00Z' as ISOTimestamp, id: '2' as UUID, contextTabIds: [], taskId: 'task-1' as UUID }} />, { container: root });
    expect(document.body.innerHTML).toContain('<strong>Bold text</strong>');
    expect(document.body.innerHTML).toContain('<a href="https://example.com">link</a>');
  });

  it('should sanitize dangerous HTML', () => {
    const root = document.getElementById('app')!;
    render(<ChatMessage message={{ role: 'assistant', content: 'Dangerous <script>alert("XSS")</script>', timestamp: '2026-03-23T12:00:00Z' as ISOTimestamp, id: '3' as UUID, contextTabIds: [], taskId: 'task-1' as UUID }} />, { container: root });
    expect(document.body.innerHTML).not.toContain('<script>');
    expect(document.body.innerHTML).toContain('Dangerous');
  });

  it('should apply syntax highlighting to code blocks', () => {
    const root = document.getElementById('app')!;
    const code = '```javascript\nconst x = 1;\n```';
    render(<ChatMessage message={{ role: 'assistant', content: code, timestamp: '2026-03-23T12:00:00Z' as ISOTimestamp, id: '4' as UUID, contextTabIds: [], taskId: 'task-1' as UUID }} />, { container: root });
    // highlight.js adds classes like hljs-keyword
    expect(document.body.innerHTML).toContain('hljs');
  });
});
