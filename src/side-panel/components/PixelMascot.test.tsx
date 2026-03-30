// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { PixelMascot } from './PixelMascot';

describe('PixelMascot Component', () => {
  it('renders idle state correctly', () => {
    const { container } = render(<PixelMascot status="idle" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('shape-rendering')).toBe('crispEdges');
    
    // Zzz and ! texts shouldn't be present
    expect(screen.queryByText('Zzz')).toBeNull();
    expect(screen.queryByText('!')).toBeNull();
  });

  it('renders thinking state with exclamation', () => {
    render(<PixelMascot status="thinking" />);
    expect(screen.getByText('!')).toBeTruthy();
  });

  it('renders saving state with Zzz', () => {
    render(<PixelMascot status="saving" />);
    expect(screen.getByText('Zzz')).toBeTruthy();
  });

  it('renders success state', () => {
    const { container } = render(<PixelMascot status="success" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
