// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { MascotHeader } from './MascotHeader';
import { currentAppStatus } from '../store';

describe('MascotHeader Component', () => {
  beforeEach(() => {
    currentAppStatus.value = 'idle';
  });

  it('renders layout and navigation icons', () => {
    const { container } = render(<MascotHeader />);
    expect(screen.getByRole('button', { name: /close/i })).toBeTruthy();
    
    // Verify specific SaaS layout: Nav group should exist with gap-2
    const navGroup = container.querySelector('.nav-icon-group');
    expect(navGroup).toBeTruthy();
    expect(navGroup?.classList.contains('gap-2')).toBe(true);
    
    // Verify ghost button feel
    const spacesBtn = screen.getByRole('button', { name: /spaces/i });
    expect(spacesBtn.classList.contains('btn-grass-nav')).toBe(true);
  });
  
  it('renders DinoMascot with correct status', () => {
    currentAppStatus.value = 'saving';
    const { container } = render(<MascotHeader />);
    const dino = container.querySelector('.dino-view');
    expect(dino).toBeTruthy();
    expect(dino?.getAttribute('aria-label')).toContain('saving');
  });
});
