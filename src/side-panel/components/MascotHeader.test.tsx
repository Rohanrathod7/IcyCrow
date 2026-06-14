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
    
    // Verify specific SaaS layout: Nav group should exist
    const navGroup = container.querySelector('.header-icon-group');
    expect(navGroup).toBeTruthy();
    
    // Verify header icon button class
    const spacesBtn = screen.getByRole('button', { name: /spaces/i });
    expect(spacesBtn.classList.contains('btn-header-icon')).toBe(true);
  });
  
  it('renders DinoMascot with correct status', () => {
    currentAppStatus.value = 'saving';
    const { container } = render(<MascotHeader />);
    const dino = container.querySelector('.dino-view');
    expect(dino).toBeTruthy();
    expect(dino?.getAttribute('aria-label')).toContain('saving');
  });
});
