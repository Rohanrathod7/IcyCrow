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
    
    expect(container.querySelector('.grass-header')).toBeTruthy();
    expect(screen.getByRole('button', { name: /spaces/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /notifications/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /settings/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /close/i })).toBeTruthy();
  });
  
  it('renders DinoMascot with correct status', () => {
    currentAppStatus.value = 'saving';
    const { container } = render(<MascotHeader />);
    const dino = container.querySelector('.dino-view');
    expect(dino).toBeTruthy();
    expect(dino?.getAttribute('aria-label')).toContain('saving');
  });
});
