// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from 'preact';

import { NavBar } from '../../../src/side-panel/components/NavBar';
import { activeView } from '../../../src/side-panel/store';

describe('NavBar Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    activeView.value = 'home';
  });


  it('should render all 4 navigation buttons', () => {
    const root = document.getElementById('app')!;
    render(<NavBar />, root);
    
    expect(document.body.innerHTML).toContain('Home');
    expect(document.body.innerHTML).toContain('Search');
    expect(document.body.innerHTML).toContain('Spaces');
    expect(document.body.innerHTML).toContain('Settings');
  });

  it('should update activeView signal when a button is clicked', () => {
    const root = document.getElementById('app')!;
    render(<NavBar />, root);
    
    const searchBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Search');
    if (!searchBtn) throw new Error('Search button not found');
    
    searchBtn.click();
    expect(activeView.value).toBe('search');

    const spacesBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Spaces');
    if (!spacesBtn) throw new Error('Spaces button not found');
    
    spacesBtn.click();
    expect(activeView.value).toBe('spaces');

  });
});
