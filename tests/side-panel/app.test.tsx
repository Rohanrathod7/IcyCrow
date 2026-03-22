// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from 'preact';
import { App } from '../../src/side-panel/App';

describe('Side Panel App Root', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  it('should render the scaffold message', () => {
    const root = document.getElementById('app')!;
    render(<App />, root);
    
    expect(document.body.innerHTML).toContain('IcyCrow Side Panel');
    expect(document.body.innerHTML).toContain('Phase 1 Scaffold Complete');
  });
});

