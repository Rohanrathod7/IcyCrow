// @vitest-environment jsdom
import { h } from 'preact';
import { render } from '@testing-library/preact';
import { describe, it, expect } from 'vitest';
import { SpaceCard } from '../../../src/side-panel/components/SpaceCard';

describe('SpaceCard', () => {
  const mockSpace = {
    id: 's1',
    name: 'Work Space',
    color: '#ff0000',
    tabs: [
      { url: 'https://google.com', favicon: 'data:image/png;base64,123' },
      { url: 'https://github.com', favicon: 'data:image/png;base64,456' }
    ]
  };

  it('renders a favicon strip for tabs', () => {
    const root = document.createElement('div');
    render(<SpaceCard space={mockSpace as any} onRestore={() => {}} onDelete={() => {}} />, { container: root });
    
    // Check for favicon elements
    const favicons = root.querySelectorAll('.favicon-strip img');
    expect(favicons.length).toBe(2);
    expect(favicons[0].getAttribute('src')).toBe('data:image/png;base64,123');
  });
});
