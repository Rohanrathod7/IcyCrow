// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { MascotHeader } from './MascotHeader';
import { currentAppStatus } from '../store';

describe('MascotHeader Component', () => {
  beforeEach(() => {
    currentAppStatus.value = 'idle';
  });

  it('renders idle state correctly', () => {
    render(<MascotHeader />);
    const icon = screen.getByTestId('mascot-icon');
    expect(icon).toBeTruthy();
    expect(icon.className).not.toContain('animate-bounce');
    expect(icon.className).not.toContain('animate-pulse');
    expect(icon.className).toContain('text-gray-400'); // Neutral color
  });

  it('renders saving state with bounce animation', () => {
    currentAppStatus.value = 'saving';
    render(<MascotHeader />);
    const icon = screen.getByTestId('mascot-icon');
    expect(icon.className).toContain('animate-bounce');
    expect(icon.className).toContain('text-blue-500');
  });

  it('renders thinking state with pulse animation', () => {
    currentAppStatus.value = 'thinking';
    render(<MascotHeader />);
    const icon = screen.getByTestId('mascot-icon');
    expect(icon.className).toContain('animate-pulse');
    expect(icon.className).toContain('text-purple-500');
  });

  it('renders success state', () => {
    currentAppStatus.value = 'success';
    render(<MascotHeader />);
    const icon = screen.getByTestId('mascot-icon');
    expect(icon.className).toContain('text-emerald-500');
  });
});
