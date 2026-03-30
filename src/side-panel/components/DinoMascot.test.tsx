// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/preact';
import { DinoMascot } from './DinoMascot';

describe('DinoMascot Component', () => {
  it('renders with dino-dance class for idle status', () => {
    const { container } = render(<DinoMascot status="idle" />);
    const dino = container.querySelector('.dino-view');
    expect(dino?.classList.contains('dino-dance')).toBe(true);
  });

  it('renders without dino-dance class for saving status', () => {
    const { container } = render(<DinoMascot status="saving" />);
    const dino = container.querySelector('.dino-view');
    expect(dino?.classList.contains('dino-dance')).toBe(false);
  });

  it('renders with thinking class and bubble for thinking status', () => {
    const { container } = render(<DinoMascot status="thinking" />);
    const dino = container.querySelector('.dino-view');
    expect(dino?.classList.contains('thinking')).toBe(true);
    
    const bubble = container.querySelector('.thinking-bubble');
    expect(bubble).toBeTruthy();
    expect(bubble?.getAttribute('src')).toContain('text_bubble.png');
  });
});
